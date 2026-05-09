import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";

export type DismissibleCardProps = {
  title: string;
  body: string;
  onDismiss: () => void;
};

export default function DismissibleCard({
  title,
  body,
  onDismiss,
}: DismissibleCardProps): JSX.Element {
  return (
    <View
      accessibilityLabel={`${title}, ${body}`}
      accessible
      style={styles.container}
    >
      <Pressable
        accessibilityHint="このカードを閉じます"
        accessibilityLabel="閉じる"
        accessibilityRole="button"
        onPress={onDismiss}
        style={styles.closeButton}
      >
        <Text style={styles.closeText}>✕</Text>
      </Pressable>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: spacing.md,
    paddingRight: 48,
    backgroundColor: colors.gray700,
  },
  closeButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    ...typography.small,
    color: colors.fgWhite,
  },
  title: {
    ...typography.body,
    color: colors.fgWhite,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  body: {
    ...typography.small,
    color: colors.fgWhite,
  },
});
