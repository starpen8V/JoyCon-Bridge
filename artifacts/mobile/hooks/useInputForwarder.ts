import { useEffect, useRef } from "react";

import { useBridge } from "@/context/BridgeContext";
import { useJoyCon } from "@/context/JoyConContext";
import { buildProControllerReport } from "@/services/joycon-protocol";

let seq = 0;

/**
 * Runs a 60 Hz loop that reads current JoyCon state and forwards it to the
 * PC bridge via WebSocket whenever the bridge is connected.
 *
 * Must be called inside a component that is within both BridgeProvider and
 * JoyConProvider (e.g. the root HomeScreen).
 */
export function useInputForwarder() {
  const { leftJoyCon, rightJoyCon } = useJoyCon();
  const { status, sendReport } = useBridge();

  // Keep a ref to current JoyCon state so the interval doesn't capture stale closures
  const leftRef = useRef(leftJoyCon);
  const rightRef = useRef(rightJoyCon);
  leftRef.current = leftJoyCon;
  rightRef.current = rightJoyCon;

  const connectedRef = useRef(false);
  connectedRef.current = status === "connected";

  useEffect(() => {
    const id = setInterval(() => {
      if (!connectedRef.current) return;
      const left = leftRef.current;
      const right = rightRef.current;
      if (!left.connected || !right.connected) return;

      const report = buildProControllerReport(left, right, seq++);
      sendReport(report);
    }, 16); // ~60 Hz

    return () => clearInterval(id);
  }, [sendReport]);
}
