export type JoyConSide = "left" | "right";

export interface LeftButtons {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  sl: boolean;
  sr: boolean;
  minus: boolean;
  capture: boolean;
  ls: boolean;
  l: boolean;
  zl: boolean;
}

export interface RightButtons {
  a: boolean;
  b: boolean;
  x: boolean;
  y: boolean;
  sl: boolean;
  sr: boolean;
  plus: boolean;
  home: boolean;
  rs: boolean;
  r: boolean;
  zr: boolean;
}

export interface StickPosition {
  x: number;
  y: number;
}

export interface GyroData {
  x: number;
  y: number;
  z: number;
}

export interface AccelData {
  x: number;
  y: number;
  z: number;
}

export interface JoyConState {
  side: JoyConSide;
  connected: boolean;
  deviceName: string;
  deviceAddress: string;
  batteryLevel: number;
  leftButtons: LeftButtons;
  rightButtons: RightButtons;
  leftStick: StickPosition;
  rightStick: StickPosition;
  gyro: GyroData;
  accel: AccelData;
  rumbling: boolean;
}

export interface ProControllerReport {
  type: "input";
  seq: number;
  ts: number;
  buttons: {
    a: boolean; b: boolean; x: boolean; y: boolean;
    l: boolean; r: boolean; zl: boolean; zr: boolean;
    plus: boolean; minus: boolean; home: boolean; capture: boolean;
    ls: boolean; rs: boolean;
    up: boolean; down: boolean; left: boolean; right: boolean;
  };
  leftStick: StickPosition;
  rightStick: StickPosition;
  gyro: GyroData;
  accel: AccelData;
}

export interface RumbleCommand {
  type: "rumble";
  side: "left" | "right" | "both";
  highFreq: number;
  highAmp: number;
  lowFreq: number;
  lowAmp: number;
  durationMs: number;
}

export function buildProControllerReport(
  left: JoyConState,
  right: JoyConState,
  seq: number
): ProControllerReport {
  return {
    type: "input",
    seq,
    ts: Date.now(),
    buttons: {
      a: right.rightButtons.a,
      b: right.rightButtons.b,
      x: right.rightButtons.x,
      y: right.rightButtons.y,
      l: left.leftButtons.l,
      r: right.rightButtons.r,
      zl: left.leftButtons.zl,
      zr: right.rightButtons.zr,
      plus: right.rightButtons.plus,
      minus: left.leftButtons.minus,
      home: right.rightButtons.home,
      capture: left.leftButtons.capture,
      ls: left.leftButtons.ls,
      rs: right.rightButtons.rs,
      up: left.leftButtons.up,
      down: left.leftButtons.down,
      left: left.leftButtons.left,
      right: left.leftButtons.right,
    },
    leftStick: left.leftStick,
    rightStick: right.rightStick,
    gyro: left.gyro,
    accel: left.accel,
  };
}

export const EMPTY_LEFT_BUTTONS: LeftButtons = {
  left: false, right: false, up: false, down: false,
  sl: false, sr: false, minus: false, capture: false,
  ls: false, l: false, zl: false,
};

export const EMPTY_RIGHT_BUTTONS: RightButtons = {
  a: false, b: false, x: false, y: false,
  sl: false, sr: false, plus: false, home: false,
  rs: false, r: false, zr: false,
};

export const EMPTY_STICK: StickPosition = { x: 0, y: 0 };

export function emptyJoyConState(side: JoyConSide): JoyConState {
  return {
    side,
    connected: false,
    deviceName: "",
    deviceAddress: "",
    batteryLevel: 0,
    leftButtons: { ...EMPTY_LEFT_BUTTONS },
    rightButtons: { ...EMPTY_RIGHT_BUTTONS },
    leftStick: { ...EMPTY_STICK },
    rightStick: { ...EMPTY_STICK },
    gyro: { x: 0, y: 0, z: 0 },
    accel: { x: 0, y: 0, z: 0 },
    rumbling: false,
  };
}

export interface ScannedDevice {
  address: string;
  name: string;
  rssi: number;
  side: JoyConSide | null;
}

export function identifyJoyCon(name: string): JoyConSide | null {
  const n = name.toLowerCase();
  if (n.includes("joy-con (l)") || n.includes("joycon l")) return "left";
  if (n.includes("joy-con (r)") || n.includes("joycon r")) return "right";
  return null;
}
