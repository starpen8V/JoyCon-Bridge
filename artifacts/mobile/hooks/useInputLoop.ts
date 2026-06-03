import { useEffect, useRef } from "react";
import { buildProControllerReport } from "@/services/joycon-protocol";
import { useBridge } from "@/context/BridgeContext";
import { useJoyCon } from "@/context/JoyConContext";

let seqCounter = 0;

export function useInputLoop() {
  const { leftJoyCon, rightJoyCon } = useJoyCon();
  const { status, stats } = useBridge();

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const leftRef = useRef(leftJoyCon);
  const rightRef = useRef(rightJoyCon);
  leftRef.current = leftJoyCon;
  rightRef.current = rightJoyCon;

  useEffect(() => {
    if (status !== "connected") {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const hz = stats.inputRateHz > 0 ? Math.min(stats.inputRateHz, 125) : 60;
    const intervalMs = Math.round(1000 / hz);

    if (intervalRef.current) clearInterval(intervalRef.current);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [status, stats.inputRateHz]);
}
