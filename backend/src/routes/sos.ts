import { randomUUID } from "node:crypto";

import { Hono } from "hono";
import { z } from "zod";

import { prisma } from "../db/client.js";
import { isAdminEmail } from "../env.js";
import { setAuditEntry } from "../middleware/audit.js";
import { getAuthUser, requireAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { cancelDispatchSchedule, scheduleDispatch } from "../services/dispatch.js";
import { getSosDetail, insertSosWithGeom, updateUserLastKnownLocation } from "../services/geo.js";
import { realtimeBroker } from "../realtime/broker.js";
import type { AppBindings } from "../types.js";
import { parseWithSchema } from "../validation.js";

const router = new Hono<AppBindings>();

const sosSchema = z.object({
  symptom: z.enum(["NO_BREATHING", "NO_CONSCIOUSNESS", "BLEEDING", "OTHER"]),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracyM: z.number().positive().optional(),
  locationLabel: z.string().trim().max(255).optional(),
});

router.post("/", requireAuth, async (c) => {
  const user = getAuthUser(c);
  const input = parseWithSchema(sosSchema, await c.req.json());
  const existing = await prisma.sos.findFirst({
    where: {
      finderId: user.id,
      status: "ACTIVE",
      createdAt: { gte: new Date(Date.now() - 60_000) },
    },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    throw new AppError(429, "TOO_MANY_REQUESTS", "SOS already active", {
      existingSosId: existing.id,
    });
  }

  const sosId = randomUUID();
  await insertSosWithGeom({
    id: sosId,
    finderId: user.id,
    symptom: input.symptom,
    lat: input.lat,
    lng: input.lng,
    accuracyM: input.accuracyM,
    locationLabel: input.locationLabel,
    isDemo: c.get("demoMode"),
  });
  await updateUserLastKnownLocation(user.id, input.lat, input.lng);

  const rescueSession = await prisma.rescueSession.create({
    data: {
      sosId,
      isDemo: c.get("demoMode"),
      state: "PENDING",
    },
    select: {
      id: true,
      state: true,
    },
  });

  setAuditEntry(c, {
    action: "SOS_FIRED",
    resourceId: sosId,
    resourceType: "Sos",
    payload: { isDemo: c.get("demoMode") },
  });

  void scheduleDispatch(rescueSession.id);

  return c.json(
    {
      sos: {
        id: sosId,
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
      },
      rescueSession,
    },
    201,
  );
});

router.post("/:id/cancel", requireAuth, async (c) => {
  const user = getAuthUser(c);
  const sosId = c.req.param("id");
  const sos = await prisma.sos.findUnique({
    where: { id: sosId },
    select: {
      id: true,
      finderId: true,
      status: true,
      rescueSession: { select: { id: true } },
    },
  });
  if (!sos) {
    throw new AppError(404, "NOT_FOUND", "SOS not found");
  }
  if (sos.finderId !== user.id) {
    throw new AppError(403, "FORBIDDEN", "SOS belongs to another user");
  }
  if (sos.status !== "ACTIVE") {
    throw new AppError(409, "NOT_ACTIVE", "SOS is not active");
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.sos.update({
      where: { id: sosId },
      data: { status: "CANCELLED", cancelledAt: now },
    }),
    prisma.rescueSession.updateMany({
      where: { sosId },
      data: { state: "ENDED", endedAt: now },
    }),
  ]);

  if (sos.rescueSession?.id) {
    cancelDispatchSchedule(sos.rescueSession.id);
    realtimeBroker.publish(sos.rescueSession.id, {
      type: "session_state",
      data: { state: "ENDED", reason: "CANCELLED" },
    });
  }

  setAuditEntry(c, {
    action: "SOS_CANCELLED",
    resourceId: sosId,
    resourceType: "Sos",
  });

  return c.json({ sos: { id: sosId, status: "CANCELLED" } });
});

router.get("/:id", requireAuth, async (c) => {
  const user = getAuthUser(c);
  const sosId = c.req.param("id");
  const detail = await getSosDetail(sosId);
  const canAccess =
    detail.sos.finderId === user.id ||
    detail.session.responders.some((responder) => responder.userId === user.id) ||
    isAdminEmail(user.email);
  if (!canAccess) {
    throw new AppError(403, "FORBIDDEN", "SOS access denied");
  }
  return c.json(detail);
});

export default router;
