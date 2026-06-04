import { Platform } from "react-native";

export type InputEventSide = "left" | "right" | "unknown";

export interface JoyConButtonEvent {
  type: "button";
  deviceId: number;
  side: InputEventSide;
  button: string;
  pressed: boolean;
}

export interface JoyConAxisEvent {
  type: "axis";
  deviceId: number;
  side: InputEventSide;
  /** Left/right stick X, range −1..1 */
  x: number;
  /** Left/right stick Y, range −1..1, positive = up */
  y: number;
  /** Secondary stick X axis (AXIS_Z on some JoyCons) */
  z: number;
  /** Secondary stick Y axis (AXIS_RZ) */
  rz: number;
  /** D-pad horizontal: −1=left, 0=centre, +1=right */
  hatX: number;
  /** D-pad vertical: −1=up, 0=centre, +1=down */
  hatY: number;
}

export type JoyConInputEvent = JoyConButtonEvent | JoyConAxisEvent;

export interface ConnectedDevice {
  deviceId: number;
  name: string;
  side: InputEventSide;
}

// ─── Platform-safe module loading ────────────────────────────────────────────

let _module: {
  addInputListener: (cb: (e: JoyConInputEvent) => void) => { remove: () => void };
  getConnectedDevices: () => ConnectedDevice[];
};

if (Platform.OS === "android") {
  // Loaded at runtime so web/iOS builds don't crash on missing native module
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { EventEmitter, requireNativeModule } = require("expo-modules-core");
  const native = requireNativeModule("JoyConInput");
  const emitter = new EventEmitter(native);
  _module = {
    addInputListener: (cb) => emitter.addListener("onInput", cb),
    getConnectedDevices: () => native.getConnectedDevices() ?? [],
  };
} else {
  _module = {
    addInputListener: (_cb) => ({ remove: () => {} }),
    getConnectedDevices: () => [],
  };
}

export const addJoyConInputListener = _module.addInputListener.bind(_module);
export const getConnectedJoyConDevices = _module.getConnectedDevices.bind(_module);
