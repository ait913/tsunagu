import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import DismissibleCard from "@/components/DismissibleCard";
import MetronomeView from "@/components/MetronomeView";
import TimerDisplay from "@/components/TimerDisplay";
import type { RootStackParamList } from "@/navigation/types";
import { useCprGuide } from "@/hooks/useCprGuide";
import { useRescueSocket } from "@/hooks/useRescueSocket";
import { useRescueStore } from "@/stores/rescueStore";
import { useSosStore } from "@/stores/sosStore";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { formatTime } from "@/utils/formatTime";

type Props = NativeStackScreenProps<RootStackParamList, "RescueModeResponder">;

export default function RescueModeResponderScreen({
  navigation,
  route,
}: Props): JSX.Element {
  const { sessionId } = route.params;
  const symptom = useSosStore((state) => state.symptom) ?? "NO_BREATHING";
  const startedAt = useRescueStore((state) => state.startedAt);
  const isOnline = useRescueStore((state) => state.isOnline);
  const [now, setNow] = useState(Date.now());
  const [showOfflineBanner, setShowOfflineBanner] = useState(true);

  useCprGuide(true, { sessionId, symptom });
  useRescueSocket(sessionId);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setNow(Date.now());
    }, 1_000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  const elapsedSec = useMemo(() => {
    if (!startedAt) {
      return 0;
    }

    return Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1_000));
  }, [now, startedAt]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
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
      <TimerDisplay label="救急隊あと" seconds={600} warning />
      <View style={styles.centerWrap}>
        <MetronomeView active bpm={100} />
        <Text style={styles.guidance}>胸骨圧迫を続けてください</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardText}>AED装着済</Text>
      </View>
      <TimerDisplay label="経過" seconds={elapsedSec} />
      <Pressable
        accessibilityHint="救急隊への引き継ぎ画面へ進みます"
        accessibilityLabel="救急隊到着"
        accessibilityRole="button"
        onPress={() => {
          navigation.navigate("Handoff", { sessionId, kind: "TO_EMS" });
        }}
        style={({ pressed }) => [
          styles.button,
          pressed ? styles.buttonPressed : null,
        ]}
      >
        <Text style={styles.buttonText}>救急隊到着</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    backgroundColor: colors.bgBlack,
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
    marginBottom: spacing.xl,
  },
  card: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    borderRadius: 16,
    backgroundColor: colors.gray700,
    marginBottom: spacing.lg,
  },
  cardText: {
    ...typography.small,
    color: colors.fgWhite,
    textAlign: "center",
  },
  button: {
    minHeight: 72,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: colors.emergencyRed,
    marginTop: spacing.xl,
  },
  buttonText: {
    ...typography.small,
    color: colors.fgWhite,
  },
  buttonPressed: {
    opacity: 0.88,
  },
});
