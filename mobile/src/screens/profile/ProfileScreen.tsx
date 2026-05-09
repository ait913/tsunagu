import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import TierBadge from "@/components/TierBadge";
import { useAuth } from "@/hooks/useAuth";
import { RootStackParamList } from "@/navigation/types";
import * as tierApi from "@/services/api/tier";
import type { TierAppStatus, TierStatusRes } from "@/types/api";
import { useAppStore } from "@/stores/appStore";
import { useAuthStore } from "@/stores/authStore";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";

type Props = NativeStackScreenProps<RootStackParamList, "Profile">;
type RadiusOption = 400 | 1000 | 5000;

const radiusOptions: RadiusOption[] = [400, 1000, 5000];

const statusLabelMap: Record<TierAppStatus, string> = {
  PENDING: "審査待ち",
  REVIEWING: "審査中",
  APPROVED: "承認済み",
  REJECTED: "差戻し",
};

export default function ProfileScreen({ navigation }: Props): JSX.Element {
  const { logout } = useAuth();
  const user = useAuthStore((state) => state.user);
  const demoMode = useAppStore((state) => state.demoMode);
  const toggleDemoMode = useAppStore((state) => state.toggleDemoMode);
  const [notificationOptIn, setNotificationOptIn] = useState(
    user?.notificationOptIn ?? true
  );
  const [radius, setRadius] = useState<RadiusOption>(400);
  const [tierStatus, setTierStatus] = useState<TierStatusRes | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    void tierApi
      .getStatus()
      .then((response) => {
        if (mounted) {
          setTierStatus(response);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const pendingLabel = useMemo(() => {
    const status = tierStatus?.pendingApplication?.status;

    return status ? statusLabelMap[status] : null;
  }, [tierStatus?.pendingApplication?.status]);

  const handleLogout = async (): Promise<void> => {
    await logout();
    navigation.reset({
      index: 0,
      routes: [{ name: "Welcome" }],
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View
          accessibilityLabel={`表示名 ${user?.displayName ?? "未登録"} メール ${user?.email ?? "未登録"}`}
          accessible
          style={styles.profileHeader}
        >
          <Text style={styles.name}>{user?.displayName ?? "未登録"}</Text>
          <Text style={styles.email}>{user?.email ?? "メール未登録"}</Text>
          <TierBadge size="lg" tier={user?.currentTier ?? null} />
          {loading ? (
            <ActivityIndicator color={colors.fgWhite} style={styles.loading} />
          ) : pendingLabel ? (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingText}>{pendingLabel}</Text>
            </View>
          ) : null}
        </View>

        <Pressable
          accessibilityHint="Tier登録画面へ移動します"
          accessibilityLabel="Tier 登録 再申請"
          accessibilityRole="button"
          onPress={() => navigation.navigate("TierRegistration")}
          style={styles.row}
        >
          <Text style={styles.rowLabel}>Tier 登録/再申請</Text>
          <Text style={styles.rowValue}>›</Text>
        </Pressable>

        <View
          accessibilityLabel="通知オンオフ"
          accessible
          style={styles.row}
        >
          <Text style={styles.rowLabel}>通知 ON/OFF</Text>
          <Switch
            accessibilityLabel="通知 ON/OFF"
            accessibilityRole="switch"
            onValueChange={setNotificationOptIn}
            thumbColor={colors.fgWhite}
            trackColor={{ false: colors.gray500, true: colors.infoBlue }}
            value={notificationOptIn}
          />
        </View>

        <View accessible accessibilityLabel="通知半径" style={styles.segmentSection}>
          <Text style={styles.rowLabel}>通知半径</Text>
          <View style={styles.segmentRow}>
            {radiusOptions.map((option) => {
              const active = radius === option;

              return (
                <Pressable
                  accessibilityLabel={`通知半径 ${option}メートル`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  key={option}
                  onPress={() => setRadius(option)}
                  style={[
                    styles.segmentButton,
                    active ? styles.segmentButtonActive : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentButtonText,
                      active ? styles.segmentButtonTextActive : null,
                    ]}
                  >
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View accessible accessibilityLabel="デモモード" style={styles.row}>
          <Text style={styles.rowLabel}>デモモード</Text>
          <Switch
            accessibilityLabel="デモモード"
            accessibilityRole="switch"
            onValueChange={toggleDemoMode}
            thumbColor={colors.fgWhite}
            trackColor={{ false: colors.gray500, true: colors.warningAmber }}
            value={demoMode}
          />
        </View>

        <Pressable
          accessibilityHint="ログイン情報を削除して歓迎画面に戻ります"
          accessibilityLabel="ログアウト"
          accessibilityRole="button"
          onPress={() => {
            void handleLogout();
          }}
          style={styles.logoutButton}
        >
          <Text style={styles.logoutText}>ログアウト</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgBlack,
  },
  content: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  profileHeader: {
    gap: spacing.sm,
    borderRadius: 20,
    padding: spacing.lg,
    backgroundColor: colors.gray700,
  },
  name: {
    ...typography.h2,
    color: colors.fgWhite,
  },
  email: {
    ...typography.small,
    color: colors.gray500,
  },
  loading: {
    alignSelf: "flex-start",
  },
  pendingBadge: {
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.warningAmber,
  },
  pendingText: {
    ...typography.small,
    color: colors.bgBlack,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 16,
    padding: spacing.md,
    backgroundColor: colors.gray700,
  },
  rowLabel: {
    ...typography.small,
    color: colors.fgWhite,
  },
  rowValue: {
    ...typography.body,
    color: colors.fgWhite,
  },
  segmentSection: {
    gap: spacing.sm,
    borderRadius: 16,
    padding: spacing.md,
    backgroundColor: colors.gray700,
  },
  segmentRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  segmentButton: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.gray500,
  },
  segmentButtonActive: {
    borderColor: colors.infoBlue,
    backgroundColor: colors.infoBlue,
  },
  segmentButtonText: {
    ...typography.small,
    color: colors.fgWhite,
  },
  segmentButtonTextActive: {
    color: colors.fgWhite,
  },
  logoutButton: {
    minHeight: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: colors.emergencyRed,
  },
  logoutText: {
    ...typography.body,
    color: colors.fgWhite,
  },
});
