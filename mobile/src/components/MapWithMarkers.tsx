import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";

export type MapWithMarkersProps = {
  markerCount?: number;
};

export default function MapWithMarkers({
  markerCount = 0,
}: MapWithMarkersProps): JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>MapWithMarkers ({markerCount})</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.gray700,
  },
  text: {
    ...typography.small,
    color: colors.fgWhite,
  },
});
