import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { RootStackParamList } from "@/navigation/types";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { announce } from "@/utils/a11y";
import { countdownTick } from "@/utils/haptics";

type Props = NativeStackScreenProps<RootStackParamList, "Countdown">;

const CANCEL_HOLD_MS = 2_000;

export default function CountdownScreen({ navigation }: Props): JSX.Element {
  const [count, setCount] = useState(3);
  const scale = useRef(new Animated.Value(0.8)).current;
  const cancelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    announce("3秒後にヘルプを呼びます。長押しで取消");
  }, []);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.8,
        duration: 0,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 240,
        useNativeDriver: true,
      }),
    ]).start();
  }, [count, scale]);

  useEffect(() => {
    if (count === 0) {
      navigation.replace("Symptom");
      return;
    }

    const timerId = setTimeout(() => {
      void countdownTick();
      setCount((current) => current - 1);
    }, 1_000);

    return () => {
      clearTimeout(timerId);
    };
  }, [count, navigation]);

  useEffect(
    () => () => {
      if (cancelTimerRef.current) {
        clearTimeout(cancelTimerRef.current);
      }
    },
    []
  );

  const handlePressIn = () => {
    cancelTimerRef.current = setTimeout(() => {
      navigation.goBack();
    }, CANCEL_HOLD_MS);
  };

  const handlePressOut = () => {
    if (cancelTimerRef.current) {
      clearTimeout(cancelTimerRef.current);
      cancelTimerRef.current = null;
    }
  };

  return (
    <TouchableWithoutFeedback
      accessibilityHint="2秒長押しするとヘルプ要請を取り消します"
      accessibilityLabel="ヘルプ要請カウントダウン"
      accessibilityRole="button"
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <View style={styles.container}>
        <Animated.Text
          accessibilityLabel={`${count}`}
          accessibilityLiveRegion="assertive"
          style={[styles.count, { transform: [{ scale }] }]}
        >
          {count}
        </Animated.Text>
        <Text style={styles.title}>ヘルプを呼びます</Text>
        <Text style={styles.description}>画面を長押しでキャンセル</Text>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    backgroundColor: colors.bgBlack,
  },
  count: {
    ...typography.h1,
    fontSize: 200,
    lineHeight: 208,
    color: colors.fgWhite,
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h2,
    color: colors.fgWhite,
    marginBottom: spacing.xl,
  },
  description: {
    ...typography.body,
    color: colors.fgWhite,
    textAlign: "center",
  },
});
