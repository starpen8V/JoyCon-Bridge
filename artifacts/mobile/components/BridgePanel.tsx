import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { useBridge } from "@/context/BridgeContext";
import { useColors } from "@/hooks/useColors";

export function BridgePanel() {
  const colors = useColors();
  const router = useRouter();
  const { status, stats, config, connect, disconnect, updateConfig } = useBridge();

  const isConnected = status === "connected";
  const isConnecting = status === "connecting";

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: isConnecting
      ? withRepeat(withTiming(0.3, { duration: 600 }), -1, true)
      : 1,
  }));

  const statusColor = {
    connected: colors.success,
    connecting: "#f5a623",
    disconnected: colors.mutedForeground,
    error: colors.destructive,
  }[status];

  const handleToggle = () => {
    Haptics.selectionAsync().catch(() => {});
    if (isConnected || isConnecting) disconnect();
    else connect();
  };

  const handleToggleAdb = () => {
    Haptics.selectionAsync().catch(() => {});
    updateConfig({ adbMode: !config.adbMode });
  };

  const handleQr = () => {
    Haptics.selectionAsync().catch(() => {});
    router.push("/qr-scan");
  };

  const formatBytes = (b: number) => {
    if (b < 1024) return `${b}B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)}KB`;
    return `${(b / 1024 / 1024).toFixed(1)}MB`;
  };

  const effectiveHost = config.adbMode ? "localhost" : config.host;

  return (
    <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.topRow}>
        <Animated.View style={[styles.statusDot, { backgroundColor: statusColor }, pulseStyle]} />
        <View style={styles.addressBlock}>
          <View style={styles.hostRow}>
            <Text style={[styles.hostText, { color: colors.foreground }]}>
              {effectiveHost}:{config.port}
            </Text>
            {config.adbMode && (
              <View style={[styles.adbBadge, { backgroundColor: colors.accent + "22", borderColor: colors.accent + "55" }]}>
                <MaterialCommunityIcons name="usb" size={10} color={colors.accent} />
                <Text style={[styles.adbBadgeText, { color: colors.accent }]}>ADB</Text>
              </View>
            )}
          </View>
          <Text style={[styles.statusLabel, { color: colors.mutedForeground }]}>
            {status === "connected"
              ? "PC Bridge active"
              : status === "connecting"
              ? "Connecting…"
              : status === "error"
              ? "Connection failed — retrying"
              : config.adbMode
              ? "USB (ADB reverse) mode"
              : "WiFi / USB Network Bridge"}
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={handleQr}
            hitSlop={10}
            style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.5 : 1 }]}
          >
            <MaterialCommunityIcons name="qrcode-scan" size={20} color={colors.mutedForeground} />
          </Pressable>

          <Pressable
            onPress={handleToggleAdb}
            hitSlop={10}
            style={({ pressed }) => [
              styles.iconBtnRound,
              {
                backgroundColor: config.adbMode ? colors.accent + "22" : "transparent",
                borderColor: config.adbMode ? colors.accent + "66" : colors.border,
                opacity: pressed ? 0.5 : 1,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="usb"
              size={17}
              color={config.adbMode ? colors.accent : colors.mutedForeground}
            />
          </Pressable>

          <Pressable
            onPress={() => { router.push("/settings"); Haptics.selectionAsync().catch(() => {}); }}
            hitSlop={10}
            style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.5 : 1 }]}
          >
            <MaterialCommunityIcons name="cog-outline" size={20} color={colors.mutedForeground} />
          </Pressable>
        </View>
      </View>

      {isConnected && (
        <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
          <StatChip icon="timer-outline" label={`${stats.latencyMs}ms`} colors={colors} />
          <StatChip icon="pulse" label={`${stats.inputRateHz}Hz`} colors={colors} />
          <StatChip icon="database-outline" label={formatBytes(stats.bytesSent)} colors={colors} />
          {stats.packetsDropped > 0 && (
            <StatChip icon="alert-circle-outline" label={`${stats.packetsDropped} dropped`} colors={colors} warn />
          )}
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={handleToggle}
            style={({ pressed }) => [
              styles.disconnectBtn,
              { borderColor: colors.destructive + "55", opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Text style={[styles.disconnectText, { color: colors.destructive }]}>Disconnect</Text>
          </Pressable>
        </View>
      )}

      {!isConnected && (
        <View style={[styles.connectRow, { borderTopColor: colors.border }]}>
          {config.adbMode && !isConnecting && (
            <View style={[styles.adbHint, { backgroundColor: colors.accent + "10" }]}>
              <MaterialCommunityIcons name="information-outline" size={12} color={colors.accent} />
              <Text style={[styles.adbHintText, { color: colors.accent }]}>
                Run: <Text style={styles.adbHintCode}>adb reverse tcp:{config.port} tcp:{config.port}</Text>
              </Text>
            </View>
          )}
          <Pressable
            onPress={handleToggle}
            style={({ pressed }) => [
              styles.connectBtn,
              {
                backgroundColor: isConnecting ? "#f5a62322" : colors.primary + "22",
                borderColor: isConnecting ? "#f5a623" : colors.primary,
                opacity: pressed ? 0.6 : 1,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="lan-connect"
              size={16}
              color={isConnecting ? "#f5a623" : colors.primary}
            />
            <Text style={[styles.connectBtnText, { color: isConnecting ? "#f5a623" : colors.primary }]}>
              {isConnecting ? "Cancel" : "Connect"}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function StatChip({
  icon,
  label,
  colors,
  warn,
}: {
  icon: string;
  label: string;
  colors: ReturnType<typeof useColors>;
  warn?: boolean;
}) {
  const color = warn ? colors.destructive : colors.mutedForeground;
  return (
    <View style={styles.statChip}>
      <MaterialCommunityIcons name={icon as any} size={11} color={color} />
      <Text style={[styles.statText, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 10,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  addressBlock: {
    flex: 1,
  },
  hostRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  hostText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  adbBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
  },
  adbBadgeText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  statusLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBtn: {},
  iconBtnRound: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    backgroundColor: "#2a2a32",
    borderRadius: 5,
  },
  statText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
  disconnectBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 7,
    borderWidth: 1,
  },
  disconnectText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  connectRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  adbHint: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  adbHintText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  adbHintCode: {
    fontFamily: "Inter_600SemiBold",
  },
  connectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9,
    borderWidth: 1,
  },
  connectBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});
