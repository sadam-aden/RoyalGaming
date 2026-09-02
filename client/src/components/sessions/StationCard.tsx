import { clsx } from "clsx";
import { ArrowRightLeft, Gamepad2, Pause, Play, Plus, Square, Timer, User, UserPlus } from "lucide-react";
import { useState } from "react";
import type { LiveSession, StationSnapshot } from "../../types";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { formatDuration, liveDisplayStatus, liveTimes } from "../../lib/sessionTime";
import { sessionsApi } from "../../lib/sessionsApi";
import { apiErrorMessage } from "../../lib/api";
import { TransferModal } from "./TransferModal";
import { StartSessionModal } from "./StartSessionModal";

const statusTone: Record<string, "neutral" | "green" | "amber" | "red"> = {
  FREE: "neutral",
  ACTIVE: "green",
  PAUSED: "amber",
  EXPIRING_SOON: "red",
  OVERDUE: "red",
  MAINTENANCE: "neutral",
};

const statusLabel: Record<string, string> = {
  FREE: "Free",
  ACTIVE: "Active",
  PAUSED: "Paused",
  EXPIRING_SOON: "Expiring Soon",
  OVERDUE: "Overdue",
  MAINTENANCE: "Maintenance",
};

const EXTEND_OPTIONS = [15, 30, 60];

export function StationCard({
  station,
  now,
  receivedAt,
  freeStations,
}: {
  station: StationSnapshot;
  now: number;
  receivedAt: number;
  freeStations: StationSnapshot[];
}) {
  if (station.allowMultipleSessions) {
    return <MultiSessionStationCard station={station} now={now} receivedAt={receivedAt} freeStations={freeStations} />;
  }
  return <SingleSessionStationCard station={station} now={now} receivedAt={receivedAt} freeStations={freeStations} />;
}

function SingleSessionStationCard({
  station,
  now,
  receivedAt,
  freeStations,
}: {
  station: StationSnapshot;
  now: number;
  receivedAt: number;
  freeStations: StationSnapshot[];
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showExtend, setShowExtend] = useState(false);
  const [customMinutes, setCustomMinutes] = useState("");
  const [showTransfer, setShowTransfer] = useState(false);
  const [showStart, setShowStart] = useState(false);

  const session = station.sessions[0] ?? null;
  const { elapsedMs, remainingMs } = session ? liveTimes(session, receivedAt, now) : { elapsedMs: 0, remainingMs: null };
  const displayStatus = session ? liveDisplayStatus(session, remainingMs) : "FREE";

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const timeLabel = session
    ? session.durationMin
      ? formatDuration(remainingMs ?? 0)
      : formatDuration(elapsedMs)
    : "--:--";

  return (
    <div
      className={clsx(
        "flex flex-col rounded-2xl border p-5",
        (displayStatus === "EXPIRING_SOON" || displayStatus === "OVERDUE") ? "border-danger/60 bg-danger-soft/30" : "border-border bg-surface"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-alt text-text-muted">
            <Gamepad2 size={18} />
          </div>
          <div>
            <div className="text-sm font-semibold text-text">{station.name}</div>
            <div className="text-xs text-text-faint">{station.type.replace("_", " ")}</div>
          </div>
        </div>
        <Badge tone={statusTone[displayStatus]}>{statusLabel[displayStatus]}</Badge>
      </div>

      <div className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-surface-alt py-4">
        <Timer size={18} className="text-text-muted" />
        <span className="font-mono text-2xl font-semibold tabular-nums text-text">{timeLabel}</span>
      </div>

      {session ? (
        <div className="mt-4 space-y-1.5 text-sm">
          <div className="flex items-center gap-2 text-text-muted">
            <User size={14} />
            {session.playerName || "Walk-in"}
          </div>
          <div className="text-text-faint">{session.packageLabel}</div>
        </div>
      ) : (
        <div className="mt-4 text-sm text-text-faint">Station is free</div>
      )}

      {error && <p className="mt-3 text-xs text-danger">{error}</p>}

      <div className="mt-5 flex flex-col gap-2">
        {!session && (
          <Button variant="outline" size="sm" className="w-full" onClick={() => setShowStart(true)}>
            Start Session
          </Button>
        )}

        {session && (
          <>
            <div className="flex gap-2">
              {session.status === "PAUSED" ? (
                <Button size="sm" variant="secondary" disabled={busy} onClick={() => run(() => sessionsApi.resume(session.id))} className="flex-1">
                  <Play size={14} /> Resume
                </Button>
              ) : (
                <Button size="sm" variant="secondary" disabled={busy} onClick={() => run(() => sessionsApi.pause(session.id))} className="flex-1">
                  <Pause size={14} /> Pause
                </Button>
              )}
              <div className="relative flex-1">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => setShowExtend((v) => !v)}
                  className="w-full"
                >
                  <Plus size={14} /> Extend
                </Button>
                {showExtend && (
                  <div className="absolute bottom-full z-10 mb-2 w-48 rounded-xl border border-border bg-surface p-2 shadow-lg">
                    {EXTEND_OPTIONS.map((m) => (
                      <button
                        key={m}
                        className="block w-full rounded-lg px-2 py-1.5 text-left text-sm text-text hover:bg-surface-alt"
                        onClick={() => {
                          setShowExtend(false);
                          run(() => sessionsApi.extend(session.id, m));
                        }}
                      >
                        +{m} minutes
                      </button>
                    ))}
                    <div className="mt-1 flex gap-1 border-t border-border-soft pt-2">
                      <input
                        type="number"
                        min={1}
                        placeholder="Custom min"
                        value={customMinutes}
                        onChange={(e) => setCustomMinutes(e.target.value)}
                        className="w-full rounded-lg border border-border bg-surface-alt px-2 py-1 text-xs text-text outline-none"
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          const m = Number(customMinutes);
                          if (m > 0) {
                            setShowExtend(false);
                            setCustomMinutes("");
                            run(() => sessionsApi.extend(session.id, m));
                          }
                        }}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={busy} onClick={() => setShowTransfer(true)} className="flex-1">
                <ArrowRightLeft size={14} /> Transfer
              </Button>
              <Button
                size="sm"
                variant="danger"
                disabled={busy}
                onClick={() => {
                  if (confirm(`End session on ${station.name}?`)) run(() => sessionsApi.end(session.id));
                }}
                className="flex-1"
              >
                <Square size={14} /> End
              </Button>
            </div>
          </>
        )}
      </div>

      {showTransfer && session && (
        <TransferModal
          sessionId={session.id}
          stationType={station.type}
          candidates={freeStations}
          onClose={() => setShowTransfer(false)}
        />
      )}

      {showStart && !session && <StartSessionModal station={station} onClose={() => setShowStart(false)} />}
    </div>
  );
}

function MultiSessionStationCard({
  station,
  now,
  receivedAt,
  freeStations,
}: {
  station: StationSnapshot;
  now: number;
  receivedAt: number;
  freeStations: StationSnapshot[];
}) {
  const [showStart, setShowStart] = useState(false);
  const activeCount = station.sessions.length;

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-alt text-text-muted">
            <Gamepad2 size={18} />
          </div>
          <div>
            <div className="text-sm font-semibold text-text">{station.name}</div>
            <div className="text-xs text-text-faint">{station.type.replace("_", " ")} · shared</div>
          </div>
        </div>
        <Badge tone={activeCount > 0 ? "green" : "neutral"}>{activeCount} active</Badge>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {station.sessions.length === 0 ? (
          <p className="py-4 text-center text-sm text-text-faint">No customers right now</p>
        ) : (
          station.sessions.map((session) => (
            <CustomerSessionRow key={session.id} session={session} now={now} receivedAt={receivedAt} freeStations={freeStations} stationType={station.type} />
          ))
        )}
      </div>

      <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => setShowStart(true)}>
        <UserPlus size={14} /> Add Customer
      </Button>

      {showStart && <StartSessionModal station={station} onClose={() => setShowStart(false)} />}
    </div>
  );
}

