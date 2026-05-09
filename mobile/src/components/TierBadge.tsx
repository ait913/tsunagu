import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";

export type TierBadgeProps = {
  tier: string;
};

export default function TierBadge({ tier }: TierBadgeProps): JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{tier}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.infoBlue,
  },
  text: {
    ...typography.small,
    color: colors.fgWhite,
  },
});
