import type {
  AuditAction,
  HandoffKind,
  RescueRole,
  ResponderStatus,
  SosStatus,
  Symptom,
  Tier,
  TierAppStatus,
} from "@prisma/client";

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  currentTier: Tier | null;
};

export type AuditEntry = {
  action: AuditAction;
  resourceId?: string;
  resourceType?: string;
  payload?: unknown;
};

export type AppVariables = {
  authUser?: AuthUser;
  demoMode: boolean;
  auditEntry?: AuditEntry;
};

export type AppBindings = {
  Variables: AppVariables;
};

export type AppErrorCode =
  | "VALIDATION"
  | "UNAUTHENTICATED"
  | "INVALID_CREDENTIALS"
  | "INVALID_REFRESH"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "EMAIL_TAKEN"
  | "ALREADY_PENDING"
  | "NOT_ACTIVE"
  | "SESSION_ENDED"
  | "ALREADY_RESPONDED"
  | "UNSUPPORTED_MEDIA"
  | "TOO_MANY_REQUESTS"
  | "INTERNAL";

export type ErrorPayload = {
  error: {
    code: AppErrorCode;
    message: string;
    details?: unknown;
  };
};

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
  lat: number;
  lng: number;
  distanceM?: number;
  address: string | null;
  hours: string | null;
  indoor: boolean;
  manufacturer: string | null;
  model: string | null;
  installedAt: string | null;
  sourceLicense: string;
};

export type ResponderSummary = {
  id: string;
  userId: string;
  role: RescueRole;
  status: ResponderStatus;
  etaSec: number | null;
  lat: number | null;
  lng: number | null;
  acceptedAt: string | null;
  arrivedAt: string | null;
  tier: Tier | null;
  displayName: string;
};

export type SosDetail = {
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

export type TierHistoryItem = {
  requestedTier: Tier;
  status: TierAppStatus;
  reviewedAt: string | null;
};

export type SessionState =
  | "PENDING"
  | "RESPONDER_ACCEPTED"
  | "RESPONDER_ARRIVED"
  | "AED_ARRIVED"
  | "HANDED_OFF"
  | "ENDED";

export type RespondDecision = "ACCEPT_WITH_AED" | "ACCEPT_BAREHAND" | "DECLINE";

export type HandoffInput = {
  kind: HandoffKind;
  toUserId?: string;
  note?: string;
};
