import type { NavigationProp } from "@react-navigation/native";
import * as Notifications from "expo-notifications";

import type { RootStackParamList } from "@/navigation/types";

type NotificationPayload = Record<string, unknown>;

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

export function setupNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export function attachResponseListener(
  navigation: NavigationProp<RootStackParamList>
): () => void {
  const subscription =
    Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content
        .data as NotificationPayload;

      if (data.kind === "AED_CARRY") {
        navigation.navigate("NotificationAed", {
          sessionId: asString(data.sessionId) ?? "",
          distanceM: asNumber(data.distanceM) ?? 0,
          symptom: asString(data.symptom) ?? "OTHER",
          targetLat: asNumber(data.targetLat) ?? 0,
          targetLng: asNumber(data.targetLng) ?? 0,
          aedHint: {
            id: asString((data.aedHint as NotificationPayload | undefined)?.id) ?? "",
            name:
              asString((data.aedHint as NotificationPayload | undefined)?.name) ??
              "AED",
            lat:
              asNumber((data.aedHint as NotificationPayload | undefined)?.lat) ??
              0,
            lng:
              asNumber((data.aedHint as NotificationPayload | undefined)?.lng) ??
              0,
            distanceFromYouM:
              asNumber(
                (data.aedHint as NotificationPayload | undefined)
                  ?.distanceFromYouM
              ) ?? 0,
          },
        });

        return;
      }

      if (data.kind === "RESPONSE") {
        navigation.navigate("NotificationResponder", {
          sessionId: asString(data.sessionId) ?? "",
          distanceM: asNumber(data.distanceM) ?? 0,
          symptom: asString(data.symptom) ?? "OTHER",
          locationLabel: asString(data.locationLabel),
        });
      }
    });

  return () => {
    subscription.remove();
  };
}

