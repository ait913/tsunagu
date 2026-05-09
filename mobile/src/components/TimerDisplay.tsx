import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";

export type TimerDisplayProps = {
  value: string;
};

export default function TimerDisplay({
  value,
}: TimerDisplayProps): JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: colors.gray700,
  },
  text: {
    ...typography.h2,
    color: colors.fgWhite,
  },
});
