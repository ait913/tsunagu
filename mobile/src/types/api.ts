export type Tier = "TIER1" | "TIER2" | "TIER3";

export type TierAppStatus =
  | "PENDING"
  | "REVIEWING"
  | "APPROVED"
  | "REJECTED";

export type Symptom =
  | "NO_BREATHING"
  | "NO_CONSCIOUSNESS"
  | "BLEEDING"
  | "OTHER";

export type SosStatus = "ACTIVE" | "CANCELLED" | "ENDED";

export type RescueRole = "RESPONDER" | "AED_CARRIER";

export type ResponderStatus =
  | "ASSIGNED"
  | "ACCEPTED"
  | "ENROUTE"
  | "ARRIVED"
  | "HANDED_OFF"
  | "CANCELLED";

export type HandoffKind =
  | "RESPONDER_TO_RESPONDER"
  | "AED_DELIVERED"
  | "TO_EMS";

export type UserSummary = {
  id: string;
  email: string;
  displayName: string;
  currentTier: Tier | null;
};

export type AedDeviceSummary = {
  id: string;
  externalId: string;
  name: string;
  manufacturer: string | null;
  model: string | null;
  lat: number;
  lng: number;
  distanceM: number | null;
  address: string | null;
  hours: string | null;
  indoor: boolean | null;
};

export type ResponderSummary = {
  id: string;
  userId: string;
  role: RescueRole;
  status: ResponderStatus;
  tier: Tier | null;
  displayName: string;
  lat: number | null;
  lng: number | null;
  etaSec: number | null;
  arrivedAt: string | null;
};

export type AuthPayload = {
  user: UserSummary;
  accessToken: string;
  refreshToken: string;
};

export type RegisterReq = {
  email: string;
  password: string;
  displayName: string;
  phone?: string;
  agreedTermsVersion: number;
};

export type RegisterRes = AuthPayload;

export type LoginReq = {
  email: string;
  password: string;
};

export type LoginRes = AuthPayload;

export type RefreshReq = {
  refreshToken: string;
};

export type RefreshRes = Pick<AuthPayload, "accessToken" | "refreshToken">;

export type LogoutRes = {
  ok: true;
};

export type SosReq = {
  symptom: Symptom;
  lat: number;
  lng: number;
  accuracyM?: number;
  locationLabel?: string;
};

export type SosRes = {
  sos: {
    id: string;
    status: "ACTIVE";
    createdAt: string;
  };
  rescueSession: {
    id: string;
    state: "PENDING";
  };
};

export type CancelSosRes = {
  sos: {
    id: string;
    status: "CANCELLED";
  };
};

export type SosDetailRes = {
  sos: {
    id: string;
    finderId: string;
    symptom: Symptom;
    lat: number;
    lng: number;
    locationLabel: string | null;
    status: SosStatus;
    isDemo: boolean;
    createdAt: string;
  };
  session: {
    id: string;
    state: string;
    dispatchRound: number;
    aedDevice: AedDeviceSummary | null;
    responders: ResponderSummary[];
  };
};

export type RespondReq = {
  role: RescueRole;
  decision: "ACCEPT_WITH_AED" | "ACCEPT_BAREHAND" | "DECLINE";
  lat?: number;
  lng?: number;
};

export type RespondRes = {
  responder: {
    id: string;
    status: ResponderStatus;
    role: RescueRole;
  };
  navigation?: {
    targetLat: number;
    targetLng: number;
    aed?: AedDeviceSummary;
    locationLabel?: string;
  };
};

export type ResponderLocationReq = {
  lat: number;
  lng: number;
  etaSec?: number;
};

export type ResponderLocationRes = {
  ok: true;
};

export type HandoffReq = {
  kind: HandoffKind;
  toUserId?: string;
  note?: string;
};

export type HandoffRes = {
  handoff: {
    id: string;
    occurredAt: string;
  };
};

export type EndReq = {
  reason: "EMS_HANDED" | "FINDER_ENDED" | "TIMEOUT";
};

export type EndRes = {
  session: {
    id: string;
    state: "ENDED";
    endedAt: string;
  };
};

export type TierApplyRes = {
  application: {
    id: string;
    requestedTier: Tier;
    status: "PENDING";
    documentKeys: string[];
    createdAt: string;
  };
};

export type TierStatusRes = {
  currentTier: Tier | null;
  pendingApplication: {
    id: string;
    requestedTier: Tier;
    status: TierAppStatus;
    createdAt: string;
    reviewerNote?: string;
  } | null;
  history: Array<{
    requestedTier: Tier;
    status: TierAppStatus;
    reviewedAt: string | null;
  }>;
};

export type AedNearbyRes = {
  aeds: AedDeviceSummary[];
  attribution: "AED N@VI / CC BY 3.0";
};

export type RegisterPushReq = {
  expoPushToken: string;
  platform: "ios" | "android";
};

export type RegisterPushRes = {
  ok: true;
};

export type RescueEvent =
  | {
      type: "responder_assigned";
      data: {
        responderId: string;
        userId: string;
        role: RescueRole;
        tier: Tier;
        displayName: string;
      };
    }
  | {
      type: "responder_accepted";
      data: {
        responderId: string;
        etaSec: number;
      };
    }
  | {
      type: "responder_location_update";
      data: {
        responderId: string;
        lat: number;
        lng: number;
        etaSec: number;
      };
    }
  | {
      type: "responder_arrived";
      data: {
        responderId: string;
      };
    }
  | {
      type: "responder_cancelled";
      data: {
        responderId: string;
      };
    }
  | {
      type: "aed_carrier_assigned";
      data: {
        responderId: string;
        userId: string;
        aed: AedDeviceSummary;
        etaSec: number;
      };
    }
  | {
      type: "aed_arrived";
      data: {
        aed: AedDeviceSummary;
      };
    }
  | {
      type: "session_state";
      data: {
        state: string;
      };
    }
  | {
      type: "dispatch_round_expanded";
      data: {
        round: number;
        radiusM: number;
      };
    }
  | {
      type: "ping";
      data: {
        ts: number;
      };
    };

export type ClientEvent =
  | {
      type: "location";
      data: {
        responderId: string;
        lat: number;
        lng: number;
        etaSec?: number;
      };
    }
  | {
      type: "pong";
      data: {
        ts: number;
      };
    }
  | {
      type: "subscribe";
      data: {
        sessionId: string;
      };
    };

export type ApiError = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};
