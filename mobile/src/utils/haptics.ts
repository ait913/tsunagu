import * as Haptics from "expo-haptics";

export const sosPressed = (): Promise<void> =>
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

export const countdownTick = (): Promise<void> =>
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

export const sosFired = (): Promise<void> =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

export const arrival = (): Promise<void> =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

export const handoff = (): Promise<void> =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

export const cancel = (): Promise<void> =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
