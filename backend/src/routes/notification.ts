import { Hono } from "hono";
import { z } from "zod";

import { prisma } from "../db/client.js";
import { getAuthUser, requireAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { sendPushMessages } from "../services/push.js";
import { updateUserLastKnownLocation } from "../services/geo.js";
import type { AppBindings } from "../types.js";
import { parseWithSchema } from "../validation.js";

const router = new Hono<AppBindings>();

const registerSchema = z.object({
  expoPushToken: z.string().min(1),
  platform: z.enum(["ios", "android"]),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

router.post("/register", requireAuth, async (c) => {
  const user = getAuthUser(c);
  const input = parseWithSchema(registerSchema, await c.req.json());
  await prisma.user.update({
    where: { id: user.id },
    data: {
      expoPushToken: input.expoPushToken,
    },
  });
  if (input.lat !== undefined && input.lng !== undefined) {
    await updateUserLastKnownLocation(user.id, input.lat, input.lng);
  }
  return c.json({ ok: true });
});

router.post("/test", requireAuth, async (c) => {
  const user = getAuthUser(c);
  const current = await prisma.user.findUnique({
    where: { id: user.id },
    select: { expoPushToken: true },
  });
  if (!current?.expoPushToken) {
    throw new AppError(400, "VALIDATION", "Push token not registered");
  }
  if (process.env.NODE_ENV === "production" && !c.get("demoMode")) {
    throw new AppError(403, "FORBIDDEN", "Test notifications are disabled in production");
  }

  await sendPushMessages([
    {
      target: { userId: user.id, expoPushToken: current.expoPushToken },
      message: {
        title: "Tsunagu — テスト通知",
        body: "これはテスト通知です",
        data: { kind: "TEST" },
        channelId: "tsunagu-response",
        priority: "high",
        sound: "default",
      },
    },
  ]);
  return c.json({ ok: true });
});

export default router;
