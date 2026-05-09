import React from "react";
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import EmergencyButton from "@/components/EmergencyButton";
import TierBadge from "@/components/TierBadge";
import { RootStackParamList } from "@/navigation/types";
import { useAppStore } from "@/stores/appStore";
import { useAuthStore } from "@/stores/authStore";
import { useNotificationStore } from "@/stores/notificationStore";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export default function HomeScreen({ navigation }: Props): JSX.Element {
  const demoMode = useAppStore((state) => state.demoMode);
  const isOnline = useAppStore((state) => state.isOnline);
  const user = useAuthStore((state) => state.user);
  const permissions = useNotificationStore((state) => state.permissions);

  const handleSos = (): void => {
    if (permissions.location !== "granted") {
      navigation.navigate("Permission");
      return;
    }

    navigation.navigate("Countdown");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTextGroup}>
          <Text style={styles.greeting}>こんにちは</Text>
          <Text style={styles.name}>{user?.displayName ?? "ゲスト"}</Text>
        </View>
        <Pressable
          accessibilityHint="プロフィール画面を開きます"
          accessibilityLabel="設定"
          accessibilityRole="button"
          onPress={() => navigation.navigate("Profile")}
          style={styles.settingsButton}
        >
          <Text style={styles.settingsIcon}>⚙</Text>
        </Pressable>
      </View>
      <View style={styles.center}>
        <EmergencyButton
          demoMode={demoMode}
          onPress={handleSos}
        />
      </View>
      <View style={styles.footer}>
        {permissions.location !== "granted" ? (
          <View
            accessibilityLabel="位置情報の許可が必要です。位置情報を許可すると SOS の現場共有が使えます。"
            accessible
            style={styles.permissionBanner}
          >
            <Text style={styles.permissionBannerTitle}>
              位置情報の許可が必要です
            </Text>
            <Text style={styles.permissionBannerBody}>
              位置情報を許可すると SOS の現場共有が使えます。
            </Text>
          </View>
        ) : null}
        {!isOnline ? (
          <View accessible accessibilityLabel="オフライン。119コールのみ可能" style={styles.banner}>
            <Text style={styles.bannerText}>オフライン: 119コールのみ可能</Text>
          </View>
        ) : null}
        <View style={styles.tierRow}>
          <Text style={styles.sectionLabel}>現在の認定</Text>
          <TierBadge size="lg" tier={user?.currentTier ?? null} />
        </View>
        <Pressable
          accessibilityLabel="最寄AEDマップ"
          accessibilityRole="button"
          disabled
          style={styles.disabledButton}
        >
          <Text style={styles.disabledButtonText}>最寄AEDマップ (P1)</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: colors.bgBlack,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  headerTextGroup: {
    gap: spacing.xs,
  },
  greeting: {
    ...typography.small,
    color: colors.gray500,
  },
  name: {
    ...typography.h2,
    color: colors.fgWhite,
  },
  settingsButton: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 28,
    backgroundColor: colors.gray700,
  },
  settingsIcon: {
    ...typography.body,
    color: colors.fgWhite,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    gap: spacing.md,
  },
  permissionBanner: {
    borderRadius: 12,
    padding: spacing.md,
    backgroundColor: colors.gray700,
  },
  permissionBannerTitle: {
    ...typography.small,
    color: colors.fgWhite,
    marginBottom: spacing.xs,
  },
  permissionBannerBody: {
    ...typography.small,
    color: colors.gray500,
  },
  banner: {
    borderRadius: 12,
    padding: spacing.md,
    backgroundColor: colors.warningAmber,
  },
  bannerText: {
    ...typography.small,
    color: colors.bgBlack,
  },
  tierRow: {
    gap: spacing.sm,
  },
  sectionLabel: {
    ...typography.small,
    color: colors.gray500,
  },
  disabledButton: {
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.gray500,
    borderRadius: 12,
    opacity: 0.5,
  },
  disabledButtonText: {
    ...typography.small,
    color: colors.fgWhite,
  },
});
