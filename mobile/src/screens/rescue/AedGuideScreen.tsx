import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { RootStackParamList } from "@/navigation/types";
import { useSosStore } from "@/stores/sosStore";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";

type Props = NativeStackScreenProps<RootStackParamList, "AedGuide">;

const STEPS = [
  { title: "① 電源ボタンを押す", body: "AED の電源ボタンを押す" },
  { title: "② パッドを胸に貼る", body: "🟥 胸のパッド位置を確認して貼る" },
  {
    title: "③ 音声に従う",
    body: "AED の音声に従う、心電図解析中は離れる",
  },
  {
    title: "④ ショック後に再開",
    body: "ショック指示があればボタンを押す、CPR 再開",
  },
] as const;

export default function AedGuideScreen({
  navigation,
  route,
}: Props): JSX.Element {
  const { sessionId } = route.params;
  const currentSosId = useSosStore((state) => state.currentSosId);
  const [stepIndex, setStepIndex] = useState(0);

  const step = useMemo(() => STEPS[stepIndex], [stepIndex]);

  const completeGuide = () => {
    if (currentSosId) {
      navigation.replace("RescueModeFinder", {
        sosId: currentSosId,
        sessionId,
      });
      return;
    }

    navigation.goBack();
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (stepIndex === STEPS.length - 1) {
        completeGuide();
        return;
      }

      setStepIndex((current) => current + 1);
    }, 8_000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [stepIndex]);

  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.progress}>
        {step.title}
      </Text>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${((stepIndex + 1) / STEPS.length) * 100}%` },
          ]}
        />
      </View>
      <View style={styles.card}>
        <Text style={styles.stepBody}>{step.body}</Text>
      </View>
      <Text style={styles.footer}>AED の音声に従ってください</Text>
      <Pressable
        accessibilityHint="次の手順へ進みます"
        accessibilityLabel="次へ"
        accessibilityRole="button"
        onPress={() => {
          if (stepIndex === STEPS.length - 1) {
            completeGuide();
            return;
          }

          setStepIndex((current) => current + 1);
        }}
        style={({ pressed }) => [
          styles.button,
          pressed ? styles.buttonPressed : null,
        ]}
      >
        <Text style={styles.buttonText}>次へ</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    backgroundColor: colors.bgBlack,
  },
  progress: {
    ...typography.h2,
    color: colors.fgWhite,
    marginBottom: spacing.md,
  },
  progressBar: {
    height: 12,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: colors.gray700,
    marginBottom: spacing.xxl,
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: colors.emergencyRed,
  },
  card: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    borderRadius: 24,
    backgroundColor: colors.gray700,
  },
  stepBody: {
    ...typography.h2,
    color: colors.fgWhite,
    textAlign: "center",
  },
  footer: {
    ...typography.body,
    color: colors.fgWhite,
    textAlign: "center",
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  button: {
    minHeight: 72,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: colors.emergencyRed,
  },
  buttonText: {
    ...typography.small,
    color: colors.fgWhite,
  },
  buttonPressed: {
    opacity: 0.88,
  },
});
