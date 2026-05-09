import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import type { Symptom } from "@/types/api";

const symptomEmoji: Record<Symptom, string> = {
  NO_BREATHING: "🫁",
  NO_CONSCIOUSNESS: "💤",
  BLEEDING: "🩸",
  OTHER: "❓",
};

export type SymptomIconProps = {
  symptom: Symptom;
  selected: boolean;
  onPress: () => void;
  label: string;
};

export default function SymptomIcon({
  symptom,
  selected,
  onPress,
  label,
}: SymptomIconProps): JSX.Element {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.container, selected ? styles.containerSelected : null]}
    >
      <View style={styles.iconBox}>
        <Text style={styles.emoji}>{symptomEmoji[symptom]}</Text>
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    minWidth: 96,
    minHeight: 96,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.gray500,
    borderRadius: 20,
    backgroundColor: colors.bgBlack,
  },
  containerSelected: {
    borderWidth: 4,
    borderColor: colors.emergencyRed,
    backgroundColor: colors.gray700,
  },
  iconBox: {
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: {
    fontSize: 40,
  },
  label: {
    ...typography.body,
    color: colors.fgWhite,
    textAlign: "center",
  },
});
