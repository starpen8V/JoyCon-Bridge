import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useJoyCon } from "@/context/JoyConContext";
import { useColors } from "@/hooks/useColors";
import { JoyConSide, ScannedDevice } from "@/services/joycon-protocol";

export default function ScanScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ side?: JoyConSide }>();
  const targetSide = params.side ?? null;
  const { isScanning, scannedDevices, startScan, stopScan, connectDevice } = useJoyCon();

  const scanRing = useSharedValue(0);

  useEffect(() => {
    startScan();
    return () => stopScan();
  }, []);

  useEffect(() => {
    if (isScanning) {
      scanRing.value = withRepeat(withTiming(1, { duration: 1200 }), -1, false);
    } else {
      scanRing.value = withTiming(0, { duration: 300 });
    }
  }, [isScanning]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.35 - scanRing.value * 0.35,
    transform: [{ scale: 1 + scanRing.value * 0.5 }],
  }));

  const filteredDevices = targetSide
    ? scannedDevices.filter((d) => d.side === targetSide || d.side === null)
    : scannedDevices;

  const handleConnect = (device: ScannedDevice) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    connectDevice(device);
    router.back();
  };

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0) + 12;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />

      <View style={[styles.header, { paddingTop: topPad }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={16}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.5 : 1 }]}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {targetSide ? `Pair ${targetSide === "left" ? "Left" : "Right"} JoyCon` : "Scan for JoyCons"}
        </Text>
        {isScanning ? (
          <Pressable
            onPress={stopScan}
            hitSlop={12}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
          >
            <Text style={[styles.stopText, { color: colors.destructive }]}>Stop</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={startScan}
            hitSlop={12}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
          >
            <MaterialCommunityIcons name="refresh" size={22} color={colors.primary} />
          </Pressable>
        )}
      </View>

      <View style={styles.scanIndicator}>
        <Animated.View
          style={[
            styles.scanRing,
            {
              borderColor: targetSide === "left"
                ? colors.leftJoyCon
                : targetSide === "right"
                ? colors.rightJoyCon
                : colors.primary,
            },
            ringStyle,
          ]}
        />
        <View
          style={[
            styles.scanCore,
            {
              backgroundColor:
                targetSide === "left"
                  ? colors.leftJoyCon + "22"
                  : targetSide === "right"
                  ? colors.rightJoyCon + "22"
                  : colors.primary + "22",
              borderColor:
                targetSide === "left"
                  ? colors.leftJoyCon
                  : targetSide === "right"
                  ? colors.rightJoyCon
                  : colors.primary,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="bluetooth-audio"
            size={32}
            color={
              targetSide === "left"
                ? colors.leftJoyCon
                : targetSide === "right"
                ? colors.rightJoyCon
                : colors.primary
            }
          />
        </View>
        <Text style={[styles.scanStatusText, { color: colors.mutedForeground }]}>
          {isScanning ? "Scanning for JoyCons…" : "Tap refresh to scan"}
        </Text>
        <Text style={[styles.scanHint, { color: colors.mutedForeground }]}>
          Hold the sync button on your JoyCon
        </Text>
      </View>

      <FlatList
        data={filteredDevices}
        keyExtractor={(item) => item.address}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingBottom:
              insets.bottom + (Platform.OS === "web" ? 34 : 0) + 20,
          },
        ]}
        ListHeaderComponent={
          filteredDevices.length > 0 ? (
            <Text style={[styles.listHeader, { color: colors.mutedForeground }]}>
              FOUND DEVICES
            </Text>
          ) : null
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 80).springify()}>
            <Pressable
              onPress={() => handleConnect(item)}
              style={({ pressed }) => [
                styles.deviceRow,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.deviceIcon,
                  {
                    backgroundColor:
                      item.side === "left"
                        ? colors.leftJoyCon + "22"
                        : item.side === "right"
                        ? colors.rightJoyCon + "22"
                        : colors.muted,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="gamepad-variant-outline"
                  size={20}
                  color={
                    item.side === "left"
                      ? colors.leftJoyCon
                      : item.side === "right"
                      ? colors.rightJoyCon
                      : colors.mutedForeground
                  }
                />
              </View>
              <View style={styles.deviceInfo}>
                <Text style={[styles.deviceName, { color: colors.foreground }]}>
                  {item.name}
                </Text>
                <Text style={[styles.deviceAddress, { color: colors.mutedForeground }]}>
                  {item.address} · {item.rssi} dBm
                </Text>
              </View>
              {item.side && (
                <View
                  style={[
                    styles.sideTag,
                    {
                      backgroundColor:
                        item.side === "left"
                          ? colors.leftJoyCon + "22"
                          : colors.rightJoyCon + "22",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.sideTagText,
                      {
                        color:
                          item.side === "left"
                            ? colors.leftJoyCon
                            : colors.rightJoyCon,
                      },
                    ]}
                  >
                    {item.side === "left" ? "L" : "R"}
                  </Text>
                </View>
              )}
              <MaterialCommunityIcons
                name="chevron-right"
                size={18}
                color={colors.mutedForeground}
              />
            </Pressable>
          </Animated.View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            {isScanning ? (
              <ActivityIndicator color={colors.mutedForeground} />
            ) : (
              <>
                <MaterialCommunityIcons
                  name="bluetooth-off"
                  size={40}
                  color={colors.mutedForeground}
                />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  No JoyCons found
                </Text>
                <Text style={[styles.emptyHint, { color: colors.mutedForeground }]}>
                  Make sure Bluetooth is enabled and the JoyCon is in pairing mode
                </Text>
              </>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  backBtn: {},
  title: {
    flex: 1,
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  stopText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  scanIndicator: {
    alignItems: "center",
    paddingVertical: 28,
    gap: 10,
  },
  scanRing: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
  },
  scanCore: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  scanStatusText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    marginTop: 4,
  },
  scanHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  listHeader: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  deviceRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    marginBottom: 8,
  },
  deviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  deviceAddress: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  sideTag: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  sideTagText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  empty: {
    alignItems: "center",
    paddingTop: 20,
    gap: 10,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  emptyHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 32,
    lineHeight: 18,
  },
});
