import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { RootStackParamList } from "@/navigation/types";
import { handoff } from "@/services/api/rescue";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";

type Props = NativeStackScreenProps<RootStackParamList, "AedPick">;

export default function AedPickScreen({
  navigation,
  route,
}: Props): JSX.Element {
  const { sessionId, aed } = route.params;
  const [delivered, setDelivered] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleDelivered = async () => {
    if (submitting) {
      return;
    }

    setSubmitting(true);

    try {
      await handoff(sessionId, {
        kind: "AED_DELIVERED",
        note: aed.name,
      });
      setDelivered(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        AED を渡してください
      </Text>
      <Text style={styles.description}>{aed.name}</Text>
      {!delivered ? (
        <Pressable
          accessibilityLabel="渡しました"
          accessibilityRole="button"
          disabled={submitting}
          onPress={() => {
            void handleDelivered();
          }}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed ? styles.buttonPressed : null,
          ]}
        >
          <Text style={styles.primaryText}>渡しました</Text>
        </Pressable>
      ) : (
        <>
          <Pressable
            accessibilityLabel="残る"
            accessibilityRole="button"
            onPress={() => {
              navigation.replace("RescueModeResponder", { sessionId });
            }}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <Text style={styles.primaryText}>残る (RM-R)</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="離れる"
            accessibilityRole="button"
            onPress={() => {
              navigation.replace("End", { sessionId });
            }}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <Text style={styles.secondaryText}>離れる</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    backgroundColor: colors.bgBlack,
  },
  title: {
    ...typography.h2,
    color: colors.fgWhite,
    marginBottom: spacing.md,
  },
  description: {
    ...typography.body,
    color: colors.fgWhite,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  primaryButton: {
    minWidth: 260,
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
  secondaryButton: {
    minWidth: 260,
    minHeight: 88,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.fgWhite,
  },
  secondaryText: {
    ...typography.body,
    color: colors.fgWhite,
  },
  buttonPressed: {
    opacity: 0.88,
  },
});
