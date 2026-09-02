import { io } from "socket.io-client";
import { API_BASE_URL } from "./config";

export const socket = io(API_BASE_URL || undefined, {
  autoConnect: true,
  transports: ["websocket", "polling"],
});

export const SOCKET_EVENTS = {
  SESSIONS_SNAPSHOT: "sessions:snapshot",
  STATS_UPDATE: "stats:update",
  ORDER_UPDATE: "order:update",
} as const;
