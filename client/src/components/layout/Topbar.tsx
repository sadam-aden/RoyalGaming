import { Wifi, WifiOff } from "lucide-react";
import type { ReactNode } from "react";
import { useSessionsStore } from "../../store/sessionsStore";

export function Topbar({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  const connected = useSessionsStore((s) => s.connected);

  return (
    <header className="flex items-center justify-between border-b border-border bg-surface px-8 py-5">
      <div>
        <h1 className="text-xl font-semibold text-text">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-text-muted">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-4">
        <div
          className="flex items-center gap-1.5 rounded-full border border-border-soft px-3 py-1.5 text-xs font-medium text-text-muted"
          title={connected ? "Live connection active" : "Reconnecting..."}
        >
          {connected ? <Wifi size={14} className="text-accent" /> : <WifiOff size={14} className="text-danger" />}
          {connected ? "Live" : "Offline"}
        </div>
        {actions}
      </div>
    </header>
  );
}
