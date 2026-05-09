import React, { useEffect } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  type ViewStyle,
} from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { sosPressed } from "@/utils/haptics";

export type EmergencyButtonProps = {
  onPress: () => void;
  disabled?: boolean;
  demoMode?: boolean;
  size?: number;
};

export default function EmergencyButton({
  onPress,
  disabled = false,
  demoMode = false,
  size = 240,
}: EmergencyButtonProps): JSX.Element {
  const scale = useSharedValue(1);

  useEffect(() => {
    const duration = demoMode ? 1_000 : 2_500;

    scale.value = withRepeat(
      withTiming(1.03, {
        duration,
      }),
      -1,
      true
    );

    return () => {
      cancelAnimation(scale);
      scale.value = 1;
    };
  }, [demoMode, scale]);

  const animatedStyle = useAnimatedStyle<ViewStyle>(() => ({
    transform: [{ scale: scale.value }],
  }));

  const backgroundColor = demoMode
    ? colors.warningAmber
    : colors.emergencyRed;

  const handlePress = (): void => {
    if (disabled) {
      return;
    }

    void sosPressed();
    onPress();
  };

  return (
    <Animated.View style={[animatedStyle, { width: size, height: size }]}>
      <Pressable
        accessibilityHint="3秒のカウントダウン後に発火します"
        accessibilityLabel="ヘルプを呼ぶ。長押しで取消"
        accessibilityRole="button"
        disabled={disabled}
        onPress={handlePress}
        style={[
          styles.button,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor,
          },
          disabled ? styles.disabled : null,
        ]}
      >
        <Text style={styles.label}>ヘルプを呼ぶ</Text>
        {demoMode ? <Text style={styles.demoLabel}>デモ用</Text> : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  label: {
    ...typography.h2,
    color: colors.fgWhite,
    textAlign: "center",
  },
  demoLabel: {
    ...typography.small,
    color: colors.fgWhite,
    marginTop: 8,
  },
  disabled: {
    opacity: 0.5,
  },
});
