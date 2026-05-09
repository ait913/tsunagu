import { useEffect, useRef, useState } from "react";

import { RescueSocket } from "@/services/ws/rescueSocket";
import { useAuthStore } from "@/stores/authStore";
import { useRescueStore } from "@/stores/rescueStore";

type UseRescueSocketResult = {
  connected: boolean;
  lastEventTs: number | null;
};

export function useRescueSocket(
  sessionId: string | null
): UseRescueSocketResult {
  const accessToken = useAuthStore((state) => state.accessToken);
  const applyEvent = useRescueStore((state) => state.applyEvent);
  const socketRef = useRef<RescueSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastEventTs, setLastEventTs] = useState<number | null>(null);

  if (!socketRef.current) {
    socketRef.current = new RescueSocket();
  }

  useEffect(() => {
    const socket = socketRef.current as RescueSocket;

    if (!sessionId || !accessToken) {
      socket.disconnect();
      useRescueStore.setState({ isOnline: false });
      setConnected(false);
      return;
    }

    socket.connect(sessionId, accessToken);

    const unsubscribe = socket.on((event) => {
      applyEvent(event);
      setLastEventTs(Date.now());
    });
    const intervalId = setInterval(() => {
      setConnected(socket.isConnected);
      useRescueStore.setState({ isOnline: socket.isConnected });
    }, 500);

    return () => {
      unsubscribe();
      clearInterval(intervalId);
      socket.disconnect();
      useRescueStore.setState({ isOnline: false });
      setConnected(false);
    };
  }, [accessToken, applyEvent, sessionId]);

  return { connected, lastEventTs };
}
