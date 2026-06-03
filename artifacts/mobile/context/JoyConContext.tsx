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
  identifyJoyCon,
} from "@/services/joycon-protocol";

interface JoyConContextValue {
  leftJoyCon: JoyConState;
  rightJoyCon: JoyConState;
  isScanning: boolean;
  scannedDevices: ScannedDevice[];
  simulationMode: boolean;
  startScan: () => void;
  stopScan: () => void;
  connectDevice: (device: ScannedDevice) => void;
  disconnectSide: (side: JoyConSide) => void;
  applyRumble: (cmd: RumbleCommand) => void;
  setSimulationMode: (enabled: boolean) => void;
}

const JoyConContext = createContext<JoyConContextValue | null>(null);

const FAKE_DEVICES: ScannedDevice[] = [
  { address: "AA:BB:CC:DD:EE:01", name: "Joy-Con (L)", rssi: -58, side: "left" },
  { address: "AA:BB:CC:DD:EE:02", name: "Joy-Con (R)", rssi: -61, side: "right" },
];

function randomStick(prev: { x: number; y: number }) {
  const ease = 0.15;
  const target = { x: (Math.random() - 0.5) * 0.6, y: (Math.random() - 0.5) * 0.6 };
  return {
    x: prev.x + (target.x - prev.x) * ease,
    y: prev.y + (target.y - prev.y) * ease,
  };
}

let simSeq = 0;

export function JoyConProvider({ children }: { children: React.ReactNode }) {
  const [leftJoyCon, setLeftJoyCon] = useState<JoyConState>(emptyJoyConState("left"));
  const [rightJoyCon, setRightJoyCon] = useState<JoyConState>(emptyJoyConState("right"));
  const [isScanning, setIsScanning] = useState(false);
  const [scannedDevices, setScannedDevices] = useState<ScannedDevice[]>([]);
  const [simulationMode, setSimulationMode] = useState(true);

  const simIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSimulation = useCallback(() => {
    simSeq++;
    const t = simSeq * 0.05;

    setLeftJoyCon((prev) => {
      if (!prev.connected) return prev;
      const newLeft = { ...prev };
      newLeft.leftStick = {
        x: Math.sin(t * 0.7) * 0.5,
        y: Math.cos(t * 0.9) * 0.5,
      };
      newLeft.leftButtons = {
        ...prev.leftButtons,
        l: (simSeq % 120) < 30,
        zl: (simSeq % 180) < 20,
        minus: (simSeq % 200) < 10,
        up: (simSeq % 90) < 15,
        down: (simSeq % 110) < 15,
        left: (simSeq % 130) < 15,
        right: (simSeq % 150) < 15,
        ls: (simSeq % 300) < 8,
      };
      newLeft.gyro = {
        x: Math.sin(t * 1.2) * 0.3,
        y: Math.cos(t * 0.8) * 0.3,
        z: Math.sin(t * 0.5) * 0.2,
      };
      return newLeft;
    });

    setRightJoyCon((prev) => {
      if (!prev.connected) return prev;
      const newRight = { ...prev };
      newRight.rightStick = {
        x: Math.sin(t * 1.1) * 0.4,
        y: Math.cos(t * 0.6) * 0.4,
      };
      newRight.rightButtons = {
        ...prev.rightButtons,
        a: (simSeq % 80) < 20,
        b: (simSeq % 100) < 15,
        x: (simSeq % 140) < 10,
        y: (simSeq % 160) < 10,
        r: (simSeq % 120) < 25,
        zr: (simSeq % 170) < 18,
        plus: (simSeq % 250) < 8,
        home: (simSeq % 400) < 5,
        rs: (simSeq % 320) < 6,
      };
      return newRight;
    });
  }, []);

  useEffect(() => {
    if (simulationMode) {
      const fakeLeft: JoyConState = {
        ...emptyJoyConState("left"),
        connected: true,
        deviceName: "Joy-Con (L) [SIM]",
        deviceAddress: "AA:BB:CC:DD:EE:01",
        batteryLevel: 82,
      };
      const fakeRight: JoyConState = {
        ...emptyJoyConState("right"),
        connected: true,
        deviceName: "Joy-Con (R) [SIM]",
        deviceAddress: "AA:BB:CC:DD:EE:02",
        batteryLevel: 76,
      };
      setLeftJoyCon(fakeLeft);
      setRightJoyCon(fakeRight);
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

    setTimeout(() => {
      setScannedDevices(FAKE_DEVICES.slice(0, 1));
    }, 800);
    setTimeout(() => {
      setScannedDevices(FAKE_DEVICES);
    }, 1600);

    scanTimerRef.current = setTimeout(() => {
      setIsScanning(false);
    }, 10000);
  }, []);

  const stopScan = useCallback(() => {
    setIsScanning(false);
    if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
  }, []);

  const connectDevice = useCallback((device: ScannedDevice) => {
    if (!device.side) return;
    const newState: JoyConState = {
      ...emptyJoyConState(device.side),
      connected: true,
      deviceName: device.name,
      deviceAddress: device.address,
      batteryLevel: 75 + Math.floor(Math.random() * 25),
    };
    if (device.side === "left") {
      setLeftJoyCon(newState);
    } else {
      setRightJoyCon(newState);
    }
  }, []);

  const disconnectSide = useCallback((side: JoyConSide) => {
    if (side === "left") setLeftJoyCon(emptyJoyConState("left"));
    else setRightJoyCon(emptyJoyConState("right"));
  }, []);

  const applyRumble = useCallback((cmd: RumbleCommand) => {
    const shouldRumbleLeft = cmd.side === "left" || cmd.side === "both";
    const shouldRumbleRight = cmd.side === "right" || cmd.side === "both";

    if (shouldRumbleLeft) {
      setLeftJoyCon((prev) => ({ ...prev, rumbling: true }));
      setTimeout(
        () => setLeftJoyCon((prev) => ({ ...prev, rumbling: false })),
        cmd.durationMs
      );
    }
    if (shouldRumbleRight) {
      setRightJoyCon((prev) => ({ ...prev, rumbling: true }));
      setTimeout(
        () => setRightJoyCon((prev) => ({ ...prev, rumbling: false })),
        cmd.durationMs
      );
    }
  }, []);

  return (
    <JoyConContext.Provider
      value={{
        leftJoyCon,
        rightJoyCon,
        isScanning,
        scannedDevices,
        simulationMode,
        startScan,
        stopScan,
        connectDevice,
        disconnectSide,
        applyRumble,
        setSimulationMode,
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
