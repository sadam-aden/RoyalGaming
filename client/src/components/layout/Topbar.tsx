import { Menu, Wifi, WifiOff } from "lucide-react";
import type { ReactNode } from "react";
import { useSessionsStore } from "../../store/sessionsStore";
import { useUiStore } from "../../store/uiStore";

/**
 * The bar every page puts at the top.
 *
 * It also carries the button that opens the sidebar, because below `lg` the
 * sidebar is a drawer and there would otherwise be no way to reach it.
 *
 * The whole bar wraps rather than staying on one line: page titles and action
 * buttons together are wider than a phone, and left unwrapped they pushed the
 * content past the right edge on every single screen.
 */
export function Topbar({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  const connected = useSessionsStore((s) => s.connected);
  const openSidebar = useUiStore((s) => s.openSidebar);

  return (
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-border bg-surface px-4 py-4 sm:px-8 sm:py-5">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={openSidebar}
          aria-label="Open menu"
          className="-ml-1 shrink-0 rounded-lg p-2 text-text-muted transition-colors hover:bg-surface-alt hover:text-text lg:hidden"
        >
          <Menu size={20} />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold text-text sm:text-xl">{title}</h1>
          {subtitle && <p className="mt-0.5 truncate text-sm text-text-muted">{subtitle}</p>}
        </div>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-4">
        {/* The connection pill is reassurance, not information you act on, so
            it is the first thing to go when the bar gets tight. */}
        <div
          className="hidden items-center gap-1.5 rounded-full border border-border-soft px-3 py-1.5 text-xs font-medium text-text-muted sm:flex"
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
