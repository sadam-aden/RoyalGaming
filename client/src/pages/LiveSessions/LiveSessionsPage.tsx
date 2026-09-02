import { Activity, AlertTriangle, CalendarClock, DollarSign } from "lucide-react";
import { useEffect, useState } from "react";
import { Topbar } from "../../components/layout/Topbar";
import { StatCard } from "../../components/ui/StatCard";
import { Card, CardHeader, CardTitle } from "../../components/ui/Card";
import { StationCard } from "../../components/sessions/StationCard";
import { SessionHistoryTable } from "../../components/sessions/SessionHistoryTable";
import { OverdueAlertPanel } from "../../components/sessions/OverdueAlertPanel";
import { useSessionsStore } from "../../store/sessionsStore";
import { useNowTick } from "../../lib/useNowTick";
import { liveDisplayStatus, liveTimes } from "../../lib/sessionTime";
import { useOverdueAlarm } from "../../lib/useOverdueAlarm";
import { sessionsApi } from "../../lib/sessionsApi";
import { formatCurrency } from "../../lib/format";
import type { SessionHistoryRow } from "../../types";

const MUTE_STORAGE_KEY = "royalgaming.alarmMuted";

export function LiveSessionsPage() {
  const snapshot = useSessionsStore((s) => s.snapshot);
  const receivedAt = useSessionsStore((s) => s.receivedAt);
  const now = useNowTick(1000);

  const [historyDate, setHistoryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [history, setHistory] = useState<SessionHistoryRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [muted, setMuted] = useState(() => localStorage.getItem(MUTE_STORAGE_KEY) === "true");

  function toggleMuted() {
    setMuted((m) => {
      const next = !m;
      localStorage.setItem(MUTE_STORAGE_KEY, String(next));
      return next;
    });
  }

  useEffect(() => {
    setLoadingHistory(true);
    sessionsApi
      .history(historyDate)
      .then((res) => setHistory(res.data))
      .finally(() => setLoadingHistory(false));
  }, [historyDate, snapshot?.stats.sessionsToday]);

  const stations = snapshot?.stations ?? [];
  const freeStations = stations.filter((s) => s.allowMultipleSessions || s.sessions.length === 0);
  const allSessions = stations.flatMap((s) => s.sessions);

  const liveActiveCount = allSessions.filter((session) => {
    const { remainingMs } = liveTimes(session, receivedAt, now);
    return liveDisplayStatus(session, remainingMs) !== "PAUSED" && session.status === "ACTIVE";
  }).length;

  const liveExpiringCount = allSessions.filter((session) => {
    const { remainingMs } = liveTimes(session, receivedAt, now);
    return liveDisplayStatus(session, remainingMs) === "EXPIRING_SOON";
  }).length;

  const overdueEntries = useOverdueAlarm(stations, receivedAt, now, muted);

  return (
    <div>
      <Topbar title="Live Sessions" subtitle="Monitor and control every active station in real time" />

      <OverdueAlertPanel entries={overdueEntries} muted={muted} onToggleMute={toggleMuted} />

      <div className="p-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Active Now" value={String(liveActiveCount)} icon={Activity} tone="accent" />
          <StatCard label="Expiring Soon" value={String(liveExpiringCount)} icon={AlertTriangle} />
          <StatCard label="Sessions Today" value={String(snapshot?.stats.sessionsToday ?? 0)} icon={CalendarClock} />
          <StatCard
            label="Revenue Today"
            value={formatCurrency(snapshot?.stats.revenueToday ?? 0)}
            icon={DollarSign}
          />
        </div>

        <div className="mt-8">
          {!snapshot ? (
            <p className="text-sm text-text-muted">Connecting to live session feed...</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {stations.map((station) => (
                <StationCard key={station.id} station={station} now={now} receivedAt={receivedAt} freeStations={freeStations} />
              ))}
            </div>
          )}
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Today's Session History</CardTitle>
            <input
              type="date"
              value={historyDate}
              onChange={(e) => setHistoryDate(e.target.value)}
              className="rounded-lg border border-border bg-surface-alt px-3 py-1.5 text-sm text-text outline-none"
            />
          </CardHeader>
          {loadingHistory ? (
            <p className="py-8 text-center text-sm text-text-faint">Loading...</p>
          ) : (
            <SessionHistoryTable rows={history} />
          )}
        </Card>
      </div>
    </div>
  );
}
