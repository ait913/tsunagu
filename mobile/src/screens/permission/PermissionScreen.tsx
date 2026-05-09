import React, { useMemo, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { RootStackParamList } from "@/navigation/types";
import { useAppStore } from "@/stores/appStore";
import { useAuthStore } from "@/stores/authStore";
import { useNotificationStore } from "@/stores/notificationStore";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";

type Props = NativeStackScreenProps<RootStackParamList, "Permission">;

export default function PermissionScreen({
  navigation,
}: Props): JSX.Element {
  const permissions = useNotificationStore((state) => state.permissions);
  const ensurePermissions = useNotificationStore((state) => state.ensurePermissions);
  const setPermission = useNotificationStore((state) => state.setPermission);
  const completeOnboarding = useAppStore((state) => state.completeOnboarding);
  const setFinderOnlyMode = useAuthStore((state) => state.setFinderOnlyMode);
  const [showSettingsHint, setShowSettingsHint] = useState(false);

  const denied = useMemo(
    () =>
      permissions.location === "denied" || permissions.notification === "denied",
    [permissions.location, permissions.notification]
  );

  const finishOnboarding = (): void => {
    completeOnboarding();
    navigation.reset({
      index: 0,
      routes: [{ name: "Home" }],
    });
  };

  const handleAllow = async (): Promise<void> => {
    await ensurePermissions();

    const nextPermissions = useNotificationStore.getState().permissions;

    setPermission("location", nextPermissions.location);
    setPermission("notification", nextPermissions.notification);

    if (
      nextPermissions.location === "denied" ||
      nextPermissions.notification === "denied"
    ) {
      setShowSettingsHint(true);
      return;
    }

    finishOnboarding();
  };

  const handleSkip = (): void => {
    Alert.alert("確認", "救助者モードは使えませんが OK?", [
      { text: "戻る", style: "cancel" },
      {
        text: "OK",
        style: "destructive",
        onPress: () => {
          setFinderOnlyMode(true);
          finishOnboarding();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>権限を設定</Text>
        <Text style={styles.body}>
          位置情報と通知を許可すると、救助者通知と現場誘導を利用できます。
        </Text>
        <View style={styles.statusBox}>
          <Text style={styles.statusText}>
            位置情報: {permissions.location}
          </Text>
          <Text style={styles.statusText}>
            通知: {permissions.notification}
          </Text>
        </View>
        {showSettingsHint || denied ? (
          <View style={styles.hintBox}>
            <Text style={styles.hintTitle}>設定アプリで許可が必要です</Text>
            <Text style={styles.hintBody}>
              一度拒否した場合は、設定アプリから位置情報と通知を有効にしてください。
            </Text>
            <Pressable
              accessibilityLabel="設定アプリを開く"
              accessibilityRole="button"
              onPress={() => {
                void Linking.openSettings();
              }}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>設定アプリを開く</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
      <View style={styles.actions}>
        <Pressable
          accessibilityLabel="許可する"
          accessibilityRole="button"
          onPress={() => {
            void handleAllow();
          }}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>許可する</Text>
        </Pressable>
        <Pressable
          accessibilityHint="発見者モードのみで続行します"
          accessibilityLabel="スキップ"
          accessibilityRole="button"
          onPress={handleSkip}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>スキップ</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    padding: spacing.lg,
    backgroundColor: colors.bgBlack,
  },
  content: {
    gap: spacing.lg,
  },
  title: {
    ...typography.h2,
    color: colors.fgWhite,
  },
  body: {
    ...typography.small,
    color: colors.fgWhite,
  },
  statusBox: {
    borderRadius: 16,
    padding: spacing.md,
    backgroundColor: colors.gray700,
  },
  statusText: {
    ...typography.small,
    color: colors.fgWhite,
  },
  hintBox: {
    borderWidth: 1,
    borderColor: colors.warningAmber,
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.sm,
  },
  hintTitle: {
    ...typography.body,
    color: colors.warningAmber,
  },
  hintBody: {
    ...typography.small,
    color: colors.fgWhite,
  },
  actions: {
    gap: spacing.sm,
  },
  primaryButton: {
    minHeight: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: colors.emergencyRed,
  },
  primaryButtonText: {
    ...typography.body,
    color: colors.fgWhite,
  },
  secondaryButton: {
    minHeight: 56,
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
});
