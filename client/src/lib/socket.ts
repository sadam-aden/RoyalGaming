import { io } from "socket.io-client";
import { API_BASE_URL } from "./config";

/**
 * The live-updates socket.
 *
 * The handshake carries the signed-in user's token when there is one. The
 * server uses it to decide which snapshot to send: staff get the full picture
 * including the day's takings, while an unauthenticated connection — the public
 * /tv board in the shop — gets stations and players only.
 *
 * Read from storage directly rather than through the auth store, because this
 * module is imported by that store's own dependents and the token is needed
 * before React has mounted anything.
 */
function storedToken(): string | undefined {
  try {
    const raw = localStorage.getItem("royalgaming.auth");
    return raw ? (JSON.parse(raw).token ?? undefined) : undefined;
  } catch {
    return undefined;
  }
}

export const socket = io(API_BASE_URL || undefined, {
  autoConnect: true,
  transports: ["websocket", "polling"],
  auth: (cb) => cb({ token: storedToken() }),
});

/**
 * Re-handshake so the server can re-evaluate who is connecting.
 *
 * Called after signing in or out: the token is only read during the handshake,
 * so without this a user who just signed in would keep receiving the public
 * snapshot until the next reconnect, and one who signed out would keep
 * receiving the staff one.
 */
export function refreshSocketAuth() {
  socket.disconnect();
  socket.connect();
}

export const SOCKET_EVENTS = {
  SESSIONS_SNAPSHOT: "sessions:snapshot",
  STATS_UPDATE: "stats:update",
  ORDER_UPDATE: "order:update",
} as const;
