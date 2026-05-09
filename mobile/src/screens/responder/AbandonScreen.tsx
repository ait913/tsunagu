import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { RootStackParamList } from "@/navigation/types";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";

type Props = NativeStackScreenProps<RootStackParamList, "Abandon">;

export default function AbandonScreen({
  navigation,
  route,
}: Props): JSX.Element {
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        お疲れ様でした
      </Text>
      <Text style={styles.description}>あなたの判断は正しい行動です</Text>
      <Text style={styles.description}>
        他の救助者が向かっています ({route.params.peerCount} 人)
      </Text>
      <Pressable
        accessibilityLabel="閉じる"
        accessibilityRole="button"
        onPress={() => {
          navigation.reset({ routes: [{ name: "Home" }] });
        }}
        style={({ pressed }) => [
          styles.button,
          pressed ? styles.buttonPressed : null,
        ]}
      >
        <Text style={styles.buttonText}>閉じる</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    backgroundColor: colors.bgBlack,
  },
  title: {
    ...typography.h1,
    color: colors.fgWhite,
    marginBottom: spacing.lg,
  },
  description: {
    ...typography.body,
    color: colors.fgWhite,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  button: {
    minWidth: 220,
    minHeight: 72,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: colors.emergencyRed,
    marginTop: spacing.xl,
  },
  buttonText: {
    ...typography.small,
    color: colors.fgWhite,
  },
  buttonPressed: {
    opacity: 0.88,
  },
});
