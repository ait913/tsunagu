import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import MapWithMarkers from "@/components/MapWithMarkers";
import TimerDisplay from "@/components/TimerDisplay";
import type { RootStackParamList } from "@/navigation/types";
import { respond, updateLocation } from "@/services/api/rescue";
import { distanceM, getCurrent, type LocationPoint, watch } from "@/services/location/tracker";
import { useRescueStore } from "@/stores/rescueStore";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { formatTime } from "@/utils/formatTime";

type Props = NativeStackScreenProps<RootStackParamList, "NavResponder">;

export default function NavResponderScreen({
  navigation,
  route,
}: Props): JSX.Element {
  const { sessionId, targetLat, targetLng, aed } = route.params;
  const selfResponderId = useRescueStore((state) => state.selfResponderId);
  const peerCount = useRescueStore((state) => state.responders.length);
  const responders = useRescueStore((state) => state.responders);
  const [currentLocation, setCurrentLocation] = useState<LocationPoint | null>(null);
  const [etaSec, setEtaSec] = useState<number | null>(null);
  const arrivedSentRef = useRef(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const withinTargetAtRef = useRef<number | null>(null);

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

      const distanceToTarget = distanceM(location, { lat: targetLat, lng: targetLng });
      const nextEtaSec = Math.ceil(distanceToTarget / 1.4);

      setEtaSec(nextEtaSec);

      if (selfResponderId) {
        void updateLocation(sessionId, selfResponderId, {
          lat: location.lat,
          lng: location.lng,
          etaSec: nextEtaSec,
        }).catch(() => undefined);
      }

      if (distanceToTarget < 30) {
        if (withinTargetAtRef.current === null) {
          withinTargetAtRef.current = Date.now();
          return;
        }

        if (Date.now() - withinTargetAtRef.current >= 5_000 && !arrivedSentRef.current) {
          arrivedSentRef.current = true;

          if (selfResponderId) {
            void updateLocation(sessionId, selfResponderId, {
              lat: location.lat,
              lng: location.lng,
              etaSec: 0,
            }).catch(() => undefined);
          }

          navigation.replace("RescueModeResponder", { sessionId });
        }

        return;
      }

      withinTargetAtRef.current = null;
    }, { intervalMs: 5_000, distanceM: 5 });

    return () => {
      active = false;
      watcher.stop();
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
      }
    };
  }, [navigation, selfResponderId, sessionId, targetLat, targetLng]);

  const markers = useMemo(() => {
    const peerMarkers = responders
      .filter(
        (responder) =>
          responder.id !== selfResponderId &&
          responder.lat !== null &&
          responder.lng !== null
      )
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
        id: "target",
        lat: targetLat,
        lng: targetLng,
        type: "target" as const,
        label: "現場",
      },
      ...(aed
        ? [
            {
              id: `aed-${aed.id}`,
              lat: aed.lat,
              lng: aed.lng,
              type: "aed" as const,
              label: aed.name,
            },
          ]
        : []),
      ...peerMarkers,
    ];
  }, [aed, currentLocation, responders, selfResponderId, targetLat, targetLng]);

  const startAbandonHold = () => {
    holdTimerRef.current = setTimeout(() => {
      void respond(sessionId, {
        role: "RESPONDER",
        decision: "DECLINE",
      }).finally(() => {
        navigation.replace("Abandon", { peerCount });
      });
    }, 2_000);
  };

  const stopAbandonHold = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  return (
    <View style={styles.container}>
      <TimerDisplay label="現場まで" seconds={etaSec} />
      <View style={styles.mapWrap}>
        {currentLocation ? (
          <MapWithMarkers
            center={currentLocation}
            markers={markers}
            routeTo={{ lat: targetLat, lng: targetLng }}
          />
        ) : (
          <View style={styles.mapFallback}>
            <Text style={styles.detail}>位置情報を取得しています</Text>
          </View>
        )}
      </View>
      <Text style={styles.detail}>
        現在地共有中 / 目標 {targetLat.toFixed(4)}, {targetLng.toFixed(4)}
      </Text>
      {currentLocation ? (
        <Text style={styles.detail}>
          現在地 {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
        </Text>
      ) : null}
      <Pressable
        accessibilityHint="2秒長押しで辞退します"
        accessibilityLabel="諦める"
        accessibilityRole="button"
        onPressIn={startAbandonHold}
        onPressOut={stopAbandonHold}
        style={({ pressed }) => [
          styles.dangerButton,
          pressed ? styles.buttonPressed : null,
        ]}
      >
        <Text style={styles.dangerText}>諦める</Text>
      </Pressable>
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
  mapWrap: {
    marginTop: spacing.lg,
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
  dangerButton: {
    minHeight: 72,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: colors.gray700,
    marginTop: "auto",
  },
  dangerText: {
    ...typography.small,
    color: colors.fgWhite,
  },
  buttonPressed: {
    opacity: 0.88,
  },
});