function CustomerSessionRow({
  session,
  now,
  receivedAt,
  freeStations,
  stationType,
}: {
  session: LiveSession;
  now: number;
  receivedAt: number;
  freeStations: StationSnapshot[];
  stationType: StationSnapshot["type"];
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showExtend, setShowExtend] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);

  const { elapsedMs, remainingMs } = liveTimes(session, receivedAt, now);
  const displayStatus = liveDisplayStatus(session, remainingMs);
  const timeLabel = session.durationMin ? formatDuration(remainingMs ?? 0) : formatDuration(elapsedMs);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={clsx(
        "rounded-xl border p-3",
        (displayStatus === "EXPIRING_SOON" || displayStatus === "OVERDUE") ? "border-danger/60 bg-danger-soft/30" : "border-border-soft bg-surface-alt"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-text">{session.playerName || "Walk-in"}</div>
          <div className="text-xs text-text-faint">{session.packageLabel}</div>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={statusTone[displayStatus]}>{statusLabel[displayStatus]}</Badge>
          <span className="font-mono text-sm font-semibold tabular-nums text-text">{timeLabel}</span>
        </div>
      </div>

      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}

      <div className="mt-2 flex flex-wrap gap-1.5">
        {session.status === "PAUSED" ? (
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => run(() => sessionsApi.resume(session.id))}>
            <Play size={12} /> Resume
          </Button>
        ) : (
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => run(() => sessionsApi.pause(session.id))}>
            <Pause size={12} /> Pause
          </Button>
        )}
        <div className="relative">
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => setShowExtend((v) => !v)}>
            <Plus size={12} /> Extend
          </Button>
          {showExtend && (
            <div className="absolute bottom-full left-0 z-10 mb-2 w-40 rounded-xl border border-border bg-surface p-2 shadow-lg">
              {EXTEND_OPTIONS.map((m) => (
                <button
                  key={m}
                  className="block w-full rounded-lg px-2 py-1.5 text-left text-xs text-text hover:bg-surface-alt"
                  onClick={() => {
                    setShowExtend(false);
                    run(() => sessionsApi.extend(session.id, m));
                  }}
                >
                  +{m} minutes
                </button>
              ))}
            </div>
          )}
        </div>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => setShowTransfer(true)}>
          <ArrowRightLeft size={12} /> Transfer
        </Button>
        <Button
          size="sm"
          variant="danger"
          disabled={busy}
          onClick={() => {
            if (confirm(`End this customer's session?`)) run(() => sessionsApi.end(session.id));
          }}
        >
          <Square size={12} /> End
        </Button>
      </div>

      {showTransfer && (
        <TransferModal
          sessionId={session.id}
          stationType={stationType}
          candidates={freeStations}
          onClose={() => setShowTransfer(false)}
        />
      )}
    </div>
  );
}
