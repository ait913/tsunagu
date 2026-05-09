import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { RootStackParamList } from "@/navigation/types";
import { handoff as handoffRequest } from "@/services/api/rescue";
import { useSosStore } from "@/stores/sosStore";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { handoff as handoffHaptic } from "@/utils/haptics";

type Props = NativeStackScreenProps<RootStackParamList, "Handoff">;

export default function HandoffScreen({
  navigation,
  route,
}: Props): JSX.Element {
  const { sessionId, toUserId, kind } = route.params;
  const currentSosId = useSosStore((state) => state.currentSosId);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const title = useMemo(() => {
    switch (kind) {
      case "RESPONDER_TO_RESPONDER":
        return "引き継ぎますか";
      case "AED_DELIVERED":
        return "AEDを渡しますか";
      case "TO_EMS":
        return "救急隊へ引き継ぎますか";
    }
  }, [kind]);

  const handleConfirm = async () => {
    if (submitting) {
      return;
    }

    setSubmitting(true);

    try {
      await handoffRequest(sessionId, {
        kind,
        toUserId,
        note: note.trim() || undefined,
      });
      void handoffHaptic();

      if (kind === "RESPONDER_TO_RESPONDER" && currentSosId) {
        navigation.replace("RescueModeFinder", {
          sosId: currentSosId,
          sessionId,
        });
        return;
      }

      if (kind === "AED_DELIVERED") {
        navigation.replace("AedGuide", { sessionId });
        return;
      }

      if (kind === "TO_EMS") {
        navigation.replace("End", { sessionId });
        return;
      }

      navigation.goBack();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        <Text style={styles.description}>必要なら引き継ぎメモを残してください。</Text>
        <TextInput
          accessibilityHint="任意の引き継ぎメモを入力します"
          accessibilityLabel="引き継ぎメモ"
          multiline
          onChangeText={setNote}
          placeholder="メモ"
          placeholderTextColor={colors.gray500}
          style={styles.input}
          value={note}
        />
        <Pressable
          accessibilityHint="引き継ぎを確定します"
          accessibilityLabel="引き継ぐ"
          accessibilityRole="button"
          disabled={submitting}
          onPress={() => {
            void handleConfirm();
          }}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed ? styles.buttonPressed : null,
          ]}
        >
          <Text style={styles.primaryText}>引き継ぐ</Text>
        </Pressable>
        <Pressable
          accessibilityHint="現在の作業を続けます"
          accessibilityLabel="続ける"
          accessibilityRole="button"
          onPress={navigation.goBack}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed ? styles.buttonPressed : null,
          ]}
        >
          <Text style={styles.secondaryText}>続ける</Text>
        </Pressable>
      </View>
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
  card: {
    width: "100%",
    borderRadius: 24,
    padding: spacing.lg,
    backgroundColor: colors.gray700,
  },
  title: {
    ...typography.h2,
    color: colors.fgWhite,
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.small,
    color: colors.fgWhite,
    marginBottom: spacing.md,
  },
  input: {
    ...typography.small,
    minHeight: 120,
    color: colors.fgWhite,
    borderWidth: 1,
    borderColor: colors.gray500,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    textAlignVertical: "top",
  },
  primaryButton: {
    minHeight: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: colors.emergencyRed,
    marginBottom: spacing.md,
  },
  primaryText: {
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
  },
  secondaryText: {
    ...typography.small,
    color: colors.fgWhite,
  },
  buttonPressed: {
    opacity: 0.88,
  },
});
