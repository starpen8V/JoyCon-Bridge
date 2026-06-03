import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { ButtonDot } from "@/components/ButtonDot";
import { DeviceDropdown } from "@/components/DeviceDropdown";
import { StickVisualizer } from "@/components/StickVisualizer";
import { useJoyCon } from "@/context/JoyConContext";
import { useColors } from "@/hooks/useColors";
import { JoyConSide } from "@/services/joycon-protocol";

interface Props {
  side: JoyConSide;
}

export function JoyConCard({ side }: Props) {
  const colors = useColors();
  const { leftJoyCon, rightJoyCon } = useJoyCon();
  const joycon = side === "left" ? leftJoyCon : rightJoyCon;
  const accentColor = side === "left" ? colors.leftJoyCon : colors.rightJoyCon;
  const pulseAnim = useSharedValue(0);

  useEffect(() => {
    if (joycon.rumbling) {
      pulseAnim.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 80 }),
          withTiming(0, { duration: 80 })
        ),
        -1,
        true
      );
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    } else {
      pulseAnim.value = withTiming(0, { duration: 150 });
    }
  }, [joycon.rumbling]);

  const cardAnimStyle = useAnimatedStyle(() => ({
    borderColor: `rgba(${side === "left" ? "230,0,18" : "10,185,230"},${
      0.25 + pulseAnim.value * 0.55
    })`,
  }));

  const batteryIcon =
    joycon.batteryLevel > 70
      ? "battery-high"
      : joycon.batteryLevel > 35
      ? "battery-medium"
      : "battery-low";

  return (
    <Animated.View style={[styles.card, { backgroundColor: colors.card }, cardAnimStyle]}>
      <View style={styles.header}>
        <View style={[styles.sideTag, { backgroundColor: accentColor + "22" }]}>
          <Text style={[styles.sideTagText, { color: accentColor }]}>
            {side === "left" ? "L" : "R"}
          </Text>
        </View>

        <DeviceDropdown side={side} joycon={joycon} accentColor={accentColor} />

        {joycon.connected && (
          <View style={styles.battery}>
            <MaterialCommunityIcons
              name={batteryIcon}
              size={15}
              color={joycon.batteryLevel > 35 ? colors.success : colors.destructive}
            />
            <Text style={[styles.batteryText, { color: colors.mutedForeground }]}>
              {joycon.batteryLevel}%
            </Text>
          </View>
        )}
      </View>

      {joycon.connected ? (
        <View style={styles.inputArea}>
          {side === "left" ? (
            <>
              <View style={styles.stickSection}>
                <StickVisualizer
                  x={joycon.leftStick.x}
                  y={joycon.leftStick.y}
                  color={accentColor}
                  size={56}
                />
              </View>
              <View style={styles.buttonsSection}>
                <View style={styles.dpad}>
                  <ButtonDot label="U" active={joycon.leftButtons.up} color={accentColor} size={20} />
                  <View style={styles.dpadRow}>
                    <ButtonDot label="L" active={joycon.leftButtons.left} color={accentColor} size={20} />
                    <View style={styles.dpadCenter} />
                    <ButtonDot label="R" active={joycon.leftButtons.right} color={accentColor} size={20} />
                  </View>
                  <ButtonDot label="D" active={joycon.leftButtons.down} color={accentColor} size={20} />
                </View>
                <View style={styles.smallButtons}>
                  <ButtonDot label="−" active={joycon.leftButtons.minus} color={accentColor} size={20} />
                  <ButtonDot label="L" active={joycon.leftButtons.l} color={accentColor} size={20} />
                  <ButtonDot label="ZL" active={joycon.leftButtons.zl} color={accentColor} size={20} />
                </View>
              </View>
            </>
          ) : (
            <>
              <View style={styles.buttonsSection}>
                <View style={styles.abxyGrid}>
                  <ButtonDot label="X" active={joycon.rightButtons.x} color={accentColor} size={20} />
                  <View style={styles.abxyRow}>
                    <ButtonDot label="Y" active={joycon.rightButtons.y} color={accentColor} size={20} />
                    <View style={styles.dpadCenter} />
                    <ButtonDot label="A" active={joycon.rightButtons.a} color={accentColor} size={20} />
                  </View>
                  <ButtonDot label="B" active={joycon.rightButtons.b} color={accentColor} size={20} />
                </View>
                <View style={styles.smallButtons}>
                  <ButtonDot label="+" active={joycon.rightButtons.plus} color={accentColor} size={20} />
                  <ButtonDot label="R" active={joycon.rightButtons.r} color={accentColor} size={20} />
                  <ButtonDot label="ZR" active={joycon.rightButtons.zr} color={accentColor} size={20} />
                </View>
              </View>
              <View style={styles.stickSection}>
                <StickVisualizer
                  x={joycon.rightStick.x}
                  y={joycon.rightStick.y}
                  color={accentColor}
                  size={56}
                />
              </View>
            </>
          )}
        </View>
      ) : (
        <View style={[styles.disconnectedHint, { borderColor: accentColor + "33" }]}>
          <MaterialCommunityIcons name="gesture-tap" size={20} color={accentColor + "66"} />
          <Text style={[styles.disconnectedText, { color: colors.mutedForeground }]}>
            Tap name to select device
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "#2a2a32",
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sideTag: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sideTagText: {
    fontSize: 13,
    fontWeight: "800" as const,
    fontFamily: "Inter_700Bold",
  },
  battery: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    flexShrink: 0,
  },
  batteryText: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  inputArea: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stickSection: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  buttonsSection: {
    flex: 1.6,
    gap: 6,
  },
  dpad: {
    alignItems: "center",
    gap: 0,
  },
  dpadRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dpadCenter: {
    width: 8,
    height: 8,
  },
  abxyGrid: {
    alignItems: "center",
  },
  abxyRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  smallButtons: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 4,
  },
  disconnectedHint: {
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  disconnectedText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});
