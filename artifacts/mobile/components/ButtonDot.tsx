import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

interface Props {
  label: string;
  active: boolean;
  color: string;
  size?: number;
}

export function ButtonDot({ label, active, color, size = 22 }: Props) {
  const animStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: withSpring(active ? 1.15 : 1, {
          damping: 14,
          stiffness: 400,
        }),
      },
    ],
    opacity: withSpring(active ? 1 : 0.28, { damping: 18, stiffness: 300 }),
    backgroundColor: withSpring(active ? color : "#2a2a32", {
      damping: 18,
      stiffness: 300,
    }),
  }));

  return (
    <View style={styles.wrapper}>
      <Animated.View
        style={[
          animStyle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
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
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
    margin: 2,
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
