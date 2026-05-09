import React, { useEffect, useMemo, useState } from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import TierBadge from "@/components/TierBadge";
import type { RootStackParamList } from "@/navigation/types";
import { end } from "@/services/api/rescue";
import { useAppStore } from "@/stores/appStore";
import { useRescueStore } from "@/stores/rescueStore";
import { useSosStore } from "@/stores/sosStore";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import type { Tier } from "@/types/api";
import { formatTime } from "@/utils/formatTime";

type Props = NativeStackScreenProps<RootStackParamList, "End">;

export default function EndScreen({ navigation, route }: Props): JSX.Element {
  const { sessionId } = route.params;
  const responders = useRescueStore((state) => state.responders);
  const aedCarrier = useRescueStore((state) => state.aedCarrier);
  const startedAt = useRescueStore((state) => state.startedAt);
  const isDemo = useRescueStore((state) => state.isDemo);
  const appDemoMode = useAppStore((state) => state.demoMode);
  const resetRescue = useRescueStore((state) => state.reset);
  const endSos = useSosStore((state) => state.endSos);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    void end(sessionId, { reason: "FINDER_ENDED" }).catch(() => undefined);
  }, [sessionId]);

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
      return null;
    }

    return Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1_000));
  }, [now, startedAt]);

  const tiers = useMemo(() => {
    const values = responders
      .map((responder) => responder.tier)
      .concat(aedCarrier?.tier ?? null)
      .filter((tier): tier is Tier => tier !== null);

    return [...new Set(values)];
  }, [aedCarrier?.tier, responders]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {isDemo || appDemoMode ? (
        <View style={styles.demoBadge}>
          <Text style={styles.demoBadgeText}>これはデモでした</Text>
        </View>
      ) : null}
      <Text accessibilityRole="header" style={styles.title}>
        ありがとう
      </Text>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>経過時間</Text>
        <Text style={styles.summaryValue}>{formatTime(elapsedSec)}</Text>
        <Text style={styles.summaryLabel}>参加 Tier</Text>
        <View style={styles.tierRow}>
          {tiers.length > 0 ? (
            tiers.map((tier) => (
              <View key={tier} style={styles.tierItem}>
                <TierBadge tier={tier} />
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>参加者なし</Text>
          )}
        </View>
      </View>
      <Pressable
        accessibilityLabel="履歴を見る"
        accessibilityRole="button"
        accessibilityState={{ disabled: true }}
        disabled
        style={styles.disabledButton}
      >
        <Text style={styles.disabledButtonText}>履歴を見る</Text>
      </Pressable>
      <Pressable
        accessibilityHint="フィードバックフォームを開きます"
        accessibilityLabel="フィードバック"
        accessibilityRole="button"
        onPress={() => {
          void Linking.openURL("https://forms.example/tsunagu");
        }}
        style={({ pressed }) => [
          styles.secondaryButton,
          pressed ? styles.buttonPressed : null,
        ]}
      >
        <Text style={styles.secondaryText}>フィードバック</Text>
      </Pressable>
      <Pressable
        accessibilityHint="ホームへ戻ります"
        accessibilityLabel="ホームに戻る"
        accessibilityRole="button"
        onPress={() => {
          resetRescue();
          endSos();
          navigation.reset({ routes: [{ name: "Home" }] });
        }}
        style={({ pressed }) => [
          styles.primaryButton,
          pressed ? styles.buttonPressed : null,
        ]}
      >
        <Text style={styles.primaryText}>ホームに戻る</Text>
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
  demoBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: colors.warningAmber,
    marginBottom: spacing.lg,
  },
  demoBadgeText: {
    ...typography.small,
    color: colors.bgBlack,
  },
  title: {
    ...typography.h1,
    color: colors.fgWhite,
    marginBottom: spacing.xl,
    textAlign: "center",
  },
  summaryCard: {
    padding: spacing.lg,
    borderRadius: 24,
    backgroundColor: colors.gray700,
    marginBottom: spacing.xl,
  },
  summaryLabel: {
    ...typography.small,
    color: colors.fgWhite,
    marginBottom: spacing.sm,
  },
  summaryValue: {
    ...typography.h2,
    color: colors.fgWhite,
    marginBottom: spacing.lg,
  },
  tierRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  tierItem: {
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.small,
    color: colors.fgWhite,
  },
  disabledButton: {
    minHeight: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: colors.gray700,
    marginBottom: spacing.md,
    opacity: 0.5,
  },
  disabledButtonText: {
    ...typography.small,
    color: colors.fgWhite,
  },
  secondaryButton: {
    minHeight: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.fgWhite,
    marginBottom: spacing.md,
  },
  secondaryText: {
    ...typography.small,
    color: colors.fgWhite,
  },
  primaryButton: {
    minHeight: 72,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: colors.emergencyRed,
  },
  primaryText: {
    ...typography.small,
    color: colors.fgWhite,
  },
  buttonPressed: {
    opacity: 0.88,
  },
});
