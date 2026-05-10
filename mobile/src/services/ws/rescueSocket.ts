import type { ClientEvent, RescueEvent } from "@/types/api";

type RescueSocketHandler = (event: RescueEvent) => void;

const RECONNECT_DELAYS_MS = [1_000, 2_000, 4_000, 8_000, 16_000, 30_000];

function getWsBase(): string {
  // Expo の static env 置換は `process.env.EXPO_PUBLIC_*` の直接参照のみで動く
  const url = process.env.EXPO_PUBLIC_WS_BASE ?? "";
  return url.replace(/\/+$/, "");
}

export class RescueSocket {
  private socket: WebSocket | null = null;
  private listeners = new Set<RescueSocketHandler>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private sessionId: string | null = null;
  private token: string | null = null;
  private manuallyDisconnected = false;
  private connected = false;

  get isConnected(): boolean {
    return this.connected;
  }

  connect(sessionId: string, token: string): void {
    const sameConnection =
      this.sessionId === sessionId &&
      this.token === token &&
      this.socket !== null &&
      this.socket.readyState !== WebSocket.CLOSED;

    this.sessionId = sessionId;
    this.token = token;
    this.manuallyDisconnected = false;

    if (sameConnection) {
      return;
    }

    this.clearReconnectTimer();
    this.socket?.close();
    this.socket = null;
    this.openSocket();
  }

  disconnect(): void {
    this.manuallyDisconnected = true;
    this.connected = false;
    this.clearReconnectTimer();
    this.socket?.close();
    this.socket = null;
  }

  on(handler: RescueSocketHandler): () => void {
    this.listeners.add(handler);

    return () => {
      this.listeners.delete(handler);
    };
  }

  send(event: ClientEvent): void {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      return;
    }

    this.socket.send(JSON.stringify(event));
  }

  private openSocket(): void {
    if (!this.sessionId || !this.token) {
      return;
    }

    const url = `${getWsBase()}/ws/rescue/${this.sessionId}?token=${encodeURIComponent(
      this.token
    )}`;
    const socket = new WebSocket(url);

    this.socket = socket;

    socket.onopen = () => {
      this.connected = true;
      this.reconnectAttempt = 0;
      this.send({
        type: "subscribe",
        data: { sessionId: this.sessionId as string },
      });
    };

    socket.onmessage = (message) => {
      const event = this.parseEvent(message.data);

      if (!event) {
        return;
      }

      if (event.type === "ping") {
        this.send({
          type: "pong",
          data: { ts: event.data.ts },
        });
      }

      this.listeners.forEach((listener) => listener(event));
    };

    socket.onclose = () => {
      this.connected = false;
      this.socket = null;

      if (!this.manuallyDisconnected) {
        this.scheduleReconnect();
      }
    };

    socket.onerror = () => {
      this.connected = false;
    };
  }

  private parseEvent(raw: string | ArrayBuffer): RescueEvent | null {
    if (typeof raw !== "string") {
      return null;
    }

    try {
      return JSON.parse(raw) as RescueEvent;
    } catch {
      return null;
    }
  }

  private scheduleReconnect(): void {
    if (this.manuallyDisconnected || !this.sessionId || !this.token) {
      return;
    }

    const delay =
      RECONNECT_DELAYS_MS[this.reconnectAttempt] ??
      RECONNECT_DELAYS_MS[RECONNECT_DELAYS_MS.length - 1];

    this.reconnectAttempt += 1;
    this.clearReconnectTimer();
    this.reconnectTimer = setTimeout(() => this.openSocket(), delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
