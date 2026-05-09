import type WebSocket from "ws";

type RoomClient = {
  socket: WebSocket;
  userId: string;
  unsubscribe?: () => void;
};

class RoomRegistry {
  private readonly rooms = new Map<string, Set<RoomClient>>();

  join(sessionId: string, client: RoomClient): void {
    const room = this.rooms.get(sessionId) ?? new Set<RoomClient>();
    room.add(client);
    this.rooms.set(sessionId, room);
  }

  leave(sessionId: string, client: RoomClient): void {
    const room = this.rooms.get(sessionId);
    if (!room) {
      return;
    }
    room.delete(client);
    if (room.size === 0) {
      this.rooms.delete(sessionId);
    }
  }

  closeRoom(sessionId: string, code = 1000, reason = "room_closed"): void {
    const room = this.rooms.get(sessionId);
    if (!room) {
      return;
    }
    for (const client of room) {
      client.unsubscribe?.();
      client.socket.close(code, reason);
    }
    this.rooms.delete(sessionId);
  }
}

export const rooms = new RoomRegistry();
