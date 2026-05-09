import * as Location from "expo-location";

export type PermissionState = "granted" | "denied" | "undetermined";

export type LocationPoint = {
  lat: number;
  lng: number;
  accuracyM?: number;
};

type WatchOptions = {
  intervalMs?: number;
  distanceM?: number;
};

type WatchHandle = {
  stop: () => void;
};

export async function ensureLocationPermissions(): Promise<PermissionState> {
  const foreground = await Location.getForegroundPermissionsAsync();

  let status = foreground.status;

  if (status !== "granted") {
    status = (await Location.requestForegroundPermissionsAsync()).status;
  }

  if (status === "granted") {
    const background = await Location.getBackgroundPermissionsAsync();

    if (background.status !== "granted") {
      await Location.requestBackgroundPermissionsAsync().catch(() => undefined);
    }
  }

  return status;
}

export async function getCurrent(): Promise<LocationPoint> {
  const position = await Promise.race([
    Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
      mayShowUserSettingsDialog: true,
    }),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Location request timed out")), 10_000);
    }),
  ]);

  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    accuracyM: position.coords.accuracy ?? undefined,
  };
}

export function watch(
  handler: (location: LocationPoint) => void,
  options: WatchOptions = {}
): WatchHandle {
  const intervalMs = options.intervalMs ?? 5_000;
  const distanceM = options.distanceM ?? 10;
  let subscription: Location.LocationSubscription | null = null;
  let stopped = false;

  void Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: intervalMs,
      distanceInterval: distanceM,
    },
    (position) => {
      handler({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracyM: position.coords.accuracy ?? undefined,
      });
    }
  ).then((nextSubscription) => {
    if (stopped) {
      nextSubscription.remove();
      return;
    }

    subscription = nextSubscription;
  });

  return {
    stop: () => {
      stopped = true;
      subscription?.remove();
    },
  };
}

export function distanceM(a: LocationPoint, b: LocationPoint): number {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusM = 6_371_000;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const haversine =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const arc = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  return earthRadiusM * arc;
}
