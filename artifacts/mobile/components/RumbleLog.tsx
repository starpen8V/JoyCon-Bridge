import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useBridge } from "@/context/BridgeContext";
import { useColors } from "@/hooks/useColors";
import { RumbleCommand } from "@/services/joycon-protocol";

interface LogEntry {
  id: string;
  ts: number;
  cmd: RumbleCommand;
}

const MAX_ENTRIES = 4;

export function RumbleLog() {
  const colors = useColors();
  const { onRumble } = useBridge();
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const counterRef = useRef(0);

  useEffect(() => {
    const unsub = onRumble((cmd) => {
      counterRef.current++;
      const entry: LogEntry = {
        id: `${Date.now()}-${counterRef.current}`,
        ts: Date.now(),
        cmd,
      };
      setEntries((prev) => [entry, ...prev].slice(0, MAX_ENTRIES));
    });
    return unsub;
  }, [onRumble]);

  if (entries.length === 0) return null;

  return (
    <View style={[styles.container, { borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.mutedForeground }]}>
        RUMBLE
      </Text>
      {entries.map((e) => (
        <View key={e.id} style={styles.row}>
          <Text style={[styles.side, { color: e.cmd.side === "left" ? colors.leftJoyCon : e.cmd.side === "right" ? colors.rightJoyCon : colors.foreground }]}>
            {e.cmd.side.toUpperCase()}
          </Text>
          <Text style={[styles.detail, { color: colors.mutedForeground }]}>
            {e.cmd.highFreq.toFixed(0)}Hz · {(e.cmd.highAmp * 100).toFixed(0)}% · {e.cmd.durationMs}ms
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  title: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  side: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    width: 38,
  },
  detail: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
});
