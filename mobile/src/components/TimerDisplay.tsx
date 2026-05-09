import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { formatTime } from "@/utils/formatTime";

export type TimerDisplayProps = {
  seconds: number | null;
  label: string;
  warning?: boolean;
};

export default function TimerDisplay({
  seconds,
  label,
  warning = false,
}: TimerDisplayProps): JSX.Element {
  return (
    <View accessibilityLiveRegion="polite" style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.time, warning ? styles.warning : null]}>
        {formatTime(seconds)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: spacing.xs,
  },
  label: {
    ...typography.small,
    color: colors.gray500,
    textTransform: "uppercase",
  },
  time: {
    ...typography.h1,
    color: colors.fgWhite,
  },
  warning: {
    color: colors.warningAmber,
  },
});
