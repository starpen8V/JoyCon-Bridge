import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";

import { useJoyCon } from "@/context/JoyConContext";
import { useColors } from "@/hooks/useColors";
import { JoyConSide, JoyConState, ScannedDevice } from "@/services/joycon-protocol";

interface Props {
  side: JoyConSide;
  joycon: JoyConState;
  accentColor: string;
}

export function DeviceDropdown({ side, joycon, accentColor }: Props) {
  const colors = useColors();
  const router = useRouter();
  const { knownDevices, connectDevice, disconnectSide, forgetDevice } = useJoyCon();
  const [open, setOpen] = useState(false);

  const known = knownDevices[side];

  const handleOpen = () => {
    Haptics.selectionAsync().catch(() => {});
    setOpen(true);
  };

  const handleSelect = (device: ScannedDevice) => {
    setOpen(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    connectDevice(device);
  };

  const handleScanNew = () => {
    setOpen(false);
    router.push({ pathname: "/scan", params: { side } });
  };

  const handleDisconnect = () => {
    setOpen(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    disconnectSide(side);
  };

  const handleForget = (device: ScannedDevice) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    forgetDevice(device);
  };

  return (
    <>
      <Pressable
        onPress={handleOpen}
        style={({ pressed }) => [styles.trigger, { opacity: pressed ? 0.6 : 1 }]}
      >
        <View style={styles.triggerInner}>
          <View style={[styles.statusDot, { backgroundColor: joycon.connected ? colors.success : colors.mutedForeground }]} />
          <Text
            style={[styles.deviceName, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {joycon.connected ? joycon.deviceName : "Not connected"}
          </Text>
          <MaterialCommunityIcons
            name="chevron-down"
            size={14}
            color={colors.mutedForeground}
          />
        </View>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <View style={styles.sheetWrapper} pointerEvents="box-none">
          <View
            style={[
              styles.sheet,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.sheetHeader}>
              <View style={[styles.sideTag, { backgroundColor: accentColor + "22" }]}>
                <Text style={[styles.sideTagText, { color: accentColor }]}>
                  {side === "left" ? "L" : "R"}
                </Text>
              </View>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
                {side === "left" ? "Left JoyCon" : "Right JoyCon"}
              </Text>
              <Pressable
                onPress={() => setOpen(false)}
                hitSlop={12}
                style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
              >
                <MaterialCommunityIcons name="close" size={20} color={colors.mutedForeground} />
              </Pressable>
            </View>

            {known.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                  KNOWN DEVICES
                </Text>
                {known.map((device) => {
                  const isActive = joycon.connected && joycon.deviceAddress === device.address;
                  return (
                    <View key={device.address} style={styles.deviceRow}>
                      <Pressable
                        onPress={() => handleSelect(device)}
                        style={({ pressed }) => [
                          styles.deviceOption,
                          {
                            backgroundColor: isActive
                              ? accentColor + "15"
                              : "transparent",
                            opacity: pressed ? 0.6 : 1,
                          },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={isActive ? "bluetooth-connect" : "bluetooth"}
                          size={18}
                          color={isActive ? accentColor : colors.mutedForeground}
                        />
                        <View style={styles.deviceInfo}>
                          <Text
                            style={[
                              styles.deviceNameText,
                              {
                                color: isActive ? accentColor : colors.foreground,
                                fontFamily: isActive ? "Inter_600SemiBold" : "Inter_400Regular",
                              },
                            ]}
                          >
                            {device.name}
                          </Text>
                          <Text style={[styles.deviceAddr, { color: colors.mutedForeground }]}>
                            {device.address}
                          </Text>
                        </View>
                        {isActive && (
                          <View style={[styles.activeBadge, { backgroundColor: accentColor + "22" }]}>
                            <Text style={[styles.activeBadgeText, { color: accentColor }]}>
                              ACTIVE
                            </Text>
                          </View>
                        )}
                      </Pressable>
                      <Pressable
                        onPress={() => handleForget(device)}
                        hitSlop={10}
                        style={({ pressed }) => [styles.forgetBtn, { opacity: pressed ? 0.4 : 0.6 }]}
                      >
                        <MaterialCommunityIcons
                          name="trash-can-outline"
                          size={15}
                          color={colors.mutedForeground}
                        />
                      </Pressable>
                    </View>
                  );
                })}
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
              </>
            )}

            <Pressable
              onPress={handleScanNew}
              style={({ pressed }) => [
                styles.actionRow,
                { opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <MaterialCommunityIcons
                name="bluetooth-audio"
                size={18}
                color={accentColor}
              />
              <Text style={[styles.actionText, { color: accentColor }]}>
                Scan for new device…
              </Text>
            </Pressable>

            {joycon.connected && (
              <>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <Pressable
                  onPress={handleDisconnect}
                  style={({ pressed }) => [
                    styles.actionRow,
                    { opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="bluetooth-off"
                    size={18}
                    color={colors.destructive}
                  />
                  <Text style={[styles.actionText, { color: colors.destructive }]}>
                    Disconnect
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flex: 1,
  },
  triggerInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flex: 1,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  deviceName: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheetWrapper: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 12,
    paddingBottom: 32,
  },
  sheet: {
    borderRadius: 18,
    borderWidth: 1,
    paddingBottom: 8,
    overflow: "hidden",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sideTag: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  sideTagText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  sheetTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  sectionLabel: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
    paddingHorizontal: 16,
    marginBottom: 4,
    marginTop: 2,
  },
  deviceRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 12,
  },
  deviceOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 11,
    gap: 12,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceNameText: {
    fontSize: 14,
  },
  deviceAddr: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  activeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeBadgeText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
  },
  forgetBtn: {
    padding: 8,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
    marginVertical: 4,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  actionText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
});
