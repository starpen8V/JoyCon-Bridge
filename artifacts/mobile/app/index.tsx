import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
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

import { BridgePanel } from "@/components/BridgePanel";
import { JoyConCard } from "@/components/JoyConCard";
import { RumbleLog } from "@/components/RumbleLog";
import { RumbleTestPanel } from "@/components/RumbleTestPanel";
import { useBridge } from "@/context/BridgeContext";
import { useJoyCon } from "@/context/JoyConContext";
import { useColors } from "@/hooks/useColors";
import { useInputForwarder } from "@/hooks/useInputForwarder";

let inputSeq = 0;
const INPUT_INTERVAL_MS = 16;

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { leftJoyCon, rightJoyCon, simulationMode, setSimulationMode } = useJoyCon();
  const { status, connect, disconnect } = useBridge();

  const bridgeConnected = status === "connected";
  const bothConnected = leftJoyCon.connected && rightJoyCon.connected;

  // Forward JoyCon input to PC bridge at ~60 Hz when connected
  useInputForwarder();

  return (
    <View
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop:
              insets.top +
              (Platform.OS === "web" ? 67 : 0) +
              12,
            paddingBottom:
              insets.bottom +
              (Platform.OS === "web" ? 34 : 0) +
              24,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <View style={styles.titleRow}>
            <MaterialCommunityIcons
              name="gamepad-variant"
              size={22}
              color={colors.primary}
            />
            <Text style={[styles.appTitle, { color: colors.foreground }]}>
              JoyCon Bridge
            </Text>
          </View>
          <View style={styles.topActions}>
            {simulationMode && (
              <View style={[styles.simBadge, { backgroundColor: "#f5a62322", borderColor: "#f5a62355" }]}>
                <Text style={styles.simBadgeText}>SIM</Text>
              </View>
            )}
            <Pressable
              onPress={() => {
                setSimulationMode(!simulationMode);
                Haptics.selectionAsync().catch(() => {});
              }}
              hitSlop={12}
              style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.5 : 1 }]}
            >
              <MaterialCommunityIcons
                name={simulationMode ? "robot-outline" : "bluetooth"}
                size={22}
                color={simulationMode ? "#f5a623" : colors.mutedForeground}
              />
            </Pressable>
            <Pressable
              onPress={() => {
                router.push("/settings");
                Haptics.selectionAsync().catch(() => {});
              }}
              hitSlop={12}
              style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.5 : 1 }]}
            >
              <MaterialCommunityIcons
                name="tune-variant"
                size={22}
                color={colors.mutedForeground}
              />
            </Pressable>
          </View>
        </View>

        <View style={styles.sectionLabel}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            CONTROLLERS
          </Text>
        </View>
        <View style={styles.joyconRow}>
          <JoyConCard side="left" />
          <JoyConCard side="right" />
        </View>

        <View style={[styles.sectionLabel, { marginTop: 20 }]}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            PC BRIDGE
          </Text>
        </View>
        <BridgePanel />

        <View style={[styles.sectionLabel, { marginTop: 20 }]}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            STATUS
          </Text>
        </View>
        <View style={[styles.statusGrid, { borderColor: colors.border }]}>
          <StatusItem
            label="Left JoyCon"
            active={leftJoyCon.connected}
            colors={colors}
          />
          <Divider colors={colors} />
          <StatusItem
            label="Right JoyCon"
            active={rightJoyCon.connected}
            colors={colors}
          />
          <Divider colors={colors} />
          <StatusItem
            label="PC Bridge"
            active={bridgeConnected}
            colors={colors}
          />
          <Divider colors={colors} />
          <StatusItem
            label="Forwarding"
            active={bothConnected && bridgeConnected}
            colors={colors}
            highlight
          />
        </View>

        <RumbleLog />

        <View style={[styles.sectionLabel, { marginTop: 16 }]}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            RUMBLE TEST
          </Text>
        </View>
        <RumbleTestPanel />

        {simulationMode && (
          <View style={[styles.simNotice, { borderColor: "#f5a62333" }]}>
            <MaterialCommunityIcons name="information-outline" size={14} color="#f5a623" />
            <Text style={styles.simNoticeText}>
              Simulation mode — no real hardware. A native dev build is required for actual JoyCon Bluetooth + USB bridge functionality.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function StatusItem({
  label,
  active,
  colors,
  highlight,
}: {
  label: string;
  active: boolean;
  colors: ReturnType<typeof useColors>;
  highlight?: boolean;
}) {
  return (
    <View style={styles.statusItem}>
      <View
        style={[
          styles.statusIndicator,
          { backgroundColor: active ? colors.success : colors.border },
        ]}
      />
      <Text
        style={[
          styles.statusItemText,
          {
            color: highlight
              ? active
                ? colors.success
                : colors.mutedForeground
              : colors.foreground,
            fontFamily: highlight ? "Inter_600SemiBold" : "Inter_400Regular",
          },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.statusItemValue,
          { color: active ? colors.success : colors.mutedForeground },
        ]}
      >
        {active ? "ACTIVE" : "OFFLINE"}
      </Text>
    </View>
  );
}

function Divider({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.divider, { backgroundColor: colors.border }]} />
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    gap: 0,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  appTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  topActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  simBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
  },
  simBadgeText: {
    color: "#f5a623",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
  },
  iconBtn: {},
  sectionLabel: {
    marginBottom: 8,
  },
  label: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
  },
  joyconRow: {
    flexDirection: "row",
    gap: 10,
  },
  statusGrid: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 16,
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusItemText: {
    flex: 1,
    fontSize: 13,
  },
  statusItemValue: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 14,
  },
  simNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  simNoticeText: {
    flex: 1,
    color: "#f5a623",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
  },
});
