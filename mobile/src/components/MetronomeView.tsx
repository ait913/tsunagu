import React, { useEffect } from "react";
import { StyleSheet, Text, type ViewStyle } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { announce } from "@/utils/a11y";

export type MetronomeViewProps = {
  active: boolean;
  bpm?: number;
};

export default function MetronomeView({
  active,
  bpm = 100,
}: MetronomeViewProps): JSX.Element {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!active) {
      cancelAnimation(scale);
      scale.value = 1;
      return;
    }

    const beatDuration = 60_000 / bpm;

    scale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: beatDuration / 2 }),
        withTiming(1, { duration: beatDuration / 2 })
      ),
      -1,
      false
    );

    return () => {
      cancelAnimation(scale);
      scale.value = 1;
    };
  }, [active, bpm, scale]);

  useEffect(() => {
    if (!active) {
      return;
    }

    const intervalId = setInterval(() => {
      announce("胸骨圧迫を続けてください");
    }, 30_000);

    return () => {
      clearInterval(intervalId);
    };
  }, [active]);

  const animatedStyle = useAnimatedStyle<ViewStyle>(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View accessibilityLiveRegion="polite" style={[styles.circle, animatedStyle]}>
      <Text style={styles.bpmText}>{bpm}</Text>
      <Text style={styles.label}>BPM</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  circle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.emergencyRed,
  },
  bpmText: {
    ...typography.h2,
    color: colors.fgWhite,
  },
  label: {
    ...typography.small,
    color: colors.fgWhite,
    marginTop: 4,
  },
});
