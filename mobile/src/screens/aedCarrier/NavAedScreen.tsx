import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { RootStackParamList } from "@/navigation/types";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";

type Props = NativeStackScreenProps<RootStackParamList, "NavAed">;

export default function NavAedScreen(_: Props): JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>NavAedScreen</Text>
      <Text style={styles.description}>AED運搬ルートを示す画面プレースホルダです。</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: colors.bgBlack,
  },
  title: {
    ...typography.h2,
    color: colors.fgWhite,
    marginBottom: 12,
  },
  description: {
    ...typography.small,
    color: colors.fgWhite,
    textAlign: "center",
  },
});
