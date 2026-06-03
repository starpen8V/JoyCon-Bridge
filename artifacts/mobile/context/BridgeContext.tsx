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
  BridgeConfig,
  BridgeService,
  BridgeStats,
  BridgeStatus,
  DEFAULT_BRIDGE_CONFIG,
} from "@/services/bridge-service";
import { RumbleCommand } from "@/services/joycon-protocol";

const STORAGE_KEY = "@joycon_bridge_config";

interface BridgeContextValue {
  status: BridgeStatus;
  stats: BridgeStats;
  config: BridgeConfig;
  connect: () => void;
  disconnect: () => void;
  updateConfig: (c: Partial<BridgeConfig>) => void;
  onRumble: (listener: (cmd: RumbleCommand) => void) => () => void;
}

const BridgeContext = createContext<BridgeContextValue | null>(null);

export function BridgeProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<BridgeStatus>("disconnected");
  const [stats, setStats] = useState<BridgeStats>({
    latencyMs: 0,
    inputRateHz: 0,
    bytesSent: 0,
    packetsDropped: 0,
  });
  const [config, setConfig] = useState<BridgeConfig>(DEFAULT_BRIDGE_CONFIG);
  const configRef = useRef(config);
  configRef.current = config;

  const serviceRef = useRef<BridgeService | null>(null);
  const statsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const saved = JSON.parse(raw) as Partial<BridgeConfig>;
          setConfig((prev) => ({ ...prev, ...saved }));
        } catch {}
      }
    });
  }, []);

  useEffect(() => {
    const svc = new BridgeService(config);
    serviceRef.current = svc;
    const unsubStatus = svc.onStatus(setStatus);
    statsIntervalRef.current = setInterval(() => setStats(svc.getStats()), 500);
    return () => {
      unsubStatus();
      if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
      svc.disconnect();
    };
  }, [config]);

  const connect = useCallback(() => {
    serviceRef.current?.connect();
  }, []);

  const disconnect = useCallback(() => {
    serviceRef.current?.disconnect();
  }, []);

  const updateConfig = useCallback((partial: Partial<BridgeConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...partial };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const onRumble = useCallback(
    (listener: (cmd: RumbleCommand) => void) => {
      if (!serviceRef.current) return () => {};
      return serviceRef.current.onRumble(listener);
    },
    []
  );

  return (
    <BridgeContext.Provider
      value={{ status, stats, config, connect, disconnect, updateConfig, onRumble }}
    >
      {children}
    </BridgeContext.Provider>
  );
}

export function useBridge() {
  const ctx = useContext(BridgeContext);
  if (!ctx) throw new Error("useBridge must be used inside BridgeProvider");
  return ctx;
}

export { BridgeService };
export type { BridgeStatus };
