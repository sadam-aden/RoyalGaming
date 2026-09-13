import type { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { buildSnapshot } from "../services/sessionEngine";
import { publicSnapshot, SOCKET_EVENTS, STAFF_ROOM } from "./io";

/**
 * Two audiences on one socket server.
 *
 * The TV board in the shop connects without signing in — that is the point of
 * /tv. But the snapshot it is fed also carried `stats`, including the day's
 * takings, so anyone who could reach the server could watch the shop's revenue
 * tick up in real time.
 *
 * So the handshake is inspected. A valid staff token joins the `staff` room and
 * keeps the full snapshot; everyone else gets the stations only, which is all
 * the TV ever drew.
 */
function isStaff(socket: Socket): boolean {
  const token = socket.handshake.auth?.token;
  if (typeof token !== "string" || !token) return false;
  try {
    jwt.verify(token, process.env.JWT_SECRET as string, { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}

export function registerSocketHandlers(io: Server) {
  io.on("connection", async (socket) => {
    const staff = isStaff(socket);
    if (staff) socket.join(STAFF_ROOM);

    const snapshot = await buildSnapshot();
    socket.emit(SOCKET_EVENTS.SESSIONS_SNAPSHOT, staff ? snapshot : publicSnapshot(snapshot));

    socket.on("disconnect", () => {
      // no per-socket state to clean up yet
    });
  });
}
