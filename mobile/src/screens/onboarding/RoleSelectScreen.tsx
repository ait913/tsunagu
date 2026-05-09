import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import DismissibleCard from "@/components/DismissibleCard";
import { RootStackParamList } from "@/navigation/types";
import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/services/api/client";
import { useAuthStore } from "@/stores/authStore";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";

type Props = NativeStackScreenProps<RootStackParamList, "RoleSelect">;
type RoleOption = "FINDER_ONLY" | "RESPONDER_TOO";

const roleCards: Array<{
  value: RoleOption;
  title: string;
  body: string;
}> = [
  {
    value: "FINDER_ONLY",
    title: "発見者だけで使う",
    body: "緊急時の SOS と CPR ガイドだけを使います。",
  },
  {
    value: "RESPONDER_TOO",
    title: "救助者としても登録",
    body: "通知を受けて現場支援や AED 運搬にも参加します。",
  },
];

export default function RoleSelectScreen({
  navigation,
}: Props): JSX.Element {
  const { register } = useAuth();
  const setFinderOnlyMode = useAuthStore((state) => state.setFinderOnlyMode);
  const agreedTermsVersion = useAuthStore(
    (state) => state.agreedTermsVersion
  );
  const [selected, setSelected] = useState<RoleOption | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canSubmit = useMemo(
    () =>
      Boolean(selected) &&
      email.trim().length > 0 &&
      password.trim().length > 0 &&
      displayName.trim().length > 0,
    [displayName, email, password, selected]
  );

  const handleRegister = async (): Promise<void> => {
    if (!selected || !canSubmit) {
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      await register({
        email: email.trim(),
        password: password.trim(),
        displayName: displayName.trim(),
        agreedTermsVersion: agreedTermsVersion ?? 1,
      });

      if (selected === "FINDER_ONLY") {
        setFinderOnlyMode(true);
        navigation.replace("Permission");
        return;
      }

      setFinderOnlyMode(false);
      navigation.replace("TierRegistration");
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "登録に失敗しました"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text accessibilityLabel="利用モードを選択" style={styles.title}>
          利用モードを選択
        </Text>
        <Text style={styles.subtitle}>
          緊急時に自分だけ使うか、救助者としても参加するかを選びます。
        </Text>
        {errorMessage ? (
          <DismissibleCard
            body={errorMessage}
            onDismiss={() => setErrorMessage(null)}
            title="登録エラー"
          />
        ) : null}
        {roleCards.map((card) => {
          const active = selected === card.value;

          return (
            <Pressable
              accessibilityHint={`${card.title}を選択します`}
              accessibilityLabel={card.title}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              key={card.value}
              onPress={() => setSelected(card.value)}
              style={[styles.card, active ? styles.cardSelected : null]}
            >
              <Text style={styles.cardTitle}>{card.title}</Text>
              <Text style={styles.cardBody}>{card.body}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Pressable
        accessibilityHint="簡易登録フォームを開きます"
        accessibilityLabel="次へ"
        accessibilityRole="button"
        disabled={!selected}
        onPress={() => setModalVisible(true)}
        style={[styles.button, !selected ? styles.buttonDisabled : null]}
      >
        <Text style={styles.buttonText}>次へ</Text>
      </Pressable>
      <Modal
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
        transparent
        visible={modalVisible}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>簡易登録</Text>
            <TextInput
              accessibilityLabel="メールアドレス"
              autoCapitalize="none"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="メールアドレス"
              placeholderTextColor={colors.gray500}
              style={styles.input}
              value={email}
            />
            <TextInput
              accessibilityLabel="パスワード"
              autoCapitalize="none"
              onChangeText={setPassword}
              placeholder="パスワード"
              placeholderTextColor={colors.gray500}
              secureTextEntry
              style={styles.input}
              value={password}
            />
            <TextInput
              accessibilityLabel="表示名"
              onChangeText={setDisplayName}
              placeholder="表示名"
              placeholderTextColor={colors.gray500}
              style={styles.input}
              value={displayName}
            />
            <View style={styles.modalActions}>
              <Pressable
                accessibilityLabel="閉じる"
                accessibilityRole="button"
                onPress={() => setModalVisible(false)}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>閉じる</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="登録する"
                accessibilityRole="button"
                disabled={!canSubmit || submitting}
                onPress={() => {
                  void handleRegister();
                }}
                style={[
                  styles.button,
                  styles.modalPrimaryButton,
                  !canSubmit || submitting ? styles.buttonDisabled : null,
                ]}
              >
                {submitting ? (
                  <ActivityIndicator color={colors.fgWhite} />
                ) : (
                  <Text style={styles.buttonText}>登録する</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: colors.bgBlack,
  },
  content: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  title: {
    ...typography.h2,
    color: colors.fgWhite,
  },
  subtitle: {
    ...typography.small,
    color: colors.fgWhite,
  },
  card: {
    borderWidth: 2,
    borderColor: colors.gray700,
    borderRadius: 16,
    padding: spacing.lg,
    backgroundColor: colors.bgBlack,
  },
  cardSelected: {
    borderColor: colors.emergencyRed,
    backgroundColor: colors.gray700,
  },
  cardTitle: {
    ...typography.body,
    color: colors.fgWhite,
    marginBottom: spacing.sm,
  },
  cardBody: {
    ...typography.small,
    color: colors.fgWhite,
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
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.gray700,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.fgWhite,
  },
  input: {
    ...typography.small,
    color: colors.fgWhite,
    borderWidth: 1,
    borderColor: colors.gray500,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.bgBlack,
  },
  modalActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 64,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.fgWhite,
    borderRadius: 12,
  },
  secondaryButtonText: {
    ...typography.small,
    color: colors.fgWhite,
  },
  modalPrimaryButton: {
    flex: 1,
  },
});
