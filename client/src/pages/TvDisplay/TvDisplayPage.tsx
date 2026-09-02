import { Gamepad2 } from "lucide-react";
import { clsx } from "clsx";
import { useSessionsStore } from "../../store/sessionsStore";
import { useNowTick } from "../../lib/useNowTick";
import { liveDisplayStatus, liveTimes, formatDuration } from "../../lib/sessionTime";
import { format } from "date-fns";
import type { StationSnapshot } from "../../types";

const statusStyles: Record<string, string> = {
  FREE: "border-border bg-surface text-text-faint",
  ACTIVE: "border-accent/50 bg-accent-soft text-accent",
  PAUSED: "border-warning/50 bg-warning-soft text-warning",
  EXPIRING_SOON: "border-danger/60 bg-danger-soft text-danger animate-pulse",
  OVERDUE: "border-danger/60 bg-danger-soft text-danger animate-pulse",
  MAINTENANCE: "border-border bg-surface text-text-faint",
};

const statusLabel: Record<string, string> = {
  FREE: "Free",
  ACTIVE: "In Use",
  PAUSED: "Paused",
  EXPIRING_SOON: "Ending Soon",
  OVERDUE: "Time's Up",
  MAINTENANCE: "Maintenance",
};

export function TvDisplayPage() {
  const snapshot = useSessionsStore((s) => s.snapshot);
  const receivedAt = useSessionsStore((s) => s.receivedAt);
  const now = useNowTick(1000);

  const stations = snapshot?.stations ?? [];

  return (
    <div className="min-h-screen bg-bg p-10">
      <div className="mb-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-white">
            <Gamepad2 size={26} />
          </div>
          <div>
            <div className="text-2xl font-bold text-text">Royal Gaming & Cafeteria</div>
            <div className="text-sm text-text-faint">Live Station Status</div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-3xl font-semibold text-text">{format(now, "h:mm:ss a")}</div>
          <div className="text-sm text-text-faint">{format(now, "EEEE, MMMM d")}</div>
        </div>
      </div>

      {!snapshot ? (
        <p className="text-center text-lg text-text-faint">Connecting...</p>
      ) : (
        <div className="grid grid-cols-2 gap-6 md:grid-cols-3 xl:grid-cols-4">
          {stations.map((station) =>
            station.allowMultipleSessions ? (
              <MultiStationTile key={station.id} station={station} now={now} receivedAt={receivedAt} />
            ) : (
              <SingleStationTile key={station.id} station={station} now={now} receivedAt={receivedAt} />
            )
          )}
        </div>
      )}
    </div>
  );
}

function SingleStationTile({ station, now, receivedAt }: { station: StationSnapshot; now: number; receivedAt: number }) {
  const session = station.sessions[0] ?? null;
  const { elapsedMs, remainingMs } = session ? liveTimes(session, receivedAt, now) : { elapsedMs: 0, remainingMs: null };
  const status = session ? liveDisplayStatus(session, remainingMs) : "FREE";
  const timeLabel = session ? (session.durationMin ? formatDuration(remainingMs ?? 0) : formatDuration(elapsedMs)) : null;

  return (
    <div className={clsx("rounded-3xl border-2 p-6", statusStyles[status])}>
      <div className="text-lg font-semibold text-text">{station.name}</div>
      <div className="mt-1 text-xs uppercase tracking-wide opacity-80">{statusLabel[status]}</div>
      {timeLabel ? (
        <div className="mt-6 text-center font-mono text-4xl font-bold tabular-nums">{timeLabel}</div>
      ) : (
        <div className="mt-6 text-center text-2xl font-semibold opacity-40">--:--</div>
      )}
    </div>
  );
}

function MultiStationTile({ station, now, receivedAt }: { station: StationSnapshot; now: number; receivedAt: number }) {
  return (
    <div className={clsx("rounded-3xl border-2 p-6", station.sessions.length > 0 ? statusStyles.ACTIVE : statusStyles.FREE)}>
      <div className="text-lg font-semibold text-text">{station.name}</div>
      <div className="mt-1 text-xs uppercase tracking-wide opacity-80">
        {station.sessions.length > 0 ? `${station.sessions.length} In Use` : "Free"}
      </div>
      {station.sessions.length === 0 ? (
        <div className="mt-6 text-center text-2xl font-semibold opacity-40">--:--</div>
      ) : (
        <div className="mt-4 space-y-2">
          {station.sessions.map((session) => {
            const { elapsedMs, remainingMs } = liveTimes(session, receivedAt, now);
            const timeLabel = session.durationMin ? formatDuration(remainingMs ?? 0) : formatDuration(elapsedMs);
            return (
              <div key={session.id} className="flex items-center justify-between rounded-xl bg-black/20 px-3 py-2">
                <span className="truncate text-sm font-medium">{session.playerName || "Walk-in"}</span>
                <span className="font-mono text-base font-bold tabular-nums">{timeLabel}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
