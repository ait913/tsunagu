import { Platform } from "react-native";
import { create } from "zustand";

import {
  ensurePushPermissions,
  getPushToken,
  registerWithBackend,
  setupAndroidChannels,
  type PermissionState as NotificationPermissionState,
} from "@/services/notifications/register";
import {
  ensureLocationPermissions,
  type PermissionState as LocationPermissionState,
} from "@/services/location/tracker";

type PermissionStatus = NotificationPermissionState | LocationPermissionState;

type NotificationState = {
  permissions: {
    notification: PermissionStatus;
    location: PermissionStatus;
  };
  pushToken: string | null;
  ensurePermissions: () => Promise<void>;
  registerPushToken: () => Promise<void>;
  setPermission: (
    key: keyof NotificationState["permissions"],
    value: PermissionStatus
  ) => void;
};

export const useNotificationStore = create<NotificationState>((set) => ({
  permissions: {
    notification: "undetermined",
    location: "undetermined",
  },
  pushToken: null,
  ensurePermissions: async () => {
    const [notification, location] = await Promise.all([
      ensurePushPermissions(),
      ensureLocationPermissions(),
    ]);

    set({
      permissions: {
        notification,
        location,
      },
    });
  },
  registerPushToken: async () => {
    await setupAndroidChannels();

    const token = await getPushToken();
    const platform = Platform.OS === "android" ? "android" : "ios";

    await registerWithBackend(token, platform);
    set({ pushToken: token });
  },
  setPermission: (key, value) =>
    set((state) => ({
      permissions: {
        ...state.permissions,
        [key]: value,
      },
    })),
}));

