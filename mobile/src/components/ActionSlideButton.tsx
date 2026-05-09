import React, { useCallback, useState } from "react";
import {
  LayoutChangeEvent,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  PanGestureHandler,
  type PanGestureHandlerGestureEvent,
} from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";

const KNOB_SIZE = 64;
const TRACK_PADDING = 8;

export type ActionSlideButtonProps = {
  label: string;
  onComplete: () => void;
  bg?: string;
  threshold?: number;
};

type GestureContext = {
  startX: number;
};

export default function ActionSlideButton({
  label,
  onComplete,
  bg = colors.emergencyRed,
  threshold = 0.8,
}: ActionSlideButtonProps): JSX.Element {
  const [trackWidth, setTrackWidth] = useState(0);
  const translateX = useSharedValue(0);
  const completed = useSharedValue(false);

  const maxTranslate = Math.max(trackWidth - KNOB_SIZE - TRACK_PADDING * 2, 0);

  const fireComplete = useCallback(() => {
    onComplete();
  }, [onComplete]);

  const handleLayout = (event: LayoutChangeEvent): void => {
    setTrackWidth(event.nativeEvent.layout.width);
  };

  const gestureHandler = useAnimatedGestureHandler<
    PanGestureHandlerGestureEvent,
    GestureContext
  >({
    onStart: (_, context) => {
      context.startX = translateX.value;
    },
    onActive: (event, context) => {
      const nextValue = context.startX + event.translationX;
      translateX.value = Math.min(Math.max(nextValue, 0), maxTranslate);
    },
    onEnd: () => {
      if (maxTranslate > 0 && translateX.value >= maxTranslate * threshold) {
        translateX.value = withTiming(maxTranslate, { duration: 150 });

        if (!completed.value) {
          completed.value = true;
          runOnJS(fireComplete)();
        }

        return;
      }

      translateX.value = withTiming(0, { duration: 150 });
    },
  });

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View
      accessibilityLabel={label}
      accessibilityRole="button"
      accessible
      onLayout={handleLayout}
      style={[styles.track, { backgroundColor: bg }]}
    >
      <Text style={styles.label}>{label}</Text>
      <PanGestureHandler onGestureEvent={gestureHandler}>
        <Animated.View style={[styles.knob, knobStyle]}>
          <Text style={styles.knobText}>→</Text>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    minHeight: 80,
    justifyContent: "center",
    borderRadius: 40,
    padding: TRACK_PADDING,
    overflow: "hidden",
  },
  label: {
    ...typography.small,
    color: colors.fgWhite,
    textAlign: "center",
    paddingHorizontal: KNOB_SIZE + spacing.md,
  },
  knob: {
    position: "absolute",
    left: TRACK_PADDING,
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    borderRadius: KNOB_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.fgWhite,
  },
  knobText: {
    ...typography.h2,
    color: colors.bgBlack,
  },
});
