import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { request } from "@/services/api/client";
import type {
  RegisterPushReq,
  RegisterPushRes,
} from "@/types/api";

export type PermissionState = "granted" | "denied" | "undetermined";

export async function ensurePushPermissions(): Promise<PermissionState> {
  const current = await Notifications.getPermissionsAsync();

  if (current.status === "granted") {
    return current.status;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return requested.status;
}

export async function getPushToken(): Promise<string> {
  const extra = Constants.expoConfig?.extra as
    | { eas?: { projectId?: string } }
    | undefined;
  const token = await Notifications.getExpoPushTokenAsync({
    projectId: extra?.eas?.projectId,
  });

  return token.data;
}

export async function setupAndroidChannels(): Promise<void> {
  if (Platform.OS !== "android") {
    return;
  }

  await Promise.all([
    Notifications.setNotificationChannelAsync("tsunagu-aed-carry", {
      name: "Tsunagu AED Carry",
      importance: Notifications.AndroidImportance.MAX,
      sound: "aed-alert.wav",
      vibrationPattern: [0, 250, 250, 250],
      lockscreenVisibility:
        Notifications.AndroidNotificationVisibility.PUBLIC,
    }),
    Notifications.setNotificationChannelAsync("tsunagu-response", {
      name: "Tsunagu Response",
      importance: Notifications.AndroidImportance.MAX,
      sound: "responder-alert.wav",
      vibrationPattern: [0, 300, 150, 300],
      lockscreenVisibility:
        Notifications.AndroidNotificationVisibility.PUBLIC,
    }),
  ]);
}

export function registerWithBackend(
  token: string,
  platform: RegisterPushReq["platform"]
): Promise<RegisterPushRes> {
  return request<RegisterPushRes>("POST", "/notification/register", {
    body: {
      expoPushToken: token,
      platform,
    } satisfies RegisterPushReq,
  });
}

