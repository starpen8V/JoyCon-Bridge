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
  const { status, stats, config, connect, disconnect } = useBridge();

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
    if (isConnected || isConnecting) {
      disconnect();
    } else {
      connect();
    }
  };

  const formatBytes = (b: number) => {
    if (b < 1024) return `${b}B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)}KB`;
    return `${(b / 1024 / 1024).toFixed(1)}MB`;
  };

  return (
    <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.row}>
        <View style={styles.left}>
          <Animated.View style={[styles.statusDot, { backgroundColor: statusColor }, pulseStyle]} />
          <View>
            <Text style={[styles.hostText, { color: colors.foreground }]}>
              {config.host}:{config.port}
            </Text>
            <Text style={[styles.statusLabel, { color: colors.mutedForeground }]}>
              {status === "connected"
                ? "PC Bridge"
                : status === "connecting"
                ? "Connecting…"
                : status === "error"
                ? "Connection failed"
                : "USB / Network Bridge"}
            </Text>
          </View>
        </View>

        <View style={styles.right}>
          {isConnected && (
            <View style={styles.statsRow}>
              <StatChip label={`${stats.latencyMs}ms`} color={colors.mutedForeground} />
              <StatChip label={`${stats.inputRateHz}Hz`} color={colors.mutedForeground} />
              <StatChip label={formatBytes(stats.bytesSent)} color={colors.mutedForeground} />
            </View>
          )}
          <View style={styles.actions}>
            <Pressable
              onPress={() => router.push("/settings")}
              hitSlop={12}
              style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.5 : 1 }]}
            >
              <MaterialCommunityIcons
                name="cog-outline"
                size={20}
                color={colors.mutedForeground}
              />
            </Pressable>
            <Pressable
              onPress={handleToggle}
              style={({ pressed }) => [
                styles.connectBtn,
                {
                  backgroundColor: isConnected
                    ? colors.destructive + "22"
                    : colors.primary + "22",
                  borderColor: isConnected ? colors.destructive : colors.primary,
                  opacity: pressed ? 0.6 : 1,
                },
              ]}
            >
              <MaterialCommunityIcons
                name={isConnected ? "lan-disconnect" : "lan-connect"}
                size={16}
                color={isConnected ? colors.destructive : colors.primary}
              />
              <Text
                style={[
                  styles.connectBtnText,
                  { color: isConnected ? colors.destructive : colors.primary },
                ]}
              >
                {isConnected ? "Disconnect" : isConnecting ? "Cancel" : "Connect"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

function StatChip({ label, color }: { label: string; color: string }) {
  return (
    <View style={styles.statChip}>
      <Text style={[styles.statText, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  hostText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  statusLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  right: {
    alignItems: "flex-end",
    gap: 6,
  },
  statsRow: {
    flexDirection: "row",
    gap: 4,
  },
  statChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "#2a2a32",
    borderRadius: 4,
  },
  statText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBtn: {
    padding: 2,
  },
  connectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  connectBtnText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
});
