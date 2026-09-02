import { api } from "./api";
import type { SessionHistoryRow } from "../types";

export const sessionsApi = {
  pause: (id: string) => api.post(`/sessions/${id}/pause`),
  resume: (id: string) => api.post(`/sessions/${id}/resume`),
  extend: (id: string, minutes: number) => api.post(`/sessions/${id}/extend`, { minutes }),
  transfer: (id: string, targetStationId: string) => api.post(`/sessions/${id}/transfer`, { targetStationId }),
  end: (id: string) => api.post(`/sessions/${id}/end`),
  history: (date?: string) =>
    api.get<SessionHistoryRow[]>("/sessions/history", { params: date ? { date } : undefined }),
  start: (payload: {
    stationId: string;
    playerName?: string;
    packageLabel: string;
    ratePerHour: number;
    durationMin?: number;
  }) => api.post("/sessions", payload),
};
