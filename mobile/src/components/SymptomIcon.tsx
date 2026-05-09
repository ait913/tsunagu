import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";

export type SymptomIconProps = {
  label: string;
};

export default function SymptomIcon({
  label,
}: SymptomIconProps): JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minWidth: 120,
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.gray700,
  },
  text: {
    ...typography.small,
    color: colors.fgWhite,
    textAlign: "center",
  },
});
