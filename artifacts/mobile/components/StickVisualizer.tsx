import * as Haptics from "expo-haptics";
import React, { useMemo, useRef } from "react";
import { PanResponder, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

interface Props {
  x: number;
  y: number;
  color: string;
  size?: number;
  onMove?: (x: number, y: number) => void;
  onRelease?: () => void;
}

const KNOB_RATIO = 0.38;

export function StickVisualizer({
  x,
  y,
  color,
  size = 64,
  onMove,
  onRelease,
}: Props) {
  const knobSize = size * KNOB_RATIO;
  const travel = (size - knobSize) / 2;

  // Keep latest callbacks in refs so the PanResponder (created once) always calls current versions
  const onMoveRef = useRef(onMove);
  const onReleaseRef = useRef(onRelease);
  onMoveRef.current = onMove;
  onReleaseRef.current = onRelease;

  const draggingRef = useRef(false);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !!onMoveRef.current,
        onMoveShouldSetPanResponder: () => !!onMoveRef.current,
        onPanResponderGrant: () => {
          draggingRef.current = true;
          Haptics.selectionAsync().catch(() => {});
        },
        onPanResponderMove: (_, gs) => {
          const nx = Math.max(-1, Math.min(1, gs.dx / travel));
          const ny = Math.max(-1, Math.min(1, -gs.dy / travel)); // flip Y: up = positive
          onMoveRef.current?.(nx, ny);
        },
        onPanResponderRelease: () => {
          draggingRef.current = false;
          onReleaseRef.current?.();
        },
        onPanResponderTerminate: () => {
          draggingRef.current = false;
          onReleaseRef.current?.();
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [travel]
  );

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: withSpring(x * travel, { damping: 20, stiffness: 300 }) },
      { translateY: withSpring(-y * travel, { damping: 20, stiffness: 300 }) },
    ],
  }));

  const interactive = !!onMove;

  return (
    <View
      {...(interactive ? panResponder.panHandlers : {})}
      style={[
        styles.track,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: interactive ? color + "88" : color + "55",
          borderWidth: interactive ? 2 : 1.5,
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
