# JoyCon Bridge — Windows Client Specification

A concise technical spec for building the Windows side of the JoyCon Bridge system. The Android client (Expo/React Native) reads a paired Left + Right Nintendo Switch JoyCon over Bluetooth Classic HID, forwards unified input to this Windows client over WebSocket, and relays rumble commands back to the JoyCons.

---

## System Architecture

```
[Joy-Con L] ──BT HID──┐
                       ├──► [Android App] ──WebSocket──► [Windows Client] ──► [ViGEm Pro Controller]
[Joy-Con R] ──BT HID──┘         ▲                              │
                                 └──────── Rumble Commands ─────┘
```

- **Android** = WebSocket **client**  
- **Windows** = WebSocket **server**  
- Rumble data flows **PC → Android** (reverse of input)  
- Input reports flow **Android → PC** at up to 125 Hz

---

## WebSocket Server

| Property | Value |
|---|---|
| Default port | `8765` (user-configurable) |
| Protocol | `ws://` (plain WebSocket, no TLS) |
| Message encoding | UTF-8 JSON, one message per frame |
| Reconnection | Android auto-reconnects every 3 s on drop |

The server must accept exactly one client connection at a time (the Android device). Reject or queue additional connections.

### QR Code Pairing

Display a QR code encoding the server address so the Android app can scan it instead of typing an IP. Format:

```
joycon://192.168.1.100:8765
```

The Android scanner also accepts `ws://192.168.1.100:8765` and plain `192.168.1.100:8765`.

### ADB USB Mode (low-latency)

For a wired connection, the Android app can connect to `localhost:8765` via ADB reverse port forwarding. Run once per device connection:

```
adb reverse tcp:8765 tcp:8765
```

This routes the WebSocket over the USB cable — typical latency drops from ~5 ms (WiFi) to <1 ms.

---

## Message Protocol

All messages are JSON objects with a required `"type"` field.

### Android → PC: Input Report

Sent on every input poll cycle (target: 60 Hz, max: 125 Hz).

```jsonc
{
  "type": "input",
  "seq": 1042,            // uint32, monotonically increasing, wraps at 2^32
  "ts": 1700000000000,    // Unix timestamp ms (Date.now())
  "buttons": {
    // Face buttons (Right JoyCon)
    "a": false,
    "b": false,
    "x": false,
    "y": false,
    // Shoulder / Trigger
    "r": false,
    "zr": false,
    "l": false,
    "zl": false,
    // System
    "plus": false,        // Start equivalent
    "minus": false,       // Select equivalent
    "home": false,
    "capture": false,
    // Stick clicks
    "ls": false,          // Left stick click
    "rs": false,          // Right stick click
    // D-Pad (Left JoyCon physical buttons)
    "up": false,
    "down": false,
    "left": false,
    "right": false
  },
  "leftStick":  { "x": 0.0, "y": 0.0 },   // range [-1.0, 1.0], +Y = up
  "rightStick": { "x": 0.0, "y": 0.0 },   // range [-1.0, 1.0], +Y = up
  "gyro":  { "x": 0.0, "y": 0.0, "z": 0.0 },  // radians/sec (from Left JoyCon)
  "accel": { "x": 0.0, "y": 0.0, "z": 0.0 }   // g-force (from Left JoyCon)
}
```

**Stick axis conventions:**
- `x`: left = −1.0, right = +1.0  
- `y`: down = −1.0, up = +1.0  
- Dead-zone application is left to the Windows client.

### Android → PC: Ping

Sent every 2 s to measure latency and keep the connection alive.

```json
{ "type": "ping", "ts": 1700000000000 }
```

### PC → Android: Pong

Reply immediately on receiving a ping.

```json
{ "type": "pong" }
```

### PC → Android: Rumble Command

Send whenever the emulated Pro Controller's rumble output changes (driven by the game/OS).

```jsonc
{
  "type": "rumble",
  "side": "left",          // "left" | "right" | "both"
  "highFreq": 320.0,       // Hz, range [40.0, 1252.0]
  "highAmp":  0.8,         // range [0.0, 1.0]
  "lowFreq":  160.0,       // Hz, range [40.0, 626.0]
  "lowAmp":   0.6,         // range [0.0, 1.0]
  "durationMs": 250        // positive integer, ms
}
```

The Android app translates these parameters into the JoyCon's HD Rumble (4-band) HID output report and forwards them over Bluetooth to the appropriate JoyCon.

**Silence rumble** by sending `highAmp: 0, lowAmp: 0`.

---

## Pro Controller Emulation

Use **ViGEm Bus Driver** (open-source) with **ViGEmClient** to create an Xbox 360 or DS4 gamepad. ViGEm is the standard method for virtual gamepad creation on Windows without kernel signing.

