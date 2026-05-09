import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import DismissibleCard from "@/components/DismissibleCard";
import EmergencyButton from "@/components/EmergencyButton";
import MetronomeView from "@/components/MetronomeView";
import TimerDisplay from "@/components/TimerDisplay";
import type { RootStackParamList } from "@/navigation/types";
import { getSos } from "@/services/api/sos";
import { callEmergency } from "@/services/api/sos";
import { useCprGuide } from "@/hooks/useCprGuide";
import { useRescueSocket } from "@/hooks/useRescueSocket";
import { useRescueStore } from "@/stores/rescueStore";
import { useSosStore } from "@/stores/sosStore";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { formatTime } from "@/utils/formatTime";

type Props = NativeStackScreenProps<RootStackParamList, "RescueModeFinder">;

export default function RescueModeFinderScreen({
  navigation,
  route,
}: Props): JSX.Element {
  const { sessionId, sosId } = route.params;
  const symptom = useSosStore((state) => state.symptom) ?? "NO_BREATHING";
  const hydrateFromServer = useRescueStore((state) => state.hydrateFromServer);
  const rescueState = useRescueStore((state) => state.state);
  const responders = useRescueStore((state) => state.responders);
  const aedDevice = useRescueStore((state) => state.aedDevice);
  const responderEtaSec = useRescueStore((state) => state.responderEtaSec);
  const aedEtaSec = useRescueStore((state) => state.aedEtaSec);
  const isOnline = useRescueStore((state) => state.isOnline);
  const dispatchRound = useRescueStore((state) => state.dispatchRound);
  const startedAt = useRescueStore((state) => state.startedAt);
  const [elapsedNow, setElapsedNow] = useState(Date.now());
  const [showOfflineBanner, setShowOfflineBanner] = useState(true);
  const [showRoundBanner, setShowRoundBanner] = useState(true);
  const promptedArrivalsRef = useRef<Set<string>>(new Set());

  useCprGuide(true, { sessionId, symptom });
  useRescueSocket(sessionId);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const detail = await getSos(sosId);

        if (!cancelled) {
          hydrateFromServer(detail);
        }
      } catch {
        // CPR UI should stay alive even if hydration fails.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrateFromServer, sosId]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setElapsedNow(Date.now());
    }, 1_000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (rescueState === "AED_ARRIVED") {
      navigation.navigate("AedGuide", { sessionId });
    }
  }, [navigation, rescueState, sessionId]);

  useEffect(() => {
    const arrivedResponder = responders.find(
      (responder) =>
        responder.status === "ARRIVED" &&
        (responder.tier === "TIER1" || responder.tier === "TIER2") &&
        !promptedArrivalsRef.current.has(responder.id)
    );

    if (!arrivedResponder) {
      return;
    }

    promptedArrivalsRef.current.add(arrivedResponder.id);

    Alert.alert("引き継ぎますか?", `${arrivedResponder.displayName} が到着しました。`, [
      {
        text: "続ける",
        style: "cancel",
      },
      {
        text: "引き継ぐ",
        onPress: () => {
          navigation.navigate("Handoff", {
            sessionId,
            toUserId: arrivedResponder.userId,
            kind: "RESPONDER_TO_RESPONDER",
          });
        },
      },
    ]);
  }, [navigation, responders, sessionId]);

  const elapsedSec = useMemo(() => {
    if (!startedAt) {
      return 0;
    }

    return Math.max(
      0,
      Math.floor((elapsedNow - new Date(startedAt).getTime()) / 1_000)
    );
  }, [elapsedNow, startedAt]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {!isOnline ? (
          <View style={styles.bannerWrap}>
            {showOfflineBanner ? (
              <DismissibleCard
                body="通信が戻るまで胸骨圧迫を続けてください。"
                onDismiss={() => setShowOfflineBanner(false)}
                title="オフライン中。CPR を続けて"
              />
            ) : null}
          </View>
        ) : null}

        {responders.length === 0 && dispatchRound === 2 ? (
          <View style={styles.bannerWrap}>
            {showRoundBanner ? (
              <DismissibleCard
                body="救助者が見つからないため、119で救急隊を待ちましょう。"
                onDismiss={() => setShowRoundBanner(false)}
                title="119で救急隊を待ちましょう"
              />
            ) : null}
          </View>
        ) : null}

        <TimerDisplay label="経過" seconds={elapsedSec} />

        <View style={styles.centerWrap}>
          <MetronomeView active bpm={100} />
          <Text accessibilityRole="header" style={styles.guidance}>
            胸の真ん中を{"\n"}強く速く深く 5cm
          </Text>
        </View>

        <View style={styles.timerSection}>
          {aedDevice ? (
            <TimerDisplay label="AED 到着まで" seconds={aedEtaSec} warning />
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>AED なし、CPR を続けて</Text>
            </View>
          )}
        </View>

        <View style={styles.timerSection}>
          <TimerDisplay label="救助者 到着まで" seconds={responderEtaSec} />
        </View>
      </ScrollView>

      <View style={styles.floatingButton}>
        <EmergencyButton onPress={callEmergency} size={96} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgBlack,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: 120,
  },
  bannerWrap: {
    marginBottom: spacing.md,
  },
  centerWrap: {
    alignItems: "center",
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  guidance: {
    ...typography.h2,
    color: colors.fgWhite,
    textAlign: "center",
    marginTop: spacing.xl,
  },
  timerSection: {
    marginBottom: spacing.lg,
  },
  emptyCard: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    borderRadius: 16,
    backgroundColor: colors.gray700,
  },
  emptyText: {
    ...typography.small,
    color: colors.fgWhite,
    textAlign: "center",
  },
  floatingButton: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.xl,
  },
});
