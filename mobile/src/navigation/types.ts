export type HandoffKind =
  | "RESPONDER_TO_RESPONDER"
  | "AED_DELIVERED"
  | "TO_EMS";

export type AedSummary = {
  id: string;
  name: string;
  lat: number;
  lng: number;
};

export type RootStackParamList = {
  Welcome: undefined;
  Agree: undefined;
  RoleSelect: undefined;
  Permission: undefined;
  Home: undefined;
  TierRegistration: undefined;
  Profile: undefined;
  Countdown: undefined;
  Symptom: undefined;
  RescueModeFinder: {
    sosId: string;
    sessionId: string;
  };
  RescueModeResponder: {
    sessionId: string;
  };
  AedGuide: {
    sessionId: string;
  };
  Handoff: {
    sessionId: string;
    toUserId?: string;
    kind: HandoffKind;
  };
  End: {
    sessionId: string;
  };
  NotificationResponder: {
    sessionId: string;
    distanceM: number;
    symptom: string;
    locationLabel?: string;
  };
  NavResponder: {
    sessionId: string;
    targetLat: number;
    targetLng: number;
    aed?: AedSummary | null;
  };
  Abandon: {
    peerCount: number;
  };
  NotificationAed: {
    sessionId: string;
    distanceM: number;
    symptom: string;
    targetLat: number;
    targetLng: number;
    aedHint: AedSummary & {
      distanceFromYouM: number;
    };
  };
  NavAed: {
    sessionId: string;
    aed: AedSummary;
    targetLat: number;
    targetLng: number;
  };
  AedPick: {
    sessionId: string;
    aed: AedSummary;
  };
};
