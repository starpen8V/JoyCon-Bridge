import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useBridge } from "@/context/BridgeContext";
import { useJoyCon } from "@/context/JoyConContext";
import { useColors } from "@/hooks/useColors";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { config, updateConfig } = useBridge();
  const { simulationMode, setSimulationMode } = useJoyCon();

  const [host, setHost] = useState(config.host);
  const [port, setPort] = useState(String(config.port));

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0) + 12;
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 0) + 24;

  const saveHostPort = () => {
    const p = parseInt(port, 10);
    if (host.trim() && !isNaN(p) && p > 0 && p < 65536) {
      updateConfig({ host: host.trim(), port: p });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={{ paddingTop: topPad, paddingBottom: botPad }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={16}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>Settings</Text>
        </View>

        <SectionHeader label="BRIDGE CONNECTION" colors={colors} />
        <View style={[styles.section, { borderColor: colors.border }]}>
          <SettingRow label="PC IP Address" colors={colors}>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
              value={host}
              onChangeText={setHost}
              onBlur={saveHostPort}
              placeholder="192.168.1.100"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="default"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </SettingRow>
          <Separator colors={colors} />
          <SettingRow label="Port" colors={colors}>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
              value={port}
              onChangeText={setPort}
              onBlur={saveHostPort}
              placeholder="8765"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="number-pad"
            />
          </SettingRow>
          <Separator colors={colors} />
          <SettingRow label="Auto-reconnect" colors={colors}>
            <Switch
              value={config.autoReconnect}
              onValueChange={(v) => {
                updateConfig({ autoReconnect: v });
                Haptics.selectionAsync().catch(() => {});
              }}
              thumbColor={config.autoReconnect ? colors.primary : colors.mutedForeground}
              trackColor={{ false: colors.border, true: colors.primary + "66" }}
            />
          </SettingRow>
          <Separator colors={colors} />
          <SettingRow label="Enable rumble" colors={colors}>
            <Switch
              value={config.enableRumble}
              onValueChange={(v) => {
                updateConfig({ enableRumble: v });
                Haptics.selectionAsync().catch(() => {});
              }}
              thumbColor={config.enableRumble ? colors.primary : colors.mutedForeground}
              trackColor={{ false: colors.border, true: colors.primary + "66" }}
            />
          </SettingRow>
        </View>

        <SectionHeader label="INPUT" colors={colors} />
        <View style={[styles.section, { borderColor: colors.border }]}>
          <SettingRow label="Input rate" colors={colors} hint="Target Hz for forwarding">
            <View style={styles.rateButtons}>
              {[30, 60, 125].map((hz) => (
                <Pressable
                  key={hz}
                  onPress={() => {
                    updateConfig({ inputRateHz: hz });
                    Haptics.selectionAsync().catch(() => {});
                  }}
                  style={({ pressed }) => [
                    styles.rateBtn,
                    {
                      backgroundColor:
                        config.inputRateHz === hz
                          ? colors.primary + "22"
                          : colors.muted,
                      borderColor:
                        config.inputRateHz === hz ? colors.primary : colors.border,
                      opacity: pressed ? 0.6 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.rateBtnText,
                      {
                        color:
                          config.inputRateHz === hz
                            ? colors.primary
                            : colors.mutedForeground,
                      },
                    ]}
                  >
                    {hz}Hz
                  </Text>
                </Pressable>
              ))}
            </View>
          </SettingRow>
        </View>

        <SectionHeader label="DEVELOPER" colors={colors} />
        <View style={[styles.section, { borderColor: colors.border }]}>
          <SettingRow
            label="Simulation mode"
            colors={colors}
            hint="Fake JoyCon input for testing UI"
          >
            <Switch
              value={simulationMode}
              onValueChange={(v) => {
                setSimulationMode(v);
                Haptics.selectionAsync().catch(() => {});
              }}
              thumbColor={simulationMode ? "#f5a623" : colors.mutedForeground}
              trackColor={{ false: colors.border, true: "#f5a62366" }}
            />
          </SettingRow>
        </View>

        <SectionHeader label="ABOUT" colors={colors} />
        <View style={[styles.section, { borderColor: colors.border }]}>
          <View style={styles.aboutRow}>
            <Text style={[styles.aboutLabel, { color: colors.mutedForeground }]}>Version</Text>
            <Text style={[styles.aboutValue, { color: colors.foreground }]}>1.0.0</Text>
          </View>
          <Separator colors={colors} />
          <View style={styles.aboutRow}>
            <Text style={[styles.aboutLabel, { color: colors.mutedForeground }]}>Protocol</Text>
            <Text style={[styles.aboutValue, { color: colors.foreground }]}>WebSocket · JSON</Text>
          </View>
          <Separator colors={colors} />
          <View style={styles.aboutRow}>
            <Text style={[styles.aboutLabel, { color: colors.mutedForeground }]}>BT Note</Text>
            <Text style={[styles.aboutNote, { color: colors.mutedForeground }]}>
              Real JoyCon BT requires a native dev build. Expo Go uses simulation mode.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function SectionHeader({ label, colors }: { label: string; colors: ReturnType<typeof useColors> }) {
  return (
    <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>
      {label}
    </Text>
  );
}

function Separator({ colors }: { colors: ReturnType<typeof useColors> }) {
  return <View style={[styles.separator, { backgroundColor: colors.border }]} />;
}

function SettingRow({
  label,
  hint,
  children,
  colors,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingLabelBlock}>
        <Text style={[styles.settingLabel, { color: colors.foreground }]}>{label}</Text>
        {hint && (
          <Text style={[styles.settingHint, { color: colors.mutedForeground }]}>{hint}</Text>
        )}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  sectionHeader: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
  },
  section: {
    marginHorizontal: 16,
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  settingLabelBlock: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  settingHint: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    minWidth: 120,
    textAlign: "right",
  },
  rateButtons: {
    flexDirection: "row",
    gap: 6,
  },
  rateBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  rateBtnText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  aboutRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  aboutLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  aboutValue: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  aboutNote: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    flex: 1,
    textAlign: "right",
    lineHeight: 17,
  },
});
