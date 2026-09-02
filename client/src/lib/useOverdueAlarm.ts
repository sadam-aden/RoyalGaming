import { useEffect, useRef } from "react";
import { playChime } from "./alarm";
import { liveDisplayStatus, liveTimes } from "./sessionTime";
import type { LiveSession, StationSnapshot } from "../types";

export interface OverdueEntry {
  session: LiveSession;
  stationName: string;
  overdueMs: number;
}

const REPEAT_INTERVAL_MS = 45_000;

/** Tracks sessions past their planned end time, chiming once when each first goes overdue and periodically while any remain unresolved. */
export function useOverdueAlarm(stations: StationSnapshot[], receivedAt: number, now: number, muted: boolean) {
  const seenRef = useRef<Set<string>>(new Set());
  const lastRepeatRef = useRef<number>(0);

  const overdue: OverdueEntry[] = [];
  for (const station of stations) {
    for (const session of station.sessions) {
      const { remainingMs } = liveTimes(session, receivedAt, now);
      if (liveDisplayStatus(session, remainingMs) === "OVERDUE") {
        overdue.push({ session, stationName: station.name, overdueMs: -(remainingMs ?? 0) });
      }
    }
  }

  useEffect(() => {
    const overdueIds = new Set(overdue.map((o) => o.session.id));

    for (const id of overdueIds) {
      if (!seenRef.current.has(id)) {
        seenRef.current.add(id);
        if (!muted) {
          playChime();
          lastRepeatRef.current = now;
        }
      }
    }
    for (const id of [...seenRef.current]) {
      if (!overdueIds.has(id)) seenRef.current.delete(id);
    }

    if (!muted && overdueIds.size > 0 && now - lastRepeatRef.current > REPEAT_INTERVAL_MS) {
      playChime();
      lastRepeatRef.current = now;
    }
    // Intentionally keyed on the tick clock — overdue/muted are recomputed fresh each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, muted]);

  return overdue;
}
