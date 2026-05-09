import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";

export type ActionSlideButtonProps = {
  label: string;
};

export default function ActionSlideButton({
  label,
}: ActionSlideButtonProps): JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 80,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    borderRadius: 40,
    backgroundColor: colors.emergencyRed,
  },
  text: {
    ...typography.small,
    color: colors.fgWhite,
  },
});
