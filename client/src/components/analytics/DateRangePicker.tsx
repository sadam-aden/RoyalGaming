import { useState } from "react";
import type { DateRange } from "../../lib/analyticsApi";
import { toDayKey } from "../../lib/period";

type Preset = "today" | "week" | "month" | "custom";

/**
 * The user's calendar day, not UTC's.
 *
 * This used to be `toISOString().slice(0, 10)`, which converts to UTC first.
 * Anywhere east of UTC that reports yesterday's date for the first hours of
 * every day — so "Today" opened on yesterday's takings until mid-morning.
 */
const toISODate = (d: Date) => toDayKey(d);

function presetRange(preset: Preset): DateRange {
  const now = new Date();
  const to = toISODate(now);
  if (preset === "today") return { from: to, to };
  if (preset === "week") {
    const from = new Date(now);
    from.setDate(from.getDate() - 6);
    return { from: toISODate(from), to };
  }
  const from = new Date(now);
  from.setDate(from.getDate() - 29);
  return { from: toISODate(from), to };
}

export function DateRangePicker({ onChange }: { onChange: (range: DateRange) => void }) {
  const [preset, setPreset] = useState<Preset>("week");
  const [custom, setCustom] = useState<DateRange>(presetRange("week"));

  function selectPreset(p: Preset) {
    setPreset(p);
    if (p !== "custom") {
      const range = presetRange(p);
      setCustom(range);
      onChange(range);
    }
  }

  function applyCustom(range: DateRange) {
    setCustom(range);
    if (range.from && range.to) onChange(range);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex gap-1 rounded-xl bg-surface-alt p-1">
        {(["today", "week", "month", "custom"] as Preset[]).map((p) => (
          <button
            key={p}
            onClick={() => selectPreset(p)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
              preset === p ? "bg-accent text-white" : "text-text-muted hover:text-text"
            }`}
          >
            {p}
          </button>
        ))}
      </div>
      {preset === "custom" && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={custom.from}
            onChange={(e) => applyCustom({ ...custom, from: e.target.value })}
            className="rounded-lg border border-border bg-surface-alt px-2 py-1.5 text-xs text-text outline-none"
          />
          <span className="text-text-faint">to</span>
          <input
            type="date"
            value={custom.to}
            onChange={(e) => applyCustom({ ...custom, to: e.target.value })}
            className="rounded-lg border border-border bg-surface-alt px-2 py-1.5 text-xs text-text outline-none"
          />
        </div>
      )}
    </div>
  );
}

export { presetRange };
export type { Preset };
