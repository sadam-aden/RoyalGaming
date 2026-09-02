import { create } from "zustand";
import { SOCKET_EVENTS, socket } from "../lib/socket";
import type { SessionsSnapshot } from "../types";

interface SessionsState {
  snapshot: SessionsSnapshot | null;
  receivedAt: number;
  connected: boolean;
}

export const useSessionsStore = create<SessionsState>(() => ({
  snapshot: null,
  receivedAt: Date.now(),
  connected: socket.connected,
}));

socket.on("connect", () => useSessionsStore.setState({ connected: true }));
socket.on("disconnect", () => useSessionsStore.setState({ connected: false }));
socket.on(SOCKET_EVENTS.SESSIONS_SNAPSHOT, (snapshot: SessionsSnapshot) =>
  useSessionsStore.setState({ snapshot, receivedAt: Date.now() })
);
