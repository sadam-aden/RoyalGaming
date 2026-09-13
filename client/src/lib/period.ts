import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isSameYear,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";

/**
 * Calendar periods for the Sales Report.
 *
 * Separate from the analytics DateRangePicker on purpose. That one's presets
 * are rolling windows — its "month" is the last 30 days, which is the right
 * shape for a trend line and the wrong one for a report someone files. "Show me
 * September" has to mean September.
 *
 * Dates are bare "YYYY-MM-DD" strings, inclusive at both ends, matching what
 * the /reports/sales endpoint takes.
 */

export type PeriodKind = "daily" | "weekly" | "monthly" | "custom";

export interface Period {
  kind: PeriodKind;
  from: string;
  to: string;
}

/**
 * A date as a local calendar day.
 *
 * date-fns `format`, never `toISOString().slice(0, 10)` — the latter converts
 * to UTC first, so anywhere east of UTC it reports yesterday for the first few
 * hours of every day. The existing DateRangePicker has exactly that bug.
 */
export const toDayKey = (d: Date) => format(d, "yyyy-MM-dd");

/** Parses a "YYYY-MM-DD" key as local midnight, not UTC midnight. */
export const fromDayKey = (key: string) => parseISO(key);

/** Monday. Week-starts-Sunday would disagree with the existing weekly report. */
const WEEK_OPTS = { weekStartsOn: 1 } as const;

export function periodFor(kind: Exclude<PeriodKind, "custom">, anchor: Date = new Date()): Period {
  if (kind === "daily") {
    const key = toDayKey(anchor);
    return { kind, from: key, to: key };
  }
  if (kind === "weekly") {
    return {
      kind,
      from: toDayKey(startOfWeek(anchor, WEEK_OPTS)),
      to: toDayKey(endOfWeek(anchor, WEEK_OPTS)),
    };
  }
  return { kind, from: toDayKey(startOfMonth(anchor)), to: toDayKey(endOfMonth(anchor)) };
}

/**
 * The period before or after this one.
 *
 * Whole calendar steps for the named kinds — so stepping back from March 31st
 * lands on all of February, not on February 31st. A custom range has no natural
 * neighbour, so it slides by its own length instead.
 */
export function shiftPeriod(period: Period, delta: -1 | 1): Period {
  const from = fromDayKey(period.from);
  if (period.kind === "daily") return periodFor("daily", addDays(from, delta));
  if (period.kind === "weekly") return periodFor("weekly", addWeeks(from, delta));
  if (period.kind === "monthly") return periodFor("monthly", addMonths(from, delta));

  const span = differenceInCalendarDays(fromDayKey(period.to), from) + 1;
  return {
    kind: "custom",
    from: toDayKey(addDays(from, delta * span)),
    to: toDayKey(addDays(fromDayKey(period.to), delta * span)),
  };
}

/** How the period reads in the page title and at the top of the printed report. */
export function periodLabel(period: Period): string {
  const from = fromDayKey(period.from);
  const to = fromDayKey(period.to);

  if (period.kind === "daily") return format(from, "EEEE, d MMMM yyyy");
  if (period.kind === "monthly") return format(from, "MMMM yyyy");

  // Don't repeat what both ends share: "8–14 Sep 2026", not "8 Sep 2026 – 14 Sep 2026".
  const left = isSameYear(from, to) ? (isSameMonth(from, to) ? format(from, "d") : format(from, "d MMM")) : format(from, "d MMM yyyy");
  const range = `${left} – ${format(to, "d MMM yyyy")}`;
  return period.kind === "weekly" ? `Week of ${range}` : range;
}

/** Filename stem for the CSV and PDF downloads. */
export function periodFileSlug(period: Period): string {
  if (period.kind === "daily") return `daily-${period.from}`;
  if (period.kind === "monthly") return `monthly-${format(fromDayKey(period.from), "yyyy-MM")}`;
  if (period.kind === "weekly") return `weekly-${period.from}`;
  return `${period.from}-to-${period.to}`;
}
