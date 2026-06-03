import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { useJoyCon } from "@/context/JoyConContext";
import { useColors } from "@/hooks/useColors";
import { RumbleCommand } from "@/services/joycon-protocol";

type TargetSide = "left" | "right" | "both";
type FreqPreset = "low" | "mid" | "high";
type AmpPreset = "light" | "medium" | "strong";
type DurationPreset = 80 | 250 | 500 | 1000;

interface Pattern {
  id: string;
  label: string;
  icon: string;
  build: () => RumbleCommand[];
}

const FREQ_MAP: Record<FreqPreset, { highFreq: number; lowFreq: number }> = {
  low:  { highFreq: 80,   lowFreq: 40   },
  mid:  { highFreq: 320,  lowFreq: 160  },
  high: { highFreq: 1250, lowFreq: 640  },
};

const AMP_MAP: Record<AmpPreset, { highAmp: number; lowAmp: number }> = {
  light:  { highAmp: 0.3, lowAmp: 0.2 },
  medium: { highAmp: 0.6, lowAmp: 0.5 },
  strong: { highAmp: 1.0, lowAmp: 1.0 },
};

function makeCmd(
  side: TargetSide,
  freq: FreqPreset,
  amp: AmpPreset,
  durationMs: number
): RumbleCommand {
  return {
    type: "rumble",
    side,
    ...FREQ_MAP[freq],
    ...AMP_MAP[amp],
    durationMs,
  };
}

