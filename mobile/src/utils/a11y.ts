import { AccessibilityInfo } from "react-native";

export function announce(text: string): void {
  void AccessibilityInfo.announceForAccessibility(text);
}
