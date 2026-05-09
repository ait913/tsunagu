import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import MapWithMarkers from "@/components/MapWithMarkers";
import type { RootStackParamList } from "@/navigation/types";
import { distanceM, getCurrent, type LocationPoint, watch } from "@/services/location/tracker";
import { updateLocation } from "@/services/api/rescue";
import { useRescueStore } from "@/stores/rescueStore";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";

type Props = NativeStackScreenProps<RootStackParamList, "NavAed">;

export default function NavAedScreen({
  navigation,
  route,
}: Props): JSX.Element {
  const { sessionId, aed, targetLat, targetLng } = route.params;
  const selfResponderId = useRescueStore((state) => state.selfResponderId);
  const responders = useRescueStore((state) => state.responders);
  const [phase, setPhase] = useState<"TO_AED" | "TO_SCENE">("TO_AED");
  const [currentLocation, setCurrentLocation] = useState<LocationPoint | null>(null);
  const [targetDistance, setTargetDistance] = useState<number | null>(null);

  const target = phase === "TO_AED" ? { lat: aed.lat, lng: aed.lng } : { lat: targetLat, lng: targetLng };

  useEffect(() => {
    let active = true;

    void getCurrent()
      .then((location) => {
        if (!active) {
          return;
        }

        setCurrentLocation(location);
      })
      .catch(() => undefined);

    const watcher = watch((location) => {
      setCurrentLocation(location);

      const nextDistance = distanceM(location, target);
      setTargetDistance(nextDistance);

      if (selfResponderId) {
        void updateLocation(sessionId, selfResponderId, {
          lat: location.lat,
          lng: location.lng,
          etaSec: Math.ceil(nextDistance / 1.4),
        }).catch(() => undefined);
      }

      if (phase === "TO_SCENE" && nextDistance < 30) {
        navigation.replace("AedPick", { sessionId, aed });
      }
    }, { intervalMs: 5_000, distanceM: 5 });

    return () => {
      active = false;
      watcher.stop();
    };
  }, [aed, navigation, phase, selfResponderId, sessionId, target]);

  const markers = useMemo(() => {
    const peerMarkers = responders
      .filter((responder) => responder.lat !== null && responder.lng !== null)
      .map((responder) => ({
        id: responder.id,
        lat: responder.lat as number,
        lng: responder.lng as number,
        type: "peer" as const,
        label: responder.displayName,
      }));

    return [
      ...(currentLocation
        ? [
            {
              id: "self",
              lat: currentLocation.lat,
              lng: currentLocation.lng,
              type: "self" as const,
              label: "現在地",
            },
          ]
        : []),
      {
        id: `aed-${aed.id}`,
        lat: aed.lat,
        lng: aed.lng,
        type: "aed" as const,
        label: aed.name,
      },
      {
        id: "target",
        lat: target.lat,
        lng: target.lng,
        type: "target" as const,
        label: phase === "TO_AED" ? "AED" : "現場",
      },
      ...peerMarkers,
    ];
  }, [aed, currentLocation, phase, responders, target.lat, target.lng]);

  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        {phase === "TO_AED" ? "AEDへ向かう" : "現場へ向かう"}
      </Text>
      <View style={styles.mapWrap}>
        {currentLocation ? (
          <MapWithMarkers center={currentLocation} markers={markers} routeTo={target} />
        ) : (
          <View style={styles.mapFallback}>
            <Text style={styles.detail}>位置情報を取得しています</Text>
          </View>
        )}
      </View>
      <Text style={styles.detail}>
        目標 {target.lat.toFixed(4)}, {target.lng.toFixed(4)}
      </Text>
      {targetDistance !== null ? (
        <Text style={styles.detail}>残り {Math.round(targetDistance)}m</Text>
      ) : null}
      {currentLocation ? (
        <Text style={styles.detail}>
          現在地 {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
        </Text>
      ) : null}
      {phase === "TO_AED" && targetDistance !== null && targetDistance < 20 ? (
        <Pressable
          accessibilityLabel="AEDを取得しました"
          accessibilityRole="button"
          onPress={() => setPhase("TO_SCENE")}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed ? styles.buttonPressed : null,
          ]}
        >
          <Text style={styles.primaryText}>AEDを取得しました</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    backgroundColor: colors.bgBlack,
  },
  title: {
    ...typography.h2,
    color: colors.fgWhite,
    marginBottom: spacing.lg,
  },
  mapWrap: {
    marginBottom: spacing.xl,
  },
  mapFallback: {
    minHeight: 300,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: colors.gray700,
  },
  detail: {
    ...typography.small,
    color: colors.fgWhite,
    marginBottom: spacing.sm,
  },
  primaryButton: {
    minHeight: 72,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: colors.emergencyRed,
    marginTop: spacing.xl,
  },
  primaryText: {
    ...typography.small,
    color: colors.fgWhite,
  },
  buttonPressed: {
    opacity: 0.88,
  },
});
