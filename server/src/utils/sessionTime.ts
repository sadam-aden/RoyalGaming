import type { Session, StationStatus } from "@prisma/client";

const EXPIRING_SOON_THRESHOLD_MS = 5 * 60 * 1000;

export type DisplayStatus = StationStatus;

/** Milliseconds of billable time elapsed so far, excluding paused time. */
export function elapsedMs(session: Session, at: Date = new Date()): number {
  const reference = session.status === "PAUSED" && session.pausedAt ? session.pausedAt : at;
  const raw = reference.getTime() - session.startedAt.getTime();
  return Math.max(0, raw - Number(session.totalPausedMs));
}

/** Milliseconds remaining until plannedEndAt; null for open-ended sessions. Negative once overdue. */
export function remainingMs(session: Session, at: Date = new Date()): number | null {
  if (!session.plannedEndAt) return null;
  if (session.status === "PAUSED" && session.pausedAt) {
    return session.plannedEndAt.getTime() - session.pausedAt.getTime();
  }
  return session.plannedEndAt.getTime() - at.getTime();
}

export function deriveDisplayStatus(session: Session | null, at: Date = new Date()): DisplayStatus {
  if (!session) return "FREE";
  if (session.status === "PAUSED") return "PAUSED";
  if (session.status === "ACTIVE") {
    const rem = remainingMs(session, at);
    if (rem !== null && rem <= EXPIRING_SOON_THRESHOLD_MS) return "EXPIRING_SOON";
    return "ACTIVE";
  }
  return "FREE";
}

export function computeAmount(ratePerHour: number, billableMs: number): number {
  const hours = billableMs / (1000 * 60 * 60);
  return Math.round(ratePerHour * hours * 100) / 100;
}
