import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import ActionSlideButton from "@/components/ActionSlideButton";
import SymptomIcon from "@/components/SymptomIcon";
import type { RootStackParamList } from "@/navigation/types";
import { ApiError } from "@/services/api/client";
import { callEmergency } from "@/services/api/sos";
import { getCurrent } from "@/services/location/tracker";
import { useSosStore } from "@/stores/sosStore";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import type { Symptom } from "@/types/api";

type Props = NativeStackScreenProps<RootStackParamList, "Symptom">;

const SYMPTOMS: Array<{ key: Symptom; label: string }> = [
  { key: "NO_BREATHING", label: "呼吸なし" },
  { key: "NO_CONSCIOUSNESS", label: "意識なし" },
  { key: "BLEEDING", label: "出血" },
  { key: "OTHER", label: "その他" },
];

type ExistingSession = {
  sosId: string | null;
  sessionId: string | null;
};

function extractExistingSession(details: unknown): ExistingSession {
  if (!details || typeof details !== "object") {
    return { sosId: null, sessionId: null };
  }

  const record = details as Record<string, unknown>;
  const nested =
    (record.activeSos as Record<string, unknown> | undefined) ??
    (record.currentSos as Record<string, unknown> | undefined) ??
    (record.session as Record<string, unknown> | undefined) ??
    record;

  return {
    sosId:
      typeof nested.sosId === "string"
        ? nested.sosId
        : typeof nested.id === "string"
          ? nested.id
          : null,
    sessionId:
      typeof nested.sessionId === "string"
        ? nested.sessionId
        : typeof nested.rescueSessionId === "string"
          ? nested.rescueSessionId
          : null,
  };
}

export default function SymptomScreen({ navigation }: Props): JSX.Element {
  const startSos = useSosStore((state) => state.startSos);
  const setLocation = useSosStore((state) => state.setLocation);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [pendingSymptom, setPendingSymptom] = useState<Symptom | null>(null);
  const [address, setAddress] = useState("");
  const [selectedSymptom, setSelectedSymptom] = useState<Symptom | null>(null);

  const disabled = isSubmitting;

  const handleApiError = (error: unknown) => {
    if (!(error instanceof ApiError)) {
      Alert.alert("送信できません", "ネットワークを確認して再試行してください。");
      return;
    }

    if (error.status === 429 || error.code === "TOO_MANY_REQUESTS") {
      const existing = extractExistingSession(error.details);
      const fallback = useSosStore.getState();
      const sosId = existing.sosId ?? fallback.currentSosId;
      const sessionId = existing.sessionId ?? fallback.currentSessionId;

      if (sosId && sessionId) {
        navigation.replace("RescueModeFinder", { sosId, sessionId });
        return;
      }
    }

    if (error.status === 400 && address.trim().length > 0) {
      Alert.alert("119のみコール", "住所のみでは要請を確定できないため119へ接続します。");
      callEmergency();
      return;
    }

    Alert.alert("送信できません", error.message);
  };

  const submitSos = async (
    symptom: Symptom,
    input: {
      lat: number;
      lng: number;
      accuracyM?: number;
      locationLabel?: string;
    }
  ) => {
    setIsSubmitting(true);

    try {
      await startSos({
        symptom,
        lat: input.lat,
        lng: input.lng,
        accuracyM: input.accuracyM,
        locationLabel: input.locationLabel,
      });
      setLocation({
        lat: input.lat,
        lng: input.lng,
        accuracyM: input.accuracyM,
        label: input.locationLabel,
      });

      const state = useSosStore.getState();

      if (!state.currentSosId || !state.currentSessionId) {
        throw new Error("SOS session was not created");
      }

      navigation.replace("RescueModeFinder", {
        sosId: state.currentSosId,
        sessionId: state.currentSessionId,
      });
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSymptomPress = async (symptom: Symptom) => {
    if (disabled) {
      return;
    }

    setPendingSymptom(symptom);
    setSelectedSymptom(symptom);

    try {
      const location = await getCurrent();

      await submitSos(symptom, location);
    } catch {
      setAddressModalVisible(true);
      setIsSubmitting(false);
    }
  };

  const handleAddressSubmit = async () => {
    if (!pendingSymptom || address.trim().length === 0 || isSubmitting) {
      return;
    }

    setAddressModalVisible(false);
    await submitSos(pendingSymptom, {
      lat: 0,
      lng: 0,
      locationLabel: address.trim(),
    });
  };

  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        どんな状況ですか？
      </Text>
      <View style={styles.grid}>
        {SYMPTOMS.map((symptom) => (
          <View
            key={symptom.key}
            style={[
              styles.card,
              disabled ? styles.cardDisabled : null,
            ]}
          >
            <SymptomIcon
              label={symptom.label}
              onPress={() => {
                void handleSymptomPress(symptom.key);
              }}
              selected={selectedSymptom === symptom.key}
              symptom={symptom.key}
            />
          </View>
        ))}
      </View>

      <View style={styles.slideButtonWrap}>
        <ActionSlideButton label="119にスワイプ" onComplete={callEmergency} />
      </View>

      {isSubmitting ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.fgWhite} size="large" />
          <Text style={styles.loadingText}>要請を送信しています</Text>
        </View>
      ) : null}

      <Modal
        animationType="fade"
        transparent
        visible={addressModalVisible}
        onRequestClose={() => setAddressModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text accessibilityRole="header" style={styles.modalTitle}>
              住所を入力
            </Text>
            <Text style={styles.modalBody}>
              位置情報が取得できません。住所だけで送信します。
            </Text>
            <TextInput
              accessibilityHint="現場住所を入力します"
              accessibilityLabel="住所入力"
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setAddress}
              placeholder="例: 渋谷区..."
              placeholderTextColor={colors.gray500}
              style={styles.input}
              value={address}
            />
            <Pressable
              accessibilityHint="住所を送信して救助要請を続けます"
              accessibilityLabel="住所を送信"
              accessibilityRole="button"
              onPress={() => {
                void handleAddressSubmit();
              }}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed ? styles.buttonPressed : null,
              ]}
            >
              <Text style={styles.primaryButtonText}>送信</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + spacing.md,
    paddingBottom: spacing.xl,
    backgroundColor: colors.bgBlack,
  },
  title: {
    ...typography.h2,
    color: colors.fgWhite,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  grid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  card: {
    width: "47%",
  },
  cardDisabled: {
    opacity: 0.45,
  },
  slideButtonWrap: {
    marginTop: spacing.lg,
  },
  loading: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(10,10,10,0.72)",
  },
  loadingText: {
    ...typography.small,
    color: colors.fgWhite,
    marginTop: spacing.md,
  },
  modalBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    backgroundColor: "rgba(10,10,10,0.8)",
  },
  modalCard: {
    width: "100%",
    borderRadius: 24,
    padding: spacing.lg,
    backgroundColor: colors.gray700,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.fgWhite,
    marginBottom: spacing.sm,
  },
  modalBody: {
    ...typography.small,
    color: colors.fgWhite,
    marginBottom: spacing.lg,
  },
  input: {
    ...typography.small,
    color: colors.fgWhite,
    borderWidth: 1,
    borderColor: colors.gray500,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  primaryButton: {
    minHeight: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: colors.emergencyRed,
  },
  primaryButtonText: {
    ...typography.small,
    color: colors.fgWhite,
  },
  buttonPressed: {
    opacity: 0.88,
  },
});
