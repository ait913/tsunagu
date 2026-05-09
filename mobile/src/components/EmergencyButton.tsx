import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";

export type EmergencyButtonProps = {
  label?: string;
};

export default function EmergencyButton({
  label = "EmergencyButton",
}: EmergencyButtonProps): JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minWidth: 88,
    minHeight: 88,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 44,
    backgroundColor: colors.emergencyRed,
  },
  text: {
    ...typography.small,
    color: colors.fgWhite,
  },
});
