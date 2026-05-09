import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";

export type MetronomeViewProps = {
  bpm?: number;
};

export default function MetronomeView({
  bpm = 100,
}: MetronomeViewProps): JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Metronome {bpm} BPM</Text>
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
    ...typography.small,
    color: colors.fgWhite,
  },
});
