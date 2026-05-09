import { serve, type ServerType } from "@hono/node-server";
import { Hono } from "hono";
import { Prisma } from "@prisma/client";

import { prisma } from "./db/client.js";
import { env } from "./env.js";
import { auditMiddleware } from "./middleware/audit.js";
import { requireAuth } from "./middleware/auth.js";
import { demoMiddleware } from "./middleware/demo.js";
import { errorHandler } from "./middleware/error.js";
import adminRoutes from "./routes/admin.js";
import aedRoutes from "./routes/aed.js";
import authRoutes from "./routes/auth.js";
import notificationRoutes from "./routes/notification.js";
import rescueRoutes from "./routes/rescue.js";
import sosRoutes from "./routes/sos.js";
import tierRoutes from "./routes/tier.js";
import { createRealtimeEphemeralSession } from "./services/openai.js";
import { endRescueSession } from "./services/session.js";
import { attachWebSocketServer } from "./ws/server.js";
import type { AppBindings } from "./types.js";

const app = new Hono<AppBindings>();

app.onError(errorHandler);
app.use("*", demoMiddleware);
app.use("*", auditMiddleware);

app.get("/healthz", (c) =>
  c.json({
    ok: true,
    ts: new Date().toISOString(),
  }),
);

app.post("/ai/realtime/session", requireAuth, async (c) =>
  c.json({
    session: await createRealtimeEphemeralSession(),
  }),
);

app.route("/auth", authRoutes);
app.route("/tier", tierRoutes);
app.route("/sos", sosRoutes);
app.route("/rescue", rescueRoutes);
app.route("/aed", aedRoutes);
app.route("/notification", notificationRoutes);
app.route("/admin", adminRoutes);

const runMaintenanceJobs = (): void => {
  setInterval(() => {
    void (async () => {
      const timedOutSessions = await prisma.rescueSession.findMany({
        where: {
          state: { not: "ENDED" },
          createdAt: {
            lte: new Date(Date.now() - 60 * 60_000),
          },
        },
        select: { id: true },
      });

      for (const session of timedOutSessions) {
        try {
          await endRescueSession(session.id, "TIMEOUT");
        } catch (error) {
          console.error("Timed out session cleanup failed", error);
        }
      }

      await prisma.sos.deleteMany({
        where: {
          isDemo: true,
          createdAt: {
            lte: new Date(Date.now() - 7 * 24 * 60 * 60_000),
          },
        },
      });

      await prisma.$executeRaw(Prisma.sql`
        UPDATE "Responder"
        SET "currentGeom" = NULL, "notifiedGeom" = NULL
        WHERE "sessionId" IN (
          SELECT "id"
          FROM "RescueSession"
          WHERE "state" = 'ENDED'
            AND "endedAt" <= NOW() - INTERVAL '5 minutes'
        )
      `);
    })().catch((error) => {
      console.error("Maintenance job failed", error);
    });
  }, 5 * 60_000);
};

const server = serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  (info) => {
    console.log(`Tsunagu backend listening on http://localhost:${info.port}`);
  },
);

attachWebSocketServer(server as ServerType);
runMaintenanceJobs();

export default app;
