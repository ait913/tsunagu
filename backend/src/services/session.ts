import { Prisma, type HandoffKind, type ResponderStatus } from "@prisma/client";

import { prisma } from "../db/client.js";
import { AppError } from "../middleware/error.js";
import { realtimeBroker } from "../realtime/broker.js";
import type { SessionState } from "../types.js";
import { rooms } from "../ws/rooms.js";
import {
  clearResponderGeometries,
  getResponderSummaries,
  getSessionTarget,
  haversineMeters,
  updateResponderGeom,
  updateUserLastKnownLocation,
} from "./geo.js";

const STATE_ORDER: Record<SessionState, number> = {
  PENDING: 0,
  RESPONDER_ACCEPTED: 1,
  RESPONDER_ARRIVED: 2,
  AED_ARRIVED: 3,
  HANDED_OFF: 4,
  ENDED: 5,
};

const ensureActiveSession = async (sessionId: string) => {
  const session = await prisma.rescueSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      state: true,
      endedAt: true,
      sosId: true,
    },
  });

  if (!session) {
    throw new AppError(404, "NOT_FOUND", "Rescue session not found");
  }

  if (session.state === "ENDED") {
    throw new AppError(409, "SESSION_ENDED", "Session already ended");
  }

  return session;
};

export const advanceSessionState = async (
  sessionId: string,
  targetState: SessionState,
): Promise<string> => {
  const session = await ensureActiveSession(sessionId);
  const currentRank = STATE_ORDER[session.state as SessionState] ?? 0;
  const targetRank = STATE_ORDER[targetState];
  if (targetRank <= currentRank) {
    return session.state;
  }

  const updated = await prisma.rescueSession.update({
    where: { id: sessionId },
    data: { state: targetState },
    select: { state: true },
  });

  realtimeBroker.publish(sessionId, {
    type: "session_state",
    data: { state: updated.state },
  });
  return updated.state;
};

export const handleResponderLocationUpdate = async (input: {
  sessionId: string;
  responderId: string;
  userId: string;
  lat: number;
  lng: number;
  etaSec?: number;
}): Promise<{ arrived: boolean }> => {
  const responder = await prisma.responder.findUnique({
    where: { id: input.responderId },
    select: {
      id: true,
      sessionId: true,
      userId: true,
      status: true,
      role: true,
    },
  });

  if (!responder || responder.sessionId !== input.sessionId || responder.userId !== input.userId) {
    throw new AppError(403, "FORBIDDEN", "Responder does not belong to this session");
  }

  await updateResponderGeom({
    responderId: input.responderId,
    column: "currentGeom",
    lat: input.lat,
    lng: input.lng,
    etaSec: input.etaSec,
  });
  await updateUserLastKnownLocation(input.userId, input.lat, input.lng);

  realtimeBroker.publish(input.sessionId, {
    type: "responder_location_update",
    data: {
      responderId: input.responderId,
      lat: input.lat,
      lng: input.lng,
      etaSec: input.etaSec ?? null,
    },
  });

  const target = await getSessionTarget(input.sessionId);
  const arrived = haversineMeters(input.lat, input.lng, target.targetLat, target.targetLng) <= 30;

  if (arrived && responder.status !== "ARRIVED" && responder.status !== "HANDED_OFF") {
    await prisma.responder.update({
      where: { id: input.responderId },
      data: {
        status: "ARRIVED",
        arrivedAt: new Date(),
      },
    });
    await advanceSessionState(input.sessionId, "RESPONDER_ARRIVED");
    realtimeBroker.publish(input.sessionId, {
      type: "responder_arrived",
      data: { responderId: input.responderId },
    });
  }

  return { arrived };
};

export const createHandoff = async (input: {
  sessionId: string;
  fromUserId?: string;
  toUserId?: string;
  kind: HandoffKind;
  note?: string;
}): Promise<{ id: string; occurredAt: Date }> => {
  await ensureActiveSession(input.sessionId);

  const handoff = await prisma.handoffEvent.create({
    data: {
      sessionId: input.sessionId,
      kind: input.kind,
      fromUserId: input.fromUserId ?? null,
      toUserId: input.toUserId ?? null,
      note: input.note ?? null,
    },
    select: {
      id: true,
      occurredAt: true,
    },
  });

  if (input.kind === "RESPONDER_TO_RESPONDER" && input.fromUserId) {
    await prisma.responder.updateMany({
      where: {
        sessionId: input.sessionId,
        userId: input.fromUserId,
      },
      data: {
        status: "HANDED_OFF" satisfies ResponderStatus,
      },
    });
    if (input.toUserId) {
      await prisma.responder.updateMany({
        where: {
          sessionId: input.sessionId,
          userId: input.toUserId,
        },
        data: {
          status: "ARRIVED" satisfies ResponderStatus,
          arrivedAt: new Date(),
        },
      });
    }
  }

  if (input.kind === "AED_DELIVERED") {
    await advanceSessionState(input.sessionId, "AED_ARRIVED");
  }

  if (input.kind === "TO_EMS") {
    await advanceSessionState(input.sessionId, "HANDED_OFF");
  }

  realtimeBroker.publish(input.sessionId, {
    type: input.kind === "AED_DELIVERED" ? "aed_arrived" : "session_state",
    data:
      input.kind === "AED_DELIVERED"
        ? { aed: null }
        : { state: input.kind === "TO_EMS" ? "HANDED_OFF" : "RESPONDER_ARRIVED" },
  });

  return handoff;
};

export const endRescueSession = async (
  sessionId: string,
  reason: "EMS_HANDED" | "FINDER_ENDED" | "TIMEOUT",
): Promise<{ endedAt: Date }> => {
  const session = await ensureActiveSession(sessionId);
  const endedAt = new Date();

  await prisma.$transaction([
    prisma.rescueSession.update({
      where: { id: sessionId },
      data: { state: "ENDED", endedAt },
    }),
    prisma.sos.update({
      where: { id: session.sosId },
      data: { status: "ENDED", endedAt },
    }),
  ]);

  await clearResponderGeometries(sessionId);
  realtimeBroker.publish(sessionId, {
    type: "session_state",
    data: { state: "ENDED", reason },
  });
  setTimeout(() => {
    rooms.closeRoom(sessionId);
  }, 5 * 60_000);

  return { endedAt };
};

export const getLiveResponders = async (sessionId: string) => getResponderSummaries(sessionId);
