import React, { useState } from "react";
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
import * as ImagePicker from "expo-image-picker";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import DismissibleCard from "@/components/DismissibleCard";
import { RootStackParamList } from "@/navigation/types";
import { ApiError } from "@/services/api/client";
import * as tierApi from "@/services/api/tier";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import type { Tier } from "@/types/api";

type Props = NativeStackScreenProps<RootStackParamList, "TierRegistration">;

const tierOptions: Array<{ value: Tier; label: string }> = [
  { value: "TIER1", label: "TIER1 医療従事者" },
  { value: "TIER2", label: "TIER2 医療系学生" },
  { value: "TIER3", label: "TIER3 AED運搬役" },
];

export default function TierRegistrationScreen({
  navigation,
}: Props): JSX.Element {
  const [requestedTier, setRequestedTier] = useState<Tier>("TIER1");
  const [note, setNote] = useState("");
  const [documents, setDocuments] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successVisible, setSuccessVisible] = useState(false);

  const pickDocuments = async (): Promise<void> => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      selectionLimit: 5,
    });

    if (result.canceled) {
      return;
    }

    const nextDocuments = [...documents, ...result.assets].slice(0, 5);

    if (documents.length + result.assets.length > 5) {
      setErrorMessage("書類アップロードは最大5枚までです");
    } else {
      setErrorMessage(null);
    }

    setDocuments(nextDocuments);
  };

  const removeDocument = (uri: string): void => {
    setDocuments((current) => current.filter((document) => document.uri !== uri));
  };

  const handleSubmit = async (): Promise<void> => {
    setSubmitting(true);
    setErrorMessage(null);

    try {
      await tierApi.apply({
        requestedTier,
        note: note.trim(),
        documents: documents.map((document, index) => ({
          uri: document.uri,
          name: document.fileName ?? `document-${index + 1}.jpg`,
          type: document.mimeType ?? "image/jpeg",
        })),
      });

      setSuccessVisible(true);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "申請に失敗しました"
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
        <Text style={styles.title}>Tier 登録/再申請</Text>
        {errorMessage ? (
          <DismissibleCard
            body={errorMessage}
            onDismiss={() => setErrorMessage(null)}
            title="申請エラー"
          />
        ) : null}

        <View accessible accessibilityLabel="申請Tier選択" style={styles.section}>
          <Text style={styles.sectionTitle}>申請する Tier</Text>
          {tierOptions.map((option) => {
            const active = requestedTier === option.value;

            return (
              <Pressable
                accessibilityLabel={option.label}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                key={option.value}
                onPress={() => setRequestedTier(option.value)}
                style={[styles.radioRow, active ? styles.radioRowActive : null]}
              >
                <View style={[styles.radioOuter, active ? styles.radioOuterActive : null]}>
                  {active ? <View style={styles.radioInner} /> : null}
                </View>
                <Text style={styles.radioLabel}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>補足メモ</Text>
          <TextInput
            accessibilityLabel="補足メモ"
            multiline
            onChangeText={setNote}
            placeholder="資格や所属の補足を入力"
            placeholderTextColor={colors.gray500}
            style={styles.textArea}
            textAlignVertical="top"
            value={note}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>書類アップロード</Text>
          <Pressable
            accessibilityLabel="書類を追加"
            accessibilityRole="button"
            onPress={() => {
              void pickDocuments();
            }}
            style={styles.uploadButton}
          >
            <Text style={styles.uploadButtonText}>書類を選ぶ</Text>
          </Pressable>
          {documents.map((document, index) => (
            <View
              accessibilityLabel={`書類 ${index + 1}`}
              accessible
              key={document.uri}
              style={styles.documentRow}
            >
              <Text numberOfLines={1} style={styles.documentName}>
                {document.fileName ?? `書類 ${index + 1}`}
              </Text>
              <Pressable
                accessibilityLabel={`書類 ${index + 1} を削除`}
                accessibilityRole="button"
                onPress={() => removeDocument(document.uri)}
              >
                <Text style={styles.removeText}>削除</Text>
              </Pressable>
            </View>
          ))}
        </View>
      </ScrollView>
      <Pressable
        accessibilityLabel="申請を送信"
        accessibilityRole="button"
        disabled={submitting}
        onPress={() => {
          void handleSubmit();
        }}
        style={[styles.submitButton, submitting ? styles.submitButtonDisabled : null]}
      >
        {submitting ? (
          <ActivityIndicator color={colors.fgWhite} />
        ) : (
          <Text style={styles.submitButtonText}>申請を送信</Text>
        )}
      </Pressable>
      <Modal transparent visible={successVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>審査中です</Text>
            <Text style={styles.modalBody}>
              申請を受け付けました。確認が完了するまでしばらくお待ちください。
            </Text>
            <Pressable
              accessibilityLabel="ホームへ戻る"
              accessibilityRole="button"
              onPress={() => {
                setSuccessVisible(false);
                navigation.replace("Home");
              }}
              style={styles.submitButton}
            >
              <Text style={styles.submitButtonText}>ホームへ</Text>
            </Pressable>
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
  section: {
    gap: spacing.sm,
    borderRadius: 16,
    padding: spacing.md,
    backgroundColor: colors.gray700,
  },
  sectionTitle: {
    ...typography.small,
    color: colors.gray500,
  },
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gray500,
    borderRadius: 12,
    padding: spacing.md,
  },
  radioRowActive: {
    borderColor: colors.infoBlue,
    backgroundColor: colors.bgBlack,
  },
  radioOuter: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.gray500,
    borderRadius: 12,
  },
  radioOuterActive: {
    borderColor: colors.infoBlue,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.infoBlue,
  },
  radioLabel: {
    ...typography.small,
    color: colors.fgWhite,
    flex: 1,
  },
  textArea: {
    ...typography.small,
    minHeight: 140,
    color: colors.fgWhite,
    borderWidth: 1,
    borderColor: colors.gray500,
    borderRadius: 12,
    padding: spacing.md,
    backgroundColor: colors.bgBlack,
  },
  uploadButton: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.fgWhite,
  },
  uploadButtonText: {
    ...typography.small,
    color: colors.fgWhite,
  },
  documentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    borderRadius: 12,
    padding: spacing.sm,
    backgroundColor: colors.bgBlack,
  },
  documentName: {
    ...typography.small,
    color: colors.fgWhite,
    flex: 1,
  },
  removeText: {
    ...typography.small,
    color: colors.warningAmber,
  },
  submitButton: {
    minHeight: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: colors.emergencyRed,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    ...typography.body,
    color: colors.fgWhite,
  },
  modalOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalCard: {
    width: "100%",
    borderRadius: 20,
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.gray700,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.fgWhite,
  },
  modalBody: {
    ...typography.small,
    color: colors.fgWhite,
  },
});
