import { AlertTriangle, Bell, BellOff, Square } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/Button";
import { sessionsApi } from "../../lib/sessionsApi";
import { apiErrorMessage } from "../../lib/api";
import { formatDuration } from "../../lib/sessionTime";
import type { OverdueEntry } from "../../lib/useOverdueAlarm";

export function OverdueAlertPanel({
  entries,
  muted,
  onToggleMute,
}: {
  entries: OverdueEntry[];
  muted: boolean;
  onToggleMute: () => void;
}) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visible = entries.filter((e) => !dismissed.has(e.session.id));
  if (visible.length === 0) return null;

  async function handleEnd(sessionId: string) {
    setBusyId(sessionId);
    setError(null);
    try {
      await sessionsApi.end(sessionId);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="fixed right-6 top-20 z-40 w-80 rounded-2xl border border-danger/50 bg-surface shadow-xl">
      <div className="flex items-center justify-between border-b border-border-soft px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-danger">
          <AlertTriangle size={16} />
          {visible.length} session{visible.length > 1 ? "s" : ""} overdue
        </div>
        <button
          onClick={onToggleMute}
          title={muted ? "Unmute alarm" : "Mute alarm"}
          className="text-text-faint hover:text-text"
        >
          {muted ? <BellOff size={16} /> : <Bell size={16} />}
        </button>
      </div>

      <div className="max-h-72 overflow-y-auto p-2">
        {visible.map(({ session, stationName, overdueMs }) => (
          <div key={session.id} className="mb-2 rounded-xl bg-danger-soft/40 p-3 last:mb-0">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-text">{stationName}</div>
                <div className="text-xs text-text-muted">{session.playerName || "Walk-in"}</div>
              </div>
              <span className="font-mono text-sm font-semibold text-danger">+{formatDuration(overdueMs)}</span>
            </div>
            <div className="mt-2 flex gap-1.5">
              <Button size="sm" variant="danger" disabled={busyId === session.id} onClick={() => handleEnd(session.id)} className="flex-1">
                <Square size={12} /> End
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setDismissed((d) => new Set(d).add(session.id))}>
                Dismiss
              </Button>
            </div>
          </div>
        ))}
      </div>

      {error && <p className="px-4 pb-3 text-xs text-danger">{error}</p>}
    </div>
  );
}
