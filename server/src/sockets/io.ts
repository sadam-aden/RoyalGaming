import type { Server } from "socket.io";

let io: Server | null = null;

export function setIo(instance: Server) {
  io = instance;
}

export function getIo(): Server {
  if (!io) throw new Error("Socket.io server accessed before initialization");
  return io;
}

/**
 * Socket room for signed-in staff.
 *
 * The shop TV connects to the same server without a token, so the two
 * audiences are separated by membership of this room rather than by endpoint.
 */
export const STAFF_ROOM = "staff";

/** The subset of a snapshot the public TV board is allowed to receive. */
export function publicSnapshot<T extends { stations: unknown }>(snapshot: T) {
  return { stations: snapshot.stations };
}

// Event names shared between server emitters and client listeners.
export const SOCKET_EVENTS = {
  SESSIONS_SNAPSHOT: "sessions:snapshot", // full station+session state, sent on connect and on any change
  STATS_UPDATE: "stats:update", // live summary bar numbers
  ORDER_UPDATE: "order:update",
} as const;
