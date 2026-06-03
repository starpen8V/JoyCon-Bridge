import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

interface Step {
  n: number;
  title: string;
  body: string;
  commands?: string[];
  note?: string;
  icon: string;
}

const SECTIONS: { title: string; steps: Step[] }[] = [
  {
    title: "Prerequisites",
    steps: [
      {
        n: 1,
        icon: "nodejs",
        title: "Install Node.js & pnpm",
        body: "Install Node.js 20+ and the pnpm package manager.",
        commands: [
          "npm install -g pnpm",
        ],
      },
      {
        n: 2,
        icon: "android-studio",
        title: "Install Android Studio",
        body: "Download Android Studio and install the Android SDK. Enable USB debugging on your Android device in Settings → Developer options.",
        note: "Set ANDROID_HOME to your SDK path.",
      },
      {
        n: 3,
        icon: "console",
        title: "Install Expo CLI",
        body: "Install the Expo CLI globally.",
        commands: ["npm install -g expo-cli"],
      },
    ],
  },
  {
    title: "Build the App",
    steps: [
      {
        n: 4,
        icon: "package-variant-closed",
        title: "Install dependencies",
        body: "From the project root, install all workspace dependencies.",
        commands: ["pnpm install"],
      },
      {
        n: 5,
        icon: "play-circle-outline",
        title: "Run on Android (dev build)",
        body: "Connect your Android device via USB (with USB debugging enabled), then build and install the dev client. This is required for real Bluetooth access.",
        commands: [
          "cd artifacts/mobile",
          "npx expo run:android",
        ],
        note: "Expo Go cannot use Bluetooth Classic (required for JoyCons). A dev build is mandatory for real hardware.",
      },
      {
        n: 6,
        icon: "cellphone-link",
        title: "Pair your JoyCons",
        body: "Once the app is installed:\n1. Turn off simulation mode in Settings.\n2. Tap the L or R card → Scan for new device.\n3. Hold the sync button on each JoyCon until it enters pairing mode.",
        note: "JoyCons use Bluetooth Classic (HID profile), not BLE. They appear as Joy-Con (L) and Joy-Con (R).",
      },
    ],
  },
  {
    title: "USB Bridge (ADB Mode)",
    steps: [
      {
        n: 7,
        icon: "usb",
        title: "Enable ADB reverse port forwarding",
        body: "With your Android device connected via USB, run this on your Windows PC. It forwards the app's WebSocket through the USB cable — much lower latency than WiFi.",
        commands: ["adb reverse tcp:8765 tcp:8765"],
        note: "ADB must be installed. It ships with Android Studio's platform-tools.",
      },
      {
        n: 8,
        icon: "lan",
        title: "Start the Windows client",
        body: "Run the Windows side of JoyCon Bridge. It will listen on port 8765 for the Android app's connection.",
        commands: ["JoyConBridge.exe --port 8765"],
        note: "The Windows client emulates an NS Pro Controller via ViGEm/HidHide.",
      },
      {
        n: 9,
        icon: "usb-flash-drive",
        title: "Connect via ADB mode",
        body: "In the app, enable USB (ADB) mode in the Bridge panel or Settings. The app will connect to localhost:8765, which ADB forwards over USB to the PC.",
      },
    ],
  },
  {
    title: "WiFi Bridge",
    steps: [
      {
        n: 10,
        icon: "wifi",
        title: "Connect over local network",
        body: "As an alternative to USB, scan the QR code shown by the Windows client. Both devices must be on the same Wi-Fi network.",
        note: "Tap the QR icon in the Bridge panel to open the scanner.",
      },
    ],
  },
  {
    title: "Production Build (APK)",
    steps: [
      {
        n: 11,
        icon: "package-variant",
        title: "Build a release APK",
        body: "Generate a signed release APK directly without EAS Build.",
        commands: [
          "cd artifacts/mobile",
          "npx expo run:android --variant release",
        ],
        note: "Or use EAS Build for a cloud build: eas build -p android --profile production",
      },
      {
        n: 12,
        icon: "shield-check-outline",
        title: "Required permissions",
        body: "Ensure these are in your AndroidManifest.xml (added automatically by expo-camera and the Bluetooth plugin):",
        commands: [
          "BLUETOOTH",
          "BLUETOOTH_ADMIN",
          "BLUETOOTH_CONNECT",
          "BLUETOOTH_SCAN",
          "CAMERA",
        ],
      },
    ],
  },
];

export default function BuildInstructionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0) + 12;
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 0) + 24;

  const copyCommand = async (cmd: string) => {
    await Clipboard.setStringAsync(cmd).catch(() => {});
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 1800);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={{ paddingTop: topPad, paddingBottom: botPad }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={16}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.foreground} />
          </Pressable>
          <View style={styles.titleBlock}>
            <Text style={[styles.title, { color: colors.foreground }]}>Build Guide</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              From Expo Go → real hardware
            </Text>
          </View>
        </View>

        <View style={[styles.banner, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "44" }]}>
          <MaterialCommunityIcons name="information" size={18} color={colors.primary} />
          <Text style={[styles.bannerText, { color: colors.foreground }]}>
            JoyCons use{" "}
            <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>
              Bluetooth Classic HID
            </Text>
            , which requires a native dev build. Expo Go only supports simulation mode.
          </Text>
        </View>

        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
              {section.title.toUpperCase()}
            </Text>
            {section.steps.map((step, idx) => (
              <View
                key={step.n}
                style={[
                  styles.stepCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    marginBottom: idx < section.steps.length - 1 ? 10 : 0,
                  },
                ]}
              >
                <View style={styles.stepHeader}>
                  <View style={[styles.stepNumber, { backgroundColor: colors.primary + "22" }]}>
                    <Text style={[styles.stepNumberText, { color: colors.primary }]}>
                      {step.n}
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name={step.icon as any}
                    size={18}
                    color={colors.mutedForeground}
                  />
                  <Text style={[styles.stepTitle, { color: colors.foreground }]}>
                    {step.title}
                  </Text>
                </View>

                <Text style={[styles.stepBody, { color: colors.mutedForeground }]}>
                  {step.body}
                </Text>

                {step.commands && step.commands.map((cmd) => (
                  <Pressable
                    key={cmd}
                    onPress={() => copyCommand(cmd)}
                    style={({ pressed }) => [
                      styles.codeBlock,
                      {
                        backgroundColor: colors.muted,
                        borderColor: copiedCmd === cmd ? colors.success : colors.border,
                        opacity: pressed ? 0.75 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.codeText, { color: colors.foreground }]} selectable>
                      {cmd}
                    </Text>
                    <MaterialCommunityIcons
                      name={copiedCmd === cmd ? "check" : "content-copy"}
                      size={14}
                      color={copiedCmd === cmd ? colors.success : colors.mutedForeground}
                    />
                  </Pressable>
                ))}

                {step.note && (
                  <View style={[styles.noteRow, { backgroundColor: "#f5a62312", borderColor: "#f5a62333" }]}>
                    <MaterialCommunityIcons name="lightbulb-outline" size={14} color="#f5a623" />
                    <Text style={[styles.noteText, { color: "#f5a623" }]}>{step.note}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  titleBlock: { flex: 1 },
  title: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  bannerText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  stepCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  stepTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  stepBody: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  codeBlock: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  codeText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    flex: 1,
    letterSpacing: 0.3,
  },
  noteRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
});
