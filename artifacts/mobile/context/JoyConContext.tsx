import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  JoyConSide,
  JoyConState,
  RumbleCommand,
  ScannedDevice,
  emptyJoyConState,
} from "@/services/joycon-protocol";

const KNOWN_DEVICES_KEY = "@joycon_known_devices";
const MAX_KNOWN = 6;

interface KnownDevices {
  left: ScannedDevice[];
  right: ScannedDevice[];
}

interface JoyConContextValue {
  leftJoyCon: JoyConState;
  rightJoyCon: JoyConState;
  isScanning: boolean;
  scannedDevices: ScannedDevice[];
  knownDevices: KnownDevices;
  simulationMode: boolean;
  startScan: () => void;
  stopScan: () => void;
  connectDevice: (device: ScannedDevice) => void;
  disconnectSide: (side: JoyConSide) => void;
  applyRumble: (cmd: RumbleCommand) => void;
  setSimulationMode: (enabled: boolean) => void;
  forgetDevice: (device: ScannedDevice) => void;
  pressButton: (side: JoyConSide, button: string) => void;
  releaseButton: (side: JoyConSide, button: string) => void;
  moveStick: (side: JoyConSide, which: "left" | "right", x: number, y: number) => void;
  releaseStick: (side: JoyConSide, which: "left" | "right") => void;
}

const JoyConContext = createContext<JoyConContextValue | null>(null);

const FAKE_DEVICES: ScannedDevice[] = [
  { address: "AA:BB:CC:DD:EE:01", name: "Joy-Con (L)", rssi: -58, side: "left" },
  { address: "AA:BB:CC:DD:EE:02", name: "Joy-Con (R)", rssi: -61, side: "right" },
];

let simSeq = 0;

