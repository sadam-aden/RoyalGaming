import type { DisplayStatus, LiveSession } from "../types";

const EXPIRING_SOON_THRESHOLD_MS = 5 * 60 * 1000;

/** Recomputes a session's live elapsed/remaining time by drifting the snapshot values forward from when they were received. */
export function liveTimes(session: LiveSession, snapshotReceivedAt: number, now: number) {
  const drift = session.status === "ACTIVE" ? now - snapshotReceivedAt : 0;
  const elapsedMs = session.elapsedMs + drift;
  const remainingMs = session.remainingMs !== null ? session.remainingMs - drift : null;
  return { elapsedMs, remainingMs };
}

export function liveDisplayStatus(session: LiveSession | null, remainingMs: number | null): DisplayStatus {
  if (!session) return "FREE";
  if (session.status === "PAUSED") return "PAUSED";
  if (session.status === "ACTIVE") {
    if (remainingMs !== null) {
      if (remainingMs <= 0) return "OVERDUE";
      if (remainingMs <= EXPIRING_SOON_THRESHOLD_MS) return "EXPIRING_SOON";
    }
    return "ACTIVE";
  }
  return "FREE";
}

export function formatDuration(ms: number): string {
  const sign = ms < 0 ? "-" : "";
  const abs = Math.abs(ms);
  const totalSeconds = Math.floor(abs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return hours > 0 ? `${sign}${hours}:${pad(minutes)}:${pad(seconds)}` : `${sign}${pad(minutes)}:${pad(seconds)}`;
}
