import type { RescueRole, Tier } from "@prisma/client";

import type { AedDeviceSummary } from "../types.js";

export type RescueEvent =
  | {
      type: "responder_assigned";
      data: { responderId: string; userId: string; role: RescueRole; tier: Tier | null; displayName: string };
    }
  | {
      type: "responder_accepted";
      data: { responderId: string; etaSec: number | null };
    }
  | {
      type: "responder_location_update";
      data: { responderId: string; lat: number; lng: number; etaSec: number | null };
    }
  | {
      type: "responder_arrived";
      data: { responderId: string };
    }
  | {
      type: "responder_cancelled";
      data: { responderId: string };
    }
  | {
      type: "aed_carrier_assigned";
      data: { responderId: string; userId: string; aed: AedDeviceSummary | null; etaSec: number | null };
    }
  | {
      type: "aed_arrived";
      data: { aed: AedDeviceSummary | null };
    }
  | {
      type: "session_state";
      data: { state: string; reason?: string };
    }
  | {
      type: "dispatch_round_expanded";
      data: { round: number; radiusM: number };
    }
  | {
      type: "ping";
      data: { ts: number };
    };

export type ClientEvent =
  | { type: "location"; data: { responderId: string; lat: number; lng: number; etaSec?: number } }
  | { type: "pong"; data: { ts: number } }
  | { type: "subscribe"; data: { sessionId: string } };
