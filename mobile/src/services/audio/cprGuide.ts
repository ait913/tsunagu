import { request } from "@/services/api/client";
import type { Symptom, Tier } from "@/types/api";

type StartInput = {
  sessionId: string;
  symptom: Symptom;
};

type RealtimeSessionResponse = {
  client_secret?: { value?: string } | string;
  secret?: string;
  value?: string;
};

type OpenAiRealtimeSocket = WebSocket;

export type CprEvent =
  | { kind: "session.start"; symptom: Symptom }
  | { kind: "tick.30s" }
  | { kind: "tick.60s" }
  | { kind: "aed.arrived"; deviceModel?: string }
  | { kind: "responder.arrived"; tier: Tier; displayName: string }
  | { kind: "ems.arrived" }
  | { kind: "session.end" };

type FallbackHandler = () => void;

type ReactNativeWebSocketCtor = new (
  url: string,
  protocols?: string | string[],
  options?: { headers?: Record<string, string> }
) => WebSocket;

const REALTIME_MODEL = "gpt-4o-realtime-preview";

function extractEphemeralSecret(payload: RealtimeSessionResponse): string | null {
  if (typeof payload.client_secret === "string") {
    return payload.client_secret;
  }

  if (typeof payload.client_secret?.value === "string") {
    return payload.client_secret.value;
  }

  if (typeof payload.secret === "string") {
    return payload.secret;
  }

  if (typeof payload.value === "string") {
    return payload.value;
  }

  return null;
}

function formatEventText(event: CprEvent): string {
  switch (event.kind) {
    case "session.start":
      return `session.start symptom=${event.symptom}`;
    case "tick.30s":
      return "tick.30s";
    case "tick.60s":
      return "tick.60s";
    case "aed.arrived":
      return `aed.arrived deviceModel=${event.deviceModel ?? "unknown"}`;
    case "responder.arrived":
      return `responder.arrived tier=${event.tier} displayName=${event.displayName}`;
    case "ems.arrived":
      return "ems.arrived";
    case "session.end":
      return "session.end";
  }
}

/**
 * MVP 制約:
 * React Native の WebRTC 制約により、本実装は WebSocket でバックエンド経由 ephemeral session 取得 + 接続のみを行う。
 * 実音声出力は将来対応とし、MVP は metronome + fallback mp3 で代替する。
 */
export class CprGuide {
  private socket: OpenAiRealtimeSocket | null = null;
  private fallbackHandlers = new Set<FallbackHandler>();
  private fallbackTimer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;
  private opened = false;

  async start(input: StartInput): Promise<void> {
    await this.stop();

    this.stopped = false;
    this.opened = false;

    const timeoutPromise = new Promise<void>((resolve) => {
      this.fallbackTimer = setTimeout(() => {
        if (!this.stopped && !this.opened) {
          this.triggerFallback();
        }

        resolve();
      }, 5_000);
    });

    const connectPromise = (async () => {
      try {
        const session = await request<RealtimeSessionResponse>(
          "POST",
          "/ai/realtime/session",
          {
            body: {
              sessionId: input.sessionId,
              symptom: input.symptom,
            },
          }
        );
        const secret = extractEphemeralSecret(session);

        if (!secret || this.stopped) {
          return;
        }

        const SocketCtor = WebSocket as unknown as ReactNativeWebSocketCtor;
        const url = `wss://api.openai.com/v1/realtime?model=${REALTIME_MODEL}`;

        await new Promise<void>((resolve) => {
          const socket = new SocketCtor(url, undefined, {
            headers: {
              Authorization: `Bearer ${secret}`,
              "OpenAI-Beta": "realtime=v1",
            },
          });

          this.socket = socket;

          socket.onopen = () => {
            this.opened = true;
            this.clearFallbackTimer();
            this.sendEvent({ kind: "session.start", symptom: input.symptom });
            resolve();
          };

          socket.onclose = () => {
            this.opened = false;
            this.socket = null;
          };

          socket.onerror = () => {
            this.opened = false;
            this.socket = null;
          };
        });
      } catch {
        return;
      }
    })();

    await Promise.race([connectPromise, timeoutPromise]);
  }

  sendEvent(event: CprEvent): void {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      return;
    }

    this.socket.send(
      JSON.stringify({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [
            {
              type: "input_text",
              text: formatEventText(event),
            },
          ],
        },
      })
    );
    this.socket.send(
      JSON.stringify({
        type: "response.create",
        response: {
          modalities: ["text", "audio"],
        },
      })
    );
  }

  async stop(): Promise<void> {
    this.stopped = true;
    this.opened = false;
    this.clearFallbackTimer();

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  onFallback(handler: FallbackHandler): () => void {
    this.fallbackHandlers.add(handler);

    return () => {
      this.fallbackHandlers.delete(handler);
    };
  }

  private triggerFallback(): void {
    this.opened = false;
    this.socket?.close();
    this.socket = null;
    this.fallbackHandlers.forEach((handler) => handler());
  }

  private clearFallbackTimer(): void {
    if (this.fallbackTimer) {
      clearTimeout(this.fallbackTimer);
      this.fallbackTimer = null;
    }
  }
}
