import React, { useMemo, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { RootStackParamList } from "@/navigation/types";
import { useAuthStore } from "@/stores/authStore";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";

type Props = NativeStackScreenProps<RootStackParamList, "Agree">;

export default function AgreeScreen({ navigation }: Props): JSX.Element {
  const setAgreedTermsVersion = useAuthStore(
    (state) => state.setAgreedTermsVersion
  );
  const [agreed, setAgreed] = useState(false);

  const paragraphs = useMemo(
    () => [
      "Tsunagu は救助行動を補助するためのアプリです。119番通報や AED の現場指示を代替するものではありません。",
      "緊急時は周囲の安全を確認し、救急隊や AED 音声案内の指示を優先してください。医療判断は利用者自身が行います。",
      "位置情報や通知は救助要請と応答のために利用されます。要請終了後は継続共有を行いません。",
      "本アプリの利用により発生する結果について、運営は法令上許される範囲で責任を限定します。内容を理解し同意してください。",
    ],
    []
  );

  const toggleAgree = (): void => {
    setAgreed((current) => {
      const next = !current;

      setAgreedTermsVersion(next ? 1 : null);
      return next;
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text accessibilityLabel="利用規約と免責事項" style={styles.title}>
        利用規約と免責事項
      </Text>
      <ScrollView
        accessibilityLabel="利用規約本文"
        contentContainerStyle={styles.scrollContent}
        style={styles.scroll}
      >
        {paragraphs.map((paragraph, index) => (
          <Text key={index} style={styles.paragraph}>
            {paragraph}
          </Text>
        ))}
      </ScrollView>
      <Pressable
        accessibilityLabel="上記に同意する"
        accessibilityRole="checkbox"
        accessibilityState={{ checked: agreed }}
        onPress={toggleAgree}
        style={styles.checkboxRow}
      >
        <View style={[styles.checkbox, agreed ? styles.checkboxChecked : null]}>
          {agreed ? <Text style={styles.checkboxMark}>✓</Text> : null}
        </View>
        <Text style={styles.checkboxLabel}>上記に同意する</Text>
      </Pressable>
      <Pressable
        accessibilityHint="役割選択画面へ進みます"
        accessibilityLabel="同意して次へ"
        accessibilityRole="button"
        disabled={!agreed}
        onPress={() => navigation.navigate("RoleSelect")}
        style={[styles.button, !agreed ? styles.buttonDisabled : null]}
      >
        <Text style={styles.buttonText}>同意して次へ</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: colors.bgBlack,
  },
  title: {
    ...typography.h2,
    color: colors.fgWhite,
    marginBottom: spacing.md,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  paragraph: {
    ...typography.small,
    color: colors.fgWhite,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  checkbox: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.fgWhite,
    borderRadius: 6,
  },
  checkboxChecked: {
    backgroundColor: colors.emergencyRed,
    borderColor: colors.emergencyRed,
  },
  checkboxMark: {
    ...typography.small,
    color: colors.fgWhite,
    lineHeight: 20,
  },
  checkboxLabel: {
    ...typography.small,
    color: colors.fgWhite,
    flex: 1,
  },
  button: {
    minHeight: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: colors.emergencyRed,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    ...typography.body,
    color: colors.fgWhite,
  },
});
