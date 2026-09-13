import { ChevronLeft, ChevronRight } from "lucide-react";
import { type Period, type PeriodKind, periodFor, periodLabel, shiftPeriod } from "../../lib/period";

const KINDS: { kind: PeriodKind; label: string }[] = [
  { kind: "daily", label: "Daily" },
  { kind: "weekly", label: "Weekly" },
  { kind: "monthly", label: "Monthly" },
  { kind: "custom", label: "Custom" },
];

/**
 * Period selector for the Sales Report.
 *
 * Controlled, unlike the analytics DateRangePicker: the page needs the chosen
 * period for its subtitle, its download filenames and the printed sheet, so the
 * period has to live above this component rather than inside it.
 */
export function PeriodPicker({ value, onChange }: { value: Period; onChange: (period: Period) => void }) {
  function selectKind(kind: PeriodKind) {
    if (kind === value.kind) return;
    // Leaving custom: re-anchor on today rather than on whatever the custom
    // range happened to start at, which is what "Daily" is expected to mean.
    onChange(kind === "custom" ? { ...value, kind: "custom" } : periodFor(kind));
  }

  function setBound(edge: "from" | "to", day: string) {
    if (!day) return;
    const next = { ...value, kind: "custom" as const, [edge]: day };
    // Dragging one end past the other would make an inverted range the server
    // rejects; collapse it to a single day instead.
    if (next.from > next.to) {
      if (edge === "from") next.to = day;
      else next.from = day;
    }
    onChange(next);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex gap-1 rounded-xl bg-surface-alt p-1">
        {KINDS.map(({ kind, label }) => (
          <button
            key={kind}
            onClick={() => selectKind(kind)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              value.kind === kind ? "bg-accent text-white" : "text-text-muted hover:text-text"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {value.kind === "custom" ? (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={value.from}
            max={value.to}
            onChange={(e) => setBound("from", e.target.value)}
            className="rounded-lg border border-border bg-surface-alt px-2 py-1.5 text-xs text-text outline-none"
          />
          <span className="text-text-faint">to</span>
          <input
            type="date"
            value={value.to}
            min={value.from}
            onChange={(e) => setBound("to", e.target.value)}
            className="rounded-lg border border-border bg-surface-alt px-2 py-1.5 text-xs text-text outline-none"
          />
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <StepButton label="Previous period" onClick={() => onChange(shiftPeriod(value, -1))}>
            <ChevronLeft size={16} />
          </StepButton>
          <span className="min-w-52 text-center text-sm font-medium text-text">{periodLabel(value)}</span>
          <StepButton label="Next period" onClick={() => onChange(shiftPeriod(value, 1))}>
            <ChevronRight size={16} />
          </StepButton>
        </div>
      )}
    </div>
  );
}

function StepButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="rounded-lg border border-border p-1.5 text-text-muted transition-colors hover:border-border-soft hover:text-text"
    >
      {children}
    </button>
  );
}
