import type { Server } from "socket.io";
import { buildSnapshot } from "../services/sessionEngine";
import { SOCKET_EVENTS } from "./io";

export function registerSocketHandlers(io: Server) {
  io.on("connection", async (socket) => {
    socket.emit(SOCKET_EVENTS.SESSIONS_SNAPSHOT, await buildSnapshot());

    socket.on("disconnect", () => {
      // no per-socket state to clean up yet
    });
  });
}
