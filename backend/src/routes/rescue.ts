import { Hono } from "hono";
import { RescueRole } from "@prisma/client";
import { z } from "zod";

import { prisma } from "../db/client.js";
import { isAdminEmail } from "../env.js";
import { setAuditEntry } from "../middleware/audit.js";
import { getAuthUser, requireAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { cancelDispatchSchedule } from "../services/dispatch.js";
import {
  findNearestAed,
  getSessionTarget,
  updateResponderGeom,
  updateUserLastKnownLocation,
} from "../services/geo.js";
import {
  advanceSessionState,
  createHandoff,
  endRescueSession,
  handleResponderLocationUpdate,
} from "../services/session.js";
import { realtimeBroker } from "../realtime/broker.js";
import type { AppBindings, RespondDecision } from "../types.js";
import { parseWithSchema } from "../validation.js";

const router = new Hono<AppBindings>();

const respondSchema = z
  .object({
    role: z.enum(["RESPONDER", "AED_CARRIER"]),
    decision: z.enum(["ACCEPT_WITH_AED", "ACCEPT_BAREHAND", "DECLINE"]),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.decision !== "DECLINE" && (value.lat === undefined || value.lng === undefined)) {
      ctx.addIssue({
        code: "custom",
        message: "Accepted responses require lat/lng",
        path: ["lat"],
      });
    }
    if (value.role === "AED_CARRIER" && value.decision === "ACCEPT_BAREHAND") {
      ctx.addIssue({
        code: "custom",
        message: "AED carriers cannot accept barehand",
        path: ["decision"],
      });
    }
  });

const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  etaSec: z.number().int().nonnegative().optional(),
});

const handoffSchema = z.object({
  kind: z.enum(["RESPONDER_TO_RESPONDER", "AED_DELIVERED", "TO_EMS"]),
  toUserId: z.string().min(1).optional(),
  note: z.string().trim().max(1_000).optional(),
});

const endSchema = z.object({
  reason: z.enum(["EMS_HANDED", "FINDER_ENDED", "TIMEOUT"]),
});

