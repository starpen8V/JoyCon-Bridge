import * as Haptics from "expo-haptics";
import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

interface Props {
  label: string;
  active: boolean;
  color: string;
  size?: number;
  onPressIn?: () => void;
  onPressOut?: () => void;
}

export function ButtonDot({
  label,
  active,
  color,
  size = 22,
  onPressIn,
  onPressOut,
}: Props) {
  const animStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: withSpring(active ? 1.18 : 1, { damping: 12, stiffness: 500 }),
      },
    ],
    opacity: withSpring(active ? 1 : 0.28, { damping: 18, stiffness: 300 }),
    backgroundColor: withSpring(active ? color : "#2a2a32", {
      damping: 18,
      stiffness: 300,
    }),
  }));

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPressIn?.();
  };

  const handlePressOut = () => {
    onPressOut?.();
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.touchTarget,
        { width: Math.max(size, 32), height: Math.max(size, 32) },
      ]}
      hitSlop={6}
    >
      <Animated.View
        style={[
          animStyle,
          { width: size, height: size, borderRadius: size / 2 },
          styles.dot,
        ]}
      >
        <Text
          style={[
            styles.label,
            { fontSize: size * 0.42, color: active ? "#fff" : color + "99" },
          ]}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touchTarget: {
    alignItems: "center",
    justifyContent: "center",
    margin: 1,
  },
  dot: {
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
  },
});
