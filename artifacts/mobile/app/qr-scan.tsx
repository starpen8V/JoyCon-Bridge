import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useBridge } from "@/context/BridgeContext";
import { useColors } from "@/hooks/useColors";

function parseBridgeQR(data: string): { host: string; port: number } | null {
  const clean = data.trim();
  const patterns = [
    /^joycon:\/\/([^:]+):(\d+)$/i,
    /^ws:\/\/([^:\/]+):(\d+)/i,
    /^([^:]+):(\d+)$/,
  ];
  for (const re of patterns) {
    const m = clean.match(re);
    if (m) {
      const port = parseInt(m[2], 10);
      if (port > 0 && port < 65536) {
        return { host: m[1], port };
      }
    }
  }
  return null;
}

type ScanState = "scanning" | "found" | "error" | "no-permission";

export default function QrScanScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { updateConfig, connect } = useBridge();

  const [scanState, setScanState] = useState<ScanState>("scanning");
  const [parsedResult, setParsedResult] = useState<{ host: string; port: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [cameraAvailable, setCameraAvailable] = useState(false);
  const [CameraComponent, setCameraComponent] = useState<React.ComponentType<any> | null>(null);
  const scannedRef = useRef(false);

  const successAnim = useSharedValue(0);
  const cornerAnim = useSharedValue(0);

  useEffect(() => {
    cornerAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200 }),
        withTiming(0, { duration: 1200 })
      ),
      -1,
      false
    );

    if (Platform.OS !== "web") {
      let didLoad = false;
      import("expo-camera")
        .then((mod) => {
          if (didLoad) return;
          didLoad = true;
          const { CameraView, useCameraPermissions } = mod;
          setCameraComponent(() => CameraView);
          mod.Camera?.requestCameraPermissionsAsync?.()
            .then((r: any) => {
              if (r?.granted) setCameraAvailable(true);
              else setScanState("no-permission");
            })
            .catch(() => setScanState("no-permission"));
        })
        .catch(() => setScanState("no-permission"));
    }
  }, []);

  const cornerStyle = useAnimatedStyle(() => ({
    opacity: 0.5 + cornerAnim.value * 0.5,
  }));

  const successStyle = useAnimatedStyle(() => ({
    opacity: successAnim.value,
    transform: [{ scale: 0.95 + successAnim.value * 0.05 }],
  }));

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scannedRef.current) return;
    const parsed = parseBridgeQR(data);
    if (!parsed) {
      setErrorMsg(`Unrecognised QR: ${data.substring(0, 40)}`);
      setScanState("error");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setTimeout(() => {
        setScanState("scanning");
        setErrorMsg("");
        scannedRef.current = false;
      }, 2000);
      return;
    }
    scannedRef.current = true;
    setParsedResult(parsed);
    setScanState("found");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    successAnim.value = withTiming(1, { duration: 300 });
  };

  const handleConfirm = () => {
    if (!parsedResult) return;
    updateConfig({ host: parsedResult.host, port: parsedResult.port, adbMode: false });
    setTimeout(() => connect(), 200);
    router.back();
  };

  const handleRetry = () => {
    scannedRef.current = false;
    setParsedResult(null);
    setScanState("scanning");
    successAnim.value = withTiming(0, { duration: 200 });
  };

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0) + 12;
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 0) + 24;

  return (
    <View style={[styles.root, { backgroundColor: "#000" }]}>
      <StatusBar barStyle="light-content" />

      {cameraAvailable && CameraComponent && scanState === "scanning" && (
        <CameraComponent
          style={StyleSheet.absoluteFill}
          facing="back"
          onBarcodeScanned={handleBarCodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        />
      )}

      <View style={[StyleSheet.absoluteFill, styles.overlay]}>
        <View style={[styles.header, { paddingTop: topPad }]}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={16}
            style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.5 : 1 }]}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Scan Bridge QR</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.viewfinderArea}>
          <Animated.View style={[styles.viewfinder, cornerStyle]}>
            <View style={[styles.corner, styles.cornerTL, { borderColor: colors.primary }]} />
            <View style={[styles.corner, styles.cornerTR, { borderColor: colors.primary }]} />
            <View style={[styles.corner, styles.cornerBL, { borderColor: colors.primary }]} />
            <View style={[styles.corner, styles.cornerBR, { borderColor: colors.primary }]} />

            {!cameraAvailable && Platform.OS !== "web" && (
              <View style={styles.noCameraOverlay}>
                <MaterialCommunityIcons name="camera-off" size={36} color="#ffffff66" />
                <Text style={styles.noCameraText}>
                  {scanState === "no-permission"
                    ? "Camera permission denied"
                    : "Loading camera…"}
                </Text>
              </View>
            )}

            {Platform.OS === "web" && (
              <View style={styles.noCameraOverlay}>
                <MaterialCommunityIcons name="qrcode-scan" size={36} color="#ffffff66" />
                <Text style={styles.noCameraText}>
                  Camera scanning requires the Android app
                </Text>
              </View>
            )}
          </Animated.View>

          {scanState === "error" && (
            <View style={[styles.statusPill, { backgroundColor: colors.destructive + "dd" }]}>
              <MaterialCommunityIcons name="alert-circle" size={16} color="#fff" />
              <Text style={styles.pillText}>{errorMsg}</Text>
            </View>
          )}

          {scanState === "scanning" && (
            <Text style={styles.hint}>
              Point at the QR code shown by the Windows client
            </Text>
          )}
        </View>

        {scanState === "found" && parsedResult && (
          <Animated.View
            style={[
              styles.resultCard,
              { backgroundColor: colors.card, borderColor: colors.border },
              successStyle,
            ]}
          >
            <View style={[styles.successIcon, { backgroundColor: colors.success + "22" }]}>
              <MaterialCommunityIcons name="check-circle" size={32} color={colors.success} />
            </View>
            <Text style={[styles.resultTitle, { color: colors.foreground }]}>QR Code Scanned</Text>
            <View style={[styles.resultAddress, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <MaterialCommunityIcons name="lan-connect" size={16} color={colors.mutedForeground} />
              <Text style={[styles.resultAddressText, { color: colors.foreground }]}>
                {parsedResult.host}:{parsedResult.port}
              </Text>
            </View>
            <View style={styles.resultButtons}>
              <Pressable
                onPress={handleRetry}
                style={({ pressed }) => [
                  styles.retryBtn,
                  { borderColor: colors.border, opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <Text style={[styles.retryBtnText, { color: colors.mutedForeground }]}>
                  Re-scan
                </Text>
              </Pressable>
              <Pressable
                onPress={handleConfirm}
                style={({ pressed }) => [
                  styles.confirmBtn,
                  { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <MaterialCommunityIcons name="lan-connect" size={16} color="#fff" />
                <Text style={styles.confirmBtnText}>Connect</Text>
              </Pressable>
            </View>
          </Animated.View>
        )}

        {scanState !== "found" && (
          <View style={[styles.footer, { paddingBottom: botPad }]}>
            <View style={[styles.formatHint, { backgroundColor: "#ffffff11", borderColor: "#ffffff22" }]}>
              <MaterialCommunityIcons name="information-outline" size={14} color="#ffffff88" />
              <Text style={styles.formatText}>
                QR format: <Text style={styles.formatCode}>joycon://IP:PORT</Text>
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const VF_SIZE = 220;
const CORNER_SIZE = 24;
const CORNER_WIDTH = 3;

const styles = StyleSheet.create({
  root: { flex: 1 },
  overlay: { justifyContent: "space-between" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {},
  headerTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  viewfinderArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  viewfinder: {
    width: VF_SIZE,
    height: VF_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  corner: {
    position: "absolute",
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderWidth: CORNER_WIDTH,
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },
  noCameraOverlay: {
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
  },
  noCameraText: {
    color: "#ffffff66",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  pillText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  hint: {
    color: "#ffffff88",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 32,
  },
  resultCard: {
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    gap: 14,
  },
  successIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  resultTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  resultAddress: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: "stretch",
    justifyContent: "center",
  },
  resultAddressText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  resultButtons: {
    flexDirection: "row",
    gap: 10,
    alignSelf: "stretch",
  },
  retryBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  retryBtnText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  confirmBtn: {
    flex: 2,
    flexDirection: "row",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  confirmBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    alignItems: "center",
  },
  formatHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  formatText: {
    color: "#ffffff88",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  formatCode: {
    color: "#ffffffcc",
    fontFamily: "Inter_600SemiBold",
  },
});
