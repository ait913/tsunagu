import { parse } from "node:url";

import type { ServerType } from "@hono/node-server";
import WebSocket, { WebSocketServer } from "ws";

import { prisma } from "../db/client.js";
import { isAdminEmail } from "../env.js";
import { verifyAccessToken } from "../services/jwt.js";
import { handleResponderLocationUpdate } from "../services/session.js";
import { realtimeBroker } from "../realtime/broker.js";
import { rooms } from "./rooms.js";
import type { ClientEvent } from "./events.js";

const HEARTBEAT_INTERVAL_MS = 25_000;
const HEARTBEAT_TIMEOUT_MS = 120_000;

const canAccessSession = async (userId: string, email: string, sessionId: string): Promise<boolean> => {
  const session = await prisma.rescueSession.findUnique({
    where: { id: sessionId },
    select: {
      sos: { select: { finderId: true } },
      responders: { select: { userId: true } },
    },
  });

  if (!session) {
    return false;
  }

  return (
    session.sos.finderId === userId ||
    session.responders.some((responder) => responder.userId === userId) ||
    isAdminEmail(email)
  );
};

export const attachWebSocketServer = (server: ServerType): void => {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", async (request, socket, head) => {
    try {
      const url = parse(request.url ?? "", true);
      const match = url.pathname?.match(/^\/ws\/rescue\/([^/]+)$/);
      if (!match) {
        socket.destroy();
        return;
      }

      const sessionId = match[1];
      if (!sessionId) {
        socket.destroy();
        return;
      }
      const token = typeof url.query.token === "string" ? url.query.token : "";
      const payload = await verifyAccessToken(token);
      if (!payload.sub) {
        socket.destroy();
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true },
      });
      if (!user || !(await canAccessSession(user.id, user.email, sessionId))) {
        socket.destroy();
        return;
      }

      wss.handleUpgrade(request, socket, head, (ws) => {
        const client = {
          socket: ws,
          userId: user.id,
          unsubscribe: undefined as (() => void) | undefined,
        };
        rooms.join(sessionId, client);

        client.unsubscribe = realtimeBroker.subscribe(sessionId, (event) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(event));
          }
        });

        let lastPongAt = Date.now();
        const interval = setInterval(() => {
          if (Date.now() - lastPongAt > HEARTBEAT_TIMEOUT_MS) {
            ws.close(4000, "heartbeat_timeout");
            return;
          }
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping", data: { ts: Date.now() } }));
          }
        }, HEARTBEAT_INTERVAL_MS);

        ws.on("message", async (data) => {
          try {
            const event = JSON.parse(data.toString()) as ClientEvent;
            if (event.type === "pong") {
              lastPongAt = Date.now();
              return;
            }

            if (event.type === "location") {
              await handleResponderLocationUpdate({
                sessionId,
                responderId: event.data.responderId,
                userId: user.id,
                lat: event.data.lat,
                lng: event.data.lng,
                etaSec: event.data.etaSec,
              });
            }
          } catch (error) {
            console.error("WebSocket message handling failed", error);
          }
        });

        ws.on("close", () => {
          clearInterval(interval);
          client.unsubscribe?.();
          rooms.leave(sessionId, client);
        });
      });
    } catch (error) {
      console.error("WebSocket upgrade failed", error);
      socket.destroy();
    }
  });
};
