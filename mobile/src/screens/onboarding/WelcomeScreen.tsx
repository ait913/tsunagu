import React from "react";
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { RootStackParamList } from "@/navigation/types";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";

type Props = NativeStackScreenProps<RootStackParamList, "Welcome">;

export default function WelcomeScreen({
  navigation,
}: Props): JSX.Element {
  return (
    <SafeAreaView style={styles.container}>
      <View
        accessibilityLabel="Tsunagu。目の前の命を、つなぐ"
        accessible
        style={styles.content}
      >
        <Text accessibilityLabel="Tsunagu" style={styles.title}>
          Tsunagu
        </Text>
        <Text accessibilityLabel="目の前の命を、つなぐ" style={styles.subtitle}>
          目の前の命を、つなぐ
        </Text>
      </View>
      <Pressable
        accessibilityHint="規約同意画面へ進みます"
        accessibilityLabel="はじめる"
        accessibilityRole="button"
        onPress={() => navigation.navigate("Agree")}
        style={styles.button}
      >
        <Text style={styles.buttonText}>はじめる</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    backgroundColor: colors.bgBlack,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  title: {
    ...typography.h1,
    color: colors.fgWhite,
  },
  subtitle: {
    ...typography.body,
    color: colors.fgWhite,
    textAlign: "center",
  },
  button: {
    minHeight: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: colors.emergencyRed,
  },
  buttonText: {
    ...typography.body,
    color: colors.fgWhite,
  },
});
