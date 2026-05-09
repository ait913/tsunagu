import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";
import type { Tier } from "@/types/api";

const tierMap: Record<Exclude<Tier, never>, { label: string; color: string }> = {
  TIER1: { label: "医療従事者", color: "#7C3AED" },
  TIER2: { label: "医療系学生", color: "#2563EB" },
  TIER3: { label: "AED運搬役", color: "#16A34A" },
};

const sizeStyles = {
  sm: { paddingHorizontal: 8, paddingVertical: 4 },
  md: { paddingHorizontal: 12, paddingVertical: 8 },
  lg: { paddingHorizontal: 16, paddingVertical: 12 },
} as const;

export type TierBadgeProps = {
  tier: Tier | null;
  size?: "sm" | "md" | "lg";
};

export default function TierBadge({
  tier,
  size = "md",
}: TierBadgeProps): JSX.Element {
  const backgroundColor = tier ? tierMap[tier].color : colors.gray500;
  const label = tier ? tierMap[tier].label : "未認定";

  return (
    <View style={[styles.container, sizeStyles[size], { backgroundColor }]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "flex-start",
    borderRadius: 6,
  },
  text: {
    ...typography.small,
    color: colors.fgWhite,
  },
});
