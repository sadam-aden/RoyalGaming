import type { Server } from "socket.io";

let io: Server | null = null;

export function setIo(instance: Server) {
  io = instance;
}

export function getIo(): Server {
  if (!io) throw new Error("Socket.io server accessed before initialization");
  return io;
}

// Event names shared between server emitters and client listeners.
export const SOCKET_EVENTS = {
  SESSIONS_SNAPSHOT: "sessions:snapshot", // full station+session state, sent on connect and on any change
  STATS_UPDATE: "stats:update", // live summary bar numbers
  ORDER_UPDATE: "order:update",
} as const;