**Recommended libraries:**
- [ViGEm.NET](https://github.com/ViGEm/ViGEm.NET) — official C# bindings
- [ViGEmBus](https://github.com/ViGEm/ViGEmBus) — kernel driver (user installs once)

**Button mapping (input report → ViGEm Xbox360):**

| Input report field | ViGEm Xbox 360 button |
|---|---|
| `a` | A |
| `b` | B |
| `x` | X |
| `y` | Y |
| `l` | LeftShoulder |
| `r` | RightShoulder |
| `zl` | LeftTrigger (axis, 0–255) |
| `zr` | RightTrigger (axis, 0–255) |
| `plus` | Start |
| `minus` | Back |
| `home` | Guide |
| `ls` | LeftThumb |
| `rs` | RightThumb |
| `up/down/left/right` | DPad |
| `leftStick.x/y` | LeftThumbX/Y (−32768–32767) |
| `rightStick.x/y` | RightThumbX/Y (−32768–32767) |

Stick float-to-short conversion: `short(value × 32767)`.  
Trigger float-to-byte: `byte(zl_pressed ? 255 : 0)` or analog if available.

**Rumble output:** Subscribe to ViGEm's `FeedbackReceived` event. Extract `LargeMotor` and `SmallMotor` bytes (0–255) and convert to the JoyCon rumble format:

```csharp
// Example mapping (Xbox360 → JoyCon rumble parameters)
float highAmp = e.SmallMotor / 255f;
float lowAmp  = e.LargeMotor / 255f;
float highFreq = 320f;   // fixed mid frequency
float lowFreq  = 160f;
int durationMs = 50;     // send in 50 ms chunks while motor is active
```

---

## Recommended Windows Tech Stack

| Layer | Recommendation |
|---|---|
| Language | C# (.NET 8) or C++ |
| WebSocket server | `System.Net.WebSockets.HttpListener` or [Fleck](https://github.com/statianzo/Fleck) |
| Gamepad emulation | ViGEm.NET + ViGEmBus driver |
| QR code generation | [QRCoder](https://github.com/codebude/QRCoder) |
| System tray UI | WinForms NotifyIcon or WPF |

Minimum viable server loop (pseudocode):

```csharp
var server = new WebSocketServer("ws://0.0.0.0:8765");
var controller = new Xbox360Controller(vigemClient);
controller.Connect();

server.OnMessage = (msg) => {
    var report = JsonDeserialize<InputReport>(msg);
    UpdateViGEmController(controller, report);
};

controller.FeedbackReceived += (_, e) => {
    var rumble = BuildRumbleCommand(e);
    server.SendToClient(JsonSerialize(rumble));
};
```

---

## Connection Lifecycle

```
PC starts WS server
  └─► PC shows QR code (joycon://IP:PORT)
       └─► Android scans QR / user types IP
            └─► Android connects WS
                 ├─► Android sends input reports @ 60 Hz
                 ├─► PC drives ViGEm controller
                 ├─► Game requests rumble → PC sends rumble JSON → Android → JoyCons
                 └─► On disconnect: PC parks ViGEm controller (zero all inputs)
                      └─► Android auto-reconnects after 3 s
```

**On disconnect:** Zero all ViGEm inputs immediately. Do not release the virtual controller — keep it connected so the OS doesn't reassign XInput slots.

---

## Error Handling

| Condition | Expected behavior |
|---|---|
| Android disconnects | Zero inputs, wait for reconnect |
| `seq` gap > 5 | Log dropped packets, continue normally |
| Malformed JSON | Discard silently, do not crash |
| Rumble send fails | Retry once; if second attempt fails, drop silently |
| ViGEm not installed | Show install prompt, link to ViGEmBus releases |

---

## Sequence Numbers and Timing

- `seq` starts at 0, increments by 1 per report, wraps at 2³²−1.
- `ts` is `Date.now()` on the Android device — useful for calculating one-way latency if clocks are synced.
- The Android app targets the Hz set in Settings (default 60, max 125). Actual rate depends on BT polling + CPU load.
- The Windows client should process reports as they arrive and not buffer them. If processing takes >16 ms, drop the oldest queued report.

---

## Minimal Test Checklist

1. Server starts, QR code displays `joycon://[local-ip]:8765`
2. Android connects, input reports arrive at ~60 Hz
3. Pressing A on Joy-Con (R) triggers the A button in a game
4. Left stick move maps to left thumbstick in game
5. Game requests rumble → Android JoyCon vibrates
6. Unplug USB / disconnect WiFi → Android reconnects within 5 s, game resumes
