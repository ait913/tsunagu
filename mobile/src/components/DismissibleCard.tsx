import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";

export type DismissibleCardProps = {
  title: string;
};

export default function DismissibleCard({
  title,
}: DismissibleCardProps): JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.gray700,
  },
  text: {
    ...typography.small,
    color: colors.fgWhite,
  },
});
