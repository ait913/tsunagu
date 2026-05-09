import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { RootStackParamList } from "@/navigation/types";
import { respond } from "@/services/api/rescue";
import { getCurrent } from "@/services/location/tracker";
import { useRescueStore } from "@/stores/rescueStore";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";

type Props = NativeStackScreenProps<RootStackParamList, "NotificationAed">;

function translateSymptom(symptom: string): string {
  return symptom === "NO_BREATHING" ? "心停止" : symptom;
}

export default function NotificationAedScreen({
  navigation,
  route,
}: Props): JSX.Element {
  const { sessionId, distanceM, symptom, targetLat, targetLng, aedHint } = route.params;
  const [loading, setLoading] = useState(false);
  const distanceText = useMemo(
    () => `${Math.round(distanceM)}m先で${translateSymptom(symptom)}`,
    [distanceM, symptom]
  );

  const handleAccept = async () => {
    setLoading(true);

    try {
      const location = await getCurrent();
      const response = await respond(sessionId, {
        role: "AED_CARRIER",
        decision: "ACCEPT_WITH_AED",
        lat: location.lat,
        lng: location.lng,
      });

      useRescueStore.setState({
        sessionId,
        selfResponderId: response.responder.id,
      });

      navigation.replace("NavAed", {
        sessionId,
        aed: aedHint,
        targetLat,
        targetLng,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        AED運搬要請
      </Text>
      <Text style={styles.summary}>{distanceText}</Text>
      <Text style={styles.detail}>
        {aedHint.name} ({Math.round(aedHint.distanceFromYouM)}m)
      </Text>
      <Pressable
        accessibilityLabel="AED持って向かう"
        accessibilityRole="button"
        disabled={loading}
        onPress={() => {
          void handleAccept();
        }}
        style={({ pressed }) => [
          styles.primaryButton,
          pressed ? styles.buttonPressed : null,
        ]}
      >
        <Text style={styles.primaryText}>AED持って向かう</Text>
      </Pressable>
      <Pressable
        accessibilityLabel="無理"
        accessibilityRole="button"
        disabled={loading}
        onPress={() => {
          navigation.replace("Abandon", { peerCount: 0 });
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
  primaryText: {
    ...typography.body,
    color: colors.fgWhite,
  },
  ghostButton: {
    minHeight: 88,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.gray500,
  },
  ghostText: {
    ...typography.body,
    color: colors.fgWhite,
  },
  buttonPressed: {
    opacity: 0.88,
  },
});