export function JoyConProvider({ children }: { children: React.ReactNode }) {
  const [leftJoyCon, setLeftJoyCon] = useState<JoyConState>(emptyJoyConState("left"));
  const [rightJoyCon, setRightJoyCon] = useState<JoyConState>(emptyJoyConState("right"));
  const [isScanning, setIsScanning] = useState(false);
  const [scannedDevices, setScannedDevices] = useState<ScannedDevice[]>([]);
  const [knownDevices, setKnownDevices] = useState<KnownDevices>({ left: [], right: [] });
  const [simulationMode, setSimulationMode] = useState(true);

  const simIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Manual override refs — sim loop checks these and skips auto-update for held inputs
  const heldLeft = useRef<Set<string>>(new Set());
  const heldRight = useRef<Set<string>>(new Set());
  const manualLeftStick = useRef<{ x: number; y: number } | null>(null);
  const manualRightStick = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(KNOWN_DEVICES_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as KnownDevices;
          setKnownDevices(parsed);
        } catch {}
      }
    });
  }, []);

  const persistKnown = useCallback((next: KnownDevices) => {
    AsyncStorage.setItem(KNOWN_DEVICES_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const rememberDevice = useCallback(
    (device: ScannedDevice) => {
      if (!device.side) return;
      setKnownDevices((prev) => {
        const list = prev[device.side!];
        const filtered = list.filter((d) => d.address !== device.address);
        const next = {
          ...prev,
          [device.side!]: [device, ...filtered].slice(0, MAX_KNOWN),
        };
        persistKnown(next);
        return next;
      });
    },
    [persistKnown]
  );

  const forgetDevice = useCallback(
    (device: ScannedDevice) => {
      if (!device.side) return;
      setKnownDevices((prev) => {
        const next = {
          ...prev,
          [device.side!]: prev[device.side!].filter((d) => d.address !== device.address),
        };
        persistKnown(next);
        return next;
      });
    },
    [persistKnown]
  );

  const runSimulation = useCallback(() => {
    simSeq++;
    const t = simSeq * 0.05;
    const hl = heldLeft.current;
    const hr = heldRight.current;

    setLeftJoyCon((prev) => {
      if (!prev.connected) return prev;
      return {
        ...prev,
        leftStick: manualLeftStick.current ?? {
          x: Math.sin(t * 0.7) * 0.5,
          y: Math.cos(t * 0.9) * 0.5,
        },
        leftButtons: {
          ...prev.leftButtons,
          l:       hl.has("l")       ? prev.leftButtons.l       : (simSeq % 120) < 30,
          zl:      hl.has("zl")      ? prev.leftButtons.zl      : (simSeq % 180) < 20,
          minus:   hl.has("minus")   ? prev.leftButtons.minus   : (simSeq % 200) < 10,
          up:      hl.has("up")      ? prev.leftButtons.up      : (simSeq % 90)  < 15,
          down:    hl.has("down")    ? prev.leftButtons.down    : (simSeq % 110) < 15,
          left:    hl.has("left")    ? prev.leftButtons.left    : (simSeq % 130) < 15,
          right:   hl.has("right")   ? prev.leftButtons.right   : (simSeq % 150) < 15,
          ls:      hl.has("ls")      ? prev.leftButtons.ls      : (simSeq % 300) < 8,
          sl:      prev.leftButtons.sl,
          sr:      prev.leftButtons.sr,
          capture: hl.has("capture") ? prev.leftButtons.capture : (simSeq % 400) < 5,
        },
        gyro: {
          x: Math.sin(t * 1.2) * 0.3,
          y: Math.cos(t * 0.8) * 0.3,
          z: Math.sin(t * 0.5) * 0.2,
        },
      };
    });

    setRightJoyCon((prev) => {
      if (!prev.connected) return prev;
      return {
        ...prev,
        rightStick: manualRightStick.current ?? {
          x: Math.sin(t * 1.1) * 0.4,
          y: Math.cos(t * 0.6) * 0.4,
        },
        rightButtons: {
          ...prev.rightButtons,
          a:    hr.has("a")    ? prev.rightButtons.a    : (simSeq % 80)  < 20,
          b:    hr.has("b")    ? prev.rightButtons.b    : (simSeq % 100) < 15,
          x:    hr.has("x")   ? prev.rightButtons.x    : (simSeq % 140) < 10,
          y:    hr.has("y")   ? prev.rightButtons.y    : (simSeq % 160) < 10,
          r:    hr.has("r")    ? prev.rightButtons.r    : (simSeq % 120) < 25,
          zr:   hr.has("zr")   ? prev.rightButtons.zr   : (simSeq % 170) < 18,
          plus: hr.has("plus") ? prev.rightButtons.plus : (simSeq % 250) < 8,
          home: hr.has("home") ? prev.rightButtons.home : (simSeq % 400) < 5,
          rs:   hr.has("rs")   ? prev.rightButtons.rs   : (simSeq % 320) < 6,
          sl:   prev.rightButtons.sl,
          sr:   prev.rightButtons.sr,
        },
      };
    });
  }, []);

  useEffect(() => {
    if (simulationMode) {
      setLeftJoyCon({
        ...emptyJoyConState("left"),
        connected: true,
        deviceName: "Joy-Con (L) [SIM]",
        deviceAddress: "AA:BB:CC:DD:EE:01",
        batteryLevel: 82,
      });
      setRightJoyCon({
        ...emptyJoyConState("right"),
        connected: true,
        deviceName: "Joy-Con (R) [SIM]",
        deviceAddress: "AA:BB:CC:DD:EE:02",
        batteryLevel: 76,
      });
      simIntervalRef.current = setInterval(runSimulation, 16);
    } else {
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }
      setLeftJoyCon(emptyJoyConState("left"));
      setRightJoyCon(emptyJoyConState("right"));
    }
    return () => {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    };
  }, [simulationMode, runSimulation]);

  const startScan = useCallback(() => {
    setIsScanning(true);
    setScannedDevices([]);
    setTimeout(() => setScannedDevices(FAKE_DEVICES.slice(0, 1)), 800);
    setTimeout(() => setScannedDevices(FAKE_DEVICES), 1600);
    scanTimerRef.current = setTimeout(() => setIsScanning(false), 10000);
  }, []);

  const stopScan = useCallback(() => {
    setIsScanning(false);
    if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
  }, []);

  const connectDevice = useCallback(
    (device: ScannedDevice) => {
      if (!device.side) return;
      const newState: JoyConState = {
        ...emptyJoyConState(device.side),
        connected: true,
        deviceName: device.name,
        deviceAddress: device.address,
        batteryLevel: 75 + Math.floor(Math.random() * 25),
      };
      if (device.side === "left") setLeftJoyCon(newState);
      else setRightJoyCon(newState);
      rememberDevice(device);
    },
    [rememberDevice]
  );

  const disconnectSide = useCallback((side: JoyConSide) => {
    if (side === "left") setLeftJoyCon(emptyJoyConState("left"));
    else setRightJoyCon(emptyJoyConState("right"));
  }, []);

  const applyRumble = useCallback((cmd: RumbleCommand) => {
    const shouldRumbleLeft = cmd.side === "left" || cmd.side === "both";
    const shouldRumbleRight = cmd.side === "right" || cmd.side === "both";
    if (shouldRumbleLeft) {
      setLeftJoyCon((prev) => ({ ...prev, rumbling: true }));
      setTimeout(() => setLeftJoyCon((prev) => ({ ...prev, rumbling: false })), cmd.durationMs);
    }
    if (shouldRumbleRight) {
      setRightJoyCon((prev) => ({ ...prev, rumbling: true }));
      setTimeout(() => setRightJoyCon((prev) => ({ ...prev, rumbling: false })), cmd.durationMs);
    }
  }, []);

  const pressButton = useCallback((side: JoyConSide, button: string) => {
    if (side === "left") {
      heldLeft.current.add(button);
      setLeftJoyCon((prev) => ({
        ...prev,
        leftButtons: { ...prev.leftButtons, [button]: true },
      }));
    } else {
      heldRight.current.add(button);
      setRightJoyCon((prev) => ({
        ...prev,
        rightButtons: { ...prev.rightButtons, [button]: true },
      }));
    }
  }, []);

  const releaseButton = useCallback((side: JoyConSide, button: string) => {
    if (side === "left") {
      heldLeft.current.delete(button);
      setLeftJoyCon((prev) => ({
        ...prev,
        leftButtons: { ...prev.leftButtons, [button]: false },
      }));
    } else {
      heldRight.current.delete(button);
      setRightJoyCon((prev) => ({
        ...prev,
        rightButtons: { ...prev.rightButtons, [button]: false },
      }));
    }
  }, []);

  const moveStick = useCallback(
    (side: JoyConSide, which: "left" | "right", x: number, y: number) => {
      if (which === "left") {
        manualLeftStick.current = { x, y };
        setLeftJoyCon((prev) => ({ ...prev, leftStick: { x, y } }));
      } else {
        manualRightStick.current = { x, y };
        setRightJoyCon((prev) => ({ ...prev, rightStick: { x, y } }));
      }
    },
    []
  );

  const releaseStick = useCallback(
    (_side: JoyConSide, which: "left" | "right") => {
      if (which === "left") {
        manualLeftStick.current = null;
        setLeftJoyCon((prev) => ({ ...prev, leftStick: { x: 0, y: 0 } }));
      } else {
        manualRightStick.current = null;
        setRightJoyCon((prev) => ({ ...prev, rightStick: { x: 0, y: 0 } }));
      }
    },
    []
  );

  return (
    <JoyConContext.Provider
      value={{
        leftJoyCon,
        rightJoyCon,
        isScanning,
        scannedDevices,
        knownDevices,
        simulationMode,
        startScan,
        stopScan,
        connectDevice,
        disconnectSide,
        applyRumble,
        setSimulationMode,
        forgetDevice,
        pressButton,
        releaseButton,
        moveStick,
        releaseStick,
      }}
    >
      {children}
    </JoyConContext.Provider>
  );
}

export function useJoyCon() {
  const ctx = useContext(JoyConContext);
  if (!ctx) throw new Error("useJoyCon must be used inside JoyConProvider");
  return ctx;
}
