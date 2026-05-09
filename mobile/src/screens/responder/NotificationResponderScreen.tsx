import React, { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { RootStackParamList } from "@/navigation/types";
import { respond } from "@/services/api/rescue";
import { getCurrent } from "@/services/location/tracker";
import { useRescueStore } from "@/stores/rescueStore";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";

type Props = NativeStackScreenProps<
  RootStackParamList,
  "NotificationResponder"
>;

function translateSymptom(symptom: string): string {
  switch (symptom) {
    case "NO_BREATHING":
      return "呼吸なし";
    case "NO_CONSCIOUSNESS":
      return "意識なし";
    case "BLEEDING":
      return "出血";
    case "OTHER":
      return "その他";
    default:
      return symptom;
  }
}

export default function NotificationResponderScreen({
  navigation,
  route,
}: Props): JSX.Element {
  const { sessionId, distanceM, symptom, locationLabel } = route.params;
  const peerCount = useRescueStore((state) => state.responders.length);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const summary = useMemo(
    () => `${Math.round(distanceM)}m ・ ${translateSymptom(symptom)}`,
    [distanceM, symptom]
  );

  const handleAccept = async (decision: "ACCEPT_WITH_AED" | "ACCEPT_BAREHAND") => {
    setLoadingAction(decision);

    try {
      const location = await getCurrent();
      const response = await respond(sessionId, {
        role: "RESPONDER",
        decision,
        lat: location.lat,
        lng: location.lng,
      });

      useRescueStore.setState({
        sessionId,
        selfResponderId: response.responder.id,
      });

      if (!response.navigation) {
        Alert.alert("移動先がありません", "位置情報の再同期を待って再試行してください。");
        return;
      }

      navigation.replace("NavResponder", {
        sessionId,
        targetLat: response.navigation.targetLat,
        targetLng: response.navigation.targetLng,
        aed: decision === "ACCEPT_WITH_AED" ? response.navigation.aed ?? null : null,
      });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDecline = async () => {
    setLoadingAction("DECLINE");

    try {
      await respond(sessionId, {
        role: "RESPONDER",
        decision: "DECLINE",
      });
    } finally {
      setLoadingAction(null);
      navigation.replace("Abandon", { peerCount });
    }
  };

  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        緊急ヘルプ要請
      </Text>
      <Text style={styles.summary}>{summary}</Text>
      <Text style={styles.detail}>{locationLabel ?? "住所未設定"}</Text>
      <Pressable
        accessibilityLabel="向かう AEDも持つ"
        accessibilityRole="button"
        disabled={loadingAction !== null}
        onPress={() => {
          void handleAccept("ACCEPT_WITH_AED");
        }}
        style={({ pressed }) => [
          styles.primaryButton,
          pressed ? styles.buttonPressed : null,
        ]}
      >
        <Text style={styles.primaryText}>向かう (AEDも持つ)</Text>
      </Pressable>
      <Pressable
        accessibilityLabel="手ぶらで向かう"
        accessibilityRole="button"
        disabled={loadingAction !== null}
        onPress={() => {
          void handleAccept("ACCEPT_BAREHAND");
        }}
        style={({ pressed }) => [
          styles.secondaryButton,
          pressed ? styles.buttonPressed : null,
        ]}
      >
        <Text style={styles.secondaryText}>手ぶらで向かう</Text>
      </Pressable>
      <Pressable
        accessibilityLabel="無理"
        accessibilityRole="button"
        disabled={loadingAction !== null}
        onPress={() => {
          void handleDecline();
        }}
        style={({ pressed }) => [
          styles.ghostButton,
          pressed ? styles.buttonPressed : null,
        ]}
      >
        <Text style={styles.ghostText}>無理</Text>
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
  title: {
    ...typography.h1,
    color: colors.emergencyRed,
    marginBottom: spacing.lg,
  },
  summary: {
    ...typography.h2,
    color: colors.fgWhite,
    marginBottom: spacing.md,
  },
  detail: {
    ...typography.body,
    color: colors.fgWhite,
    marginBottom: spacing.xxl,
  },
  primaryButton: {
    minHeight: 88,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: colors.emergencyRed,
    marginBottom: spacing.md,
  },
  secondaryButton: {
    minHeight: 88,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: colors.infoBlue,
    marginBottom: spacing.md,
  },
  ghostButton: {
    minHeight: 88,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.gray500,
  },
  primaryText: {
    ...typography.body,
    color: colors.fgWhite,
  },
  secondaryText: {
    ...typography.body,
    color: colors.fgWhite,
  },
  ghostText: {
    ...typography.body,
    color: colors.fgWhite,
  },
  buttonPressed: {
    opacity: 0.88,
  },
});