export function RumbleTestPanel() {
  const colors = useColors();
  const { applyRumble, leftJoyCon, rightJoyCon } = useJoyCon();

  const [open, setOpen] = useState(false);
  const [side, setSide] = useState<TargetSide>("both");
  const [freq, setFreq] = useState<FreqPreset>("mid");
  const [amp, setAmp] = useState<AmpPreset>("medium");
  const [duration, setDuration] = useState<DurationPreset>(250);
  const [lastFired, setLastFired] = useState<string | null>(null);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: withSpring(open ? "180deg" : "0deg", { damping: 18 }) }],
  }));

  const bodyStyle = useAnimatedStyle(() => ({
    opacity: withTiming(open ? 1 : 0, { duration: 180 }),
    maxHeight: withSpring(open ? 600 : 0, { damping: 22, stiffness: 200 }),
    overflow: "hidden" as const,
  }));

  const fireCustom = () => {
    const cmd = makeCmd(side, freq, amp, duration);
    applyRumble(cmd);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    setLastFired("custom");
    setTimeout(() => setLastFired(null), duration + 200);
  };

  const PATTERNS: Pattern[] = [
    {
      id: "tap",
      label: "Tap",
      icon: "gesture-tap",
      build: () => [makeCmd(side, "high", "strong", 80)],
    },
    {
      id: "double",
      label: "Double",
      icon: "gesture-double-tap",
      build: () => [
        makeCmd(side, "high", "strong", 80),
        makeCmd(side, "high", "strong", 80),
      ],
    },
    {
      id: "buzz",
      label: "Buzz",
      icon: "vibrate",
      build: () => [makeCmd(side, "low", "strong", 500)],
    },
    {
      id: "heavy",
      label: "Heavy",
      icon: "weight",
      build: () => [makeCmd(side, "mid", "strong", 800)],
    },
    {
      id: "sweep",
      label: "Sweep",
      icon: "chart-line",
      build: () => [
        makeCmd(side, "low", "light", 150),
        makeCmd(side, "mid", "medium", 150),
        makeCmd(side, "high", "strong", 300),
      ],
    },
  ];

  const firePattern = (pattern: Pattern) => {
    const cmds = pattern.build();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setLastFired(pattern.id);
    setTimeout(() => setLastFired(null), 1200);

    let delay = 0;
    cmds.forEach((cmd, i) => {
      setTimeout(() => applyRumble(cmd), delay + i * 120);
    });
  };

  const leftRumbling = leftJoyCon.rumbling;
  const rightRumbling = rightJoyCon.rumbling;

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Pressable
        onPress={() => { setOpen((v) => !v); Haptics.selectionAsync().catch(() => {}); }}
        style={({ pressed }) => [styles.header, { opacity: pressed ? 0.7 : 1 }]}
      >
        <MaterialCommunityIcons name="vibrate" size={16} color={colors.primary} />
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Rumble Test</Text>

        <View style={styles.rumblingIndicators}>
          <View style={[styles.indicator, { backgroundColor: leftRumbling ? colors.leftJoyCon : colors.border }]}>
            <Text style={[styles.indicatorText, { color: leftRumbling ? "#fff" : colors.mutedForeground }]}>L</Text>
          </View>
          <View style={[styles.indicator, { backgroundColor: rightRumbling ? colors.rightJoyCon : colors.border }]}>
            <Text style={[styles.indicatorText, { color: rightRumbling ? "#fff" : colors.mutedForeground }]}>R</Text>
          </View>
        </View>

        <Animated.View style={chevronStyle}>
          <MaterialCommunityIcons name="chevron-down" size={18} color={colors.mutedForeground} />
        </Animated.View>
      </Pressable>

      <Animated.View style={bodyStyle}>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.body}>

          <Row label="Target" colors={colors}>
            {(["left", "right", "both"] as TargetSide[]).map((s) => (
              <ChipBtn
                key={s}
                label={s === "both" ? "Both" : s === "left" ? "L" : "R"}
                active={side === s}
                color={s === "left" ? colors.leftJoyCon : s === "right" ? colors.rightJoyCon : colors.primary}
                onPress={() => setSide(s)}
                colors={colors}
              />
            ))}
          </Row>

          <Row label="Patterns" colors={colors}>
            <View style={styles.patternGrid}>
              {PATTERNS.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => firePattern(p)}
                  style={({ pressed }) => [
                    styles.patternBtn,
                    {
                      backgroundColor:
                        lastFired === p.id ? colors.primary + "30" : colors.muted,
                      borderColor:
                        lastFired === p.id ? colors.primary : colors.border,
                      opacity: pressed ? 0.6 : 1,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={p.icon as any}
                    size={18}
                    color={lastFired === p.id ? colors.primary : colors.mutedForeground}
                  />
                  <Text style={[styles.patternLabel, { color: lastFired === p.id ? colors.primary : colors.foreground }]}>
                    {p.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Row>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Text style={[styles.customLabel, { color: colors.mutedForeground }]}>CUSTOM</Text>

          <Row label="Frequency" colors={colors}>
            {(["low", "mid", "high"] as FreqPreset[]).map((f) => (
              <ChipBtn
                key={f}
                label={{ low: "Low", mid: "Mid", high: "High" }[f]}
                active={freq === f}
                color={colors.accent}
                onPress={() => setFreq(f)}
                colors={colors}
              />
            ))}
          </Row>

          <Row label="Amplitude" colors={colors}>
            {(["light", "medium", "strong"] as AmpPreset[]).map((a) => (
              <ChipBtn
                key={a}
                label={{ light: "Light", medium: "Med", strong: "Strong" }[a]}
                active={amp === a}
                color={colors.accent}
                onPress={() => setAmp(a)}
                colors={colors}
              />
            ))}
          </Row>

          <Row label="Duration" colors={colors}>
            {([80, 250, 500, 1000] as DurationPreset[]).map((d) => (
              <ChipBtn
                key={d}
                label={d < 1000 ? `${d}ms` : "1s"}
                active={duration === d}
                color={colors.accent}
                onPress={() => setDuration(d)}
                colors={colors}
              />
            ))}
          </Row>

          <Pressable
            onPress={fireCustom}
            style={({ pressed }) => [
              styles.fireBtn,
              {
                backgroundColor: lastFired === "custom" ? colors.primary : colors.primary + "22",
                borderColor: colors.primary,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="lightning-bolt"
              size={18}
              color={lastFired === "custom" ? "#fff" : colors.primary}
            />
            <Text style={[styles.fireBtnText, { color: lastFired === "custom" ? "#fff" : colors.primary }]}>
              Fire Rumble
            </Text>
          </Pressable>

          <View style={[styles.noteRow, { backgroundColor: colors.muted }]}>
            <MaterialCommunityIcons name="information-outline" size={12} color={colors.mutedForeground} />
            <Text style={[styles.noteText, { color: colors.mutedForeground }]}>
              Fires locally — triggers JoyCon haptic on real hardware via Bluetooth. In sim mode, animates the card borders.
            </Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

function Row({
  label,
  children,
  colors,
}: {
  label: string;
  children: React.ReactNode;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <View style={styles.rowChips}>{children}</View>
    </View>
  );
}

function ChipBtn({
  label,
  active,
  color,
  onPress,
  colors,
}: {
  label: string;
  active: boolean;
  color: string;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Pressable
      onPress={() => { onPress(); Haptics.selectionAsync().catch(() => {}); }}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: active ? color + "22" : colors.muted,
          borderColor: active ? color : colors.border,
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      <Text style={[styles.chipText, { color: active ? color : colors.mutedForeground }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  rumblingIndicators: {
    flexDirection: "row",
    gap: 5,
  },
  indicator: {
    width: 20,
    height: 20,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  indicatorText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  body: {
    padding: 14,
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rowLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    width: 68,
  },
  rowChips: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  chip: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 7,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  patternGrid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  patternBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  patternLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  customLabel: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.4,
  },
  fireBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 2,
  },
  fireBtnText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  noteRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    padding: 10,
    borderRadius: 8,
  },
  noteText: {
    flex: 1,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
  },
});