const ensureSessionParticipant = async (
  sessionId: string,
  userId: string,
  email: string,
): Promise<void> => {
  const session = await prisma.rescueSession.findUnique({
    where: { id: sessionId },
    select: {
      sos: {
        select: {
          finderId: true,
        },
      },
      responders: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!session) {
    throw new AppError(404, "NOT_FOUND", "Rescue session not found");
  }

  const isParticipant =
    session.sos.finderId === userId ||
    session.responders.some((responder) => responder.userId === userId) ||
    isAdminEmail(email);

  if (!isParticipant) {
    throw new AppError(403, "FORBIDDEN", "Session access denied");
  }
};

router.post("/:sessionId/respond", requireAuth, async (c) => {
  const user = getAuthUser(c);
  const sessionId = c.req.param("sessionId");
  const input = parseWithSchema(respondSchema, await c.req.json());
  const target = await getSessionTarget(sessionId);
  if (target.state === "ENDED" || target.state === "HANDED_OFF") {
    throw new AppError(409, "SESSION_ENDED", "Session already ended");
  }

  const responder = await prisma.responder.findUnique({
    where: {
      sessionId_userId_role: {
        sessionId,
        userId: user.id,
        role: input.role,
      },
    },
    select: {
      id: true,
      status: true,
      role: true,
    },
  });

  if (!responder) {
    throw new AppError(403, "FORBIDDEN", "User was not notified for this session");
  }

  if (input.decision === "DECLINE") {
    await prisma.responder.update({
      where: { id: responder.id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
      },
    });
    realtimeBroker.publish(sessionId, {
      type: "responder_cancelled",
      data: { responderId: responder.id },
    });
    setAuditEntry(c, {
      action: "RESPONDER_DECLINED",
      resourceId: responder.id,
      resourceType: "Responder",
    });
    return c.json({
      responder: {
        id: responder.id,
        status: "CANCELLED",
        role: responder.role,
      },
    });
  }

  if (responder.status !== "ASSIGNED") {
    throw new AppError(409, "ALREADY_RESPONDED", "Responder already responded");
  }

  await prisma.responder.update({
    where: { id: responder.id },
    data: {
      status: "ACCEPTED",
      acceptedAt: new Date(),
    },
  });
  await updateResponderGeom({
    responderId: responder.id,
    column: "currentGeom",
    lat: input.lat!,
    lng: input.lng!,
  });
  await updateResponderGeom({
    responderId: responder.id,
    column: "notifiedGeom",
    lat: input.lat!,
    lng: input.lng!,
  });
  await updateUserLastKnownLocation(user.id, input.lat!, input.lng!);
  await advanceSessionState(sessionId, "RESPONDER_ACCEPTED");

  const aed =
    input.decision === "ACCEPT_WITH_AED"
      ? await findNearestAed(input.lat!, input.lng!, 5_000)
      : null;

  if (input.role === RescueRole.AED_CARRIER) {
    realtimeBroker.publish(sessionId, {
      type: "aed_carrier_assigned",
      data: {
        responderId: responder.id,
        userId: user.id,
        aed,
        etaSec: null,
      },
    });
  } else {
    realtimeBroker.publish(sessionId, {
      type: "responder_accepted",
      data: {
        responderId: responder.id,
        etaSec: null,
      },
    });
  }

  setAuditEntry(c, {
    action: "RESPONDER_ACCEPTED",
    resourceId: responder.id,
    resourceType: "Responder",
    payload: { decision: input.decision },
  });

  return c.json({
    responder: {
      id: responder.id,
      status: "ACCEPTED",
      role: responder.role,
    },
    navigation: {
      targetLat: target.targetLat,
      targetLng: target.targetLng,
      aed,
      locationLabel: target.locationLabel,
    },
  });
});

router.patch("/:sessionId/responder/:responderId/location", requireAuth, async (c) => {
  const user = getAuthUser(c);
  const sessionId = c.req.param("sessionId");
  const responderId = c.req.param("responderId");
  const input = parseWithSchema(locationSchema, await c.req.json());
  const result = await handleResponderLocationUpdate({
    sessionId,
    responderId,
    userId: user.id,
    lat: input.lat,
    lng: input.lng,
    etaSec: input.etaSec,
  });

  if (result.arrived) {
    setAuditEntry(c, {
      action: "RESPONDER_ARRIVED",
      resourceId: responderId,
      resourceType: "Responder",
    });
  }

  return c.json({ ok: true });
});

router.post("/:sessionId/handoff", requireAuth, async (c) => {
  const user = getAuthUser(c);
  const sessionId = c.req.param("sessionId");
  const input = parseWithSchema(handoffSchema, await c.req.json());
  await ensureSessionParticipant(sessionId, user.id, user.email);

  if (input.kind === "RESPONDER_TO_RESPONDER" && !input.toUserId) {
    throw new AppError(400, "VALIDATION", "toUserId is required for responder handoff");
  }

  const handoff = await createHandoff({
    sessionId,
    fromUserId: user.id,
    toUserId: input.toUserId,
    kind: input.kind,
    note: input.note,
  });

  if (input.kind === "AED_DELIVERED") {
    const target = await getSessionTarget(sessionId);
    const aed = await findNearestAed(target.targetLat, target.targetLng, 5_000);
    if (aed) {
      await prisma.rescueSession.update({
        where: { id: sessionId },
        data: { aedDeviceId: aed.id },
      });
    }
    realtimeBroker.publish(sessionId, {
      type: "aed_arrived",
      data: { aed },
    });
  }

  setAuditEntry(c, {
    action: "HANDOFF_RECORDED",
    resourceId: handoff.id,
    resourceType: "HandoffEvent",
    payload: { kind: input.kind },
  });

  return c.json({
    handoff: {
      id: handoff.id,
      occurredAt: handoff.occurredAt.toISOString(),
    },
  });
});

router.post("/:sessionId/end", requireAuth, async (c) => {
  const user = getAuthUser(c);
  const sessionId = c.req.param("sessionId");
  const input = parseWithSchema(endSchema, await c.req.json());
  await ensureSessionParticipant(sessionId, user.id, user.email);
  const result = await endRescueSession(sessionId, input.reason);
  cancelDispatchSchedule(sessionId);
  setAuditEntry(c, {
    action: "RESCUE_ENDED",
    resourceId: sessionId,
    resourceType: "RescueSession",
    payload: { reason: input.reason },
  });
  return c.json({
    session: {
      id: sessionId,
      state: "ENDED",
      endedAt: result.endedAt.toISOString(),
    },
  });
});

export default router;
