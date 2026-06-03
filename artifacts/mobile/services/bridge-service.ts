import { ProControllerReport, RumbleCommand } from "./joycon-protocol";

export type BridgeStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export interface BridgeStats {
  latencyMs: number;
  inputRateHz: number;
  bytesSent: number;
  packetsDropped: number;
}

export interface BridgeConfig {
  host: string;
  port: number;
  autoReconnect: boolean;
  inputRateHz: number;
  enableRumble: boolean;
}

export const DEFAULT_BRIDGE_CONFIG: BridgeConfig = {
  host: "192.168.1.100",
  port: 8765,
  autoReconnect: true,
  inputRateHz: 60,
  enableRumble: true,
};

type RumbleListener = (cmd: RumbleCommand) => void;
type StatusListener = (status: BridgeStatus) => void;

export class BridgeService {
  private ws: WebSocket | null = null;
  private config: BridgeConfig;
  private rumbleListeners: Set<RumbleListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();
  private status: BridgeStatus = "disconnected";
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private lastPingTs: number = 0;
  private stats: BridgeStats = {
    latencyMs: 0,
    inputRateHz: 0,
    bytesSent: 0,
    packetsDropped: 0,
  };
  private sentCount = 0;
  private rateWindow: number[] = [];

  constructor(config: BridgeConfig) {
    this.config = { ...config };
  }

  getStatus(): BridgeStatus {
    return this.status;
  }

  getStats(): BridgeStats {
    return { ...this.stats };
  }

  updateConfig(config: Partial<BridgeConfig>) {
    this.config = { ...this.config, ...config };
  }

  onRumble(listener: RumbleListener) {
    this.rumbleListeners.add(listener);
    return () => this.rumbleListeners.delete(listener);
  }

  onStatus(listener: StatusListener) {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  connect() {
    if (this.status === "connecting" || this.status === "connected") return;
    this.setStatus("connecting");
    const url = `ws://${this.config.host}:${this.config.port}`;
    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.setStatus("connected");
        this.startPing();
      };

      this.ws.onclose = () => {
        this.cleanup();
        this.setStatus("disconnected");
        if (this.config.autoReconnect) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = () => {
        this.cleanup();
        this.setStatus("error");
        if (this.config.autoReconnect) {
          this.scheduleReconnect();
        }
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data as string);
          if (msg.type === "rumble") {
            this.rumbleListeners.forEach((l) => l(msg as RumbleCommand));
          } else if (msg.type === "pong") {
            this.stats.latencyMs = Date.now() - this.lastPingTs;
          }
        } catch {
        }
      };
    } catch {
      this.setStatus("error");
    }
  }

  disconnect() {
    this.config.autoReconnect = false;
    this.cleanup();
    this.setStatus("disconnected");
  }

  sendReport(report: ProControllerReport) {
    if (!this.ws || this.status !== "connected") return;
    try {
      const payload = JSON.stringify(report);
      this.ws.send(payload);
      this.stats.bytesSent += payload.length;
      this.trackRate();
    } catch {
      this.stats.packetsDropped++;
    }
  }

  private trackRate() {
    const now = Date.now();
    this.rateWindow.push(now);
    const cutoff = now - 1000;
    this.rateWindow = this.rateWindow.filter((t) => t > cutoff);
    this.stats.inputRateHz = this.rateWindow.length;
  }

  private startPing() {
    this.pingTimer = setInterval(() => {
      if (this.ws && this.status === "connected") {
        this.lastPingTs = Date.now();
        try {
          this.ws.send(JSON.stringify({ type: "ping", ts: this.lastPingTs }));
        } catch {
        }
      }
    }, 2000);
  }

  private cleanup() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try { this.ws.close(); } catch {}
      this.ws = null;
    }
  }

  private scheduleReconnect() {
    this.reconnectTimer = setTimeout(() => {
      if (this.status !== "connected") {
        this.connect();
      }
    }, 3000);
  }

  private setStatus(s: BridgeStatus) {
    this.status = s;
    this.statusListeners.forEach((l) => l(s));
  }
}
