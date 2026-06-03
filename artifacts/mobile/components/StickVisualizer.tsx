import React from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

interface Props {
  x: number;
  y: number;
  color: string;
  size?: number;
}

const KNOB_RATIO = 0.38;

export function StickVisualizer({ x, y, color, size = 64 }: Props) {
  const knobSize = size * KNOB_RATIO;
  const travel = (size - knobSize) / 2;

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: withSpring(x * travel, { damping: 20, stiffness: 300 }) },
      { translateY: withSpring(-y * travel, { damping: 20, stiffness: 300 }) },
    ],
  }));

  return (
    <View
      style={[
        styles.track,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: color + "55",
        },
      ]}
    >
      <View
        style={[
          styles.crossH,
          { width: size - 16, backgroundColor: color + "22" },
        ]}
      />
      <View
        style={[
          styles.crossV,
          { height: size - 16, backgroundColor: color + "22" },
        ]}
      />
      <Animated.View
        style={[
          animStyle,
          styles.knob,
          {
            width: knobSize,
            height: knobSize,
            borderRadius: knobSize / 2,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0a0a0c",
    overflow: "hidden",
  },
  crossH: {
    position: "absolute",
    height: 1,
    opacity: 0.5,
  },
  crossV: {
    position: "absolute",
    width: 1,
    opacity: 0.5,
  },
  knob: {
    position: "absolute",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 6,
  },
});
