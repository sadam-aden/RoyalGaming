import { HttpError } from "./asyncHandler";

/**
 * Report dates, resolved in one consistent timezone.
 *
 * A "day" is not a property of an instant, it is a property of an instant
 * *somewhere*. The rest of this codebase has never picked a somewhere: range
 * boundaries are built with server-local methods (`setHours(0, 0, 0, 0)`) while
 * the day a sale is filed under is read in UTC (`toISOString().slice(0, 10)`).
 * On a server that is not itself on UTC those two disagree, and a late-night
 * sale lands in a bucket the range does not contain.
 *
 * So everything here runs on one named zone. It defaults to UTC, which is what
 * the droplet's clock already is, so nothing moves until REPORT_TIMEZONE is
 * actually set to the shop's zone.
 *
 * No dependency: Node ships full ICU, so Intl knows every IANA zone and its
 * DST history.
 */
export const REPORT_TIME_ZONE = process.env.REPORT_TIMEZONE ?? "UTC";

/** Matches a bare calendar date, the only form the report endpoints accept. */
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

/** Longest span a single report may cover, so a mistyped year cannot table-scan. */
const MAX_RANGE_DAYS = 400;

/**
 * Whether `key` names a day that exists.
 *
 * The shape test is not enough and neither is a NaN check: Date rolls invalid
 * components over without complaint, so month 13 quietly becomes January of the
 * next year and 2026-02-30 becomes March 2nd. Building the date and reading the
 * components back is what catches those — a real day is the only kind that
 * survives the round trip unchanged.
 */
function isRealDay(key: string): boolean {
  const [year, month, day] = key.split("-").map(Number);
  const probe = new Date(Date.UTC(year, month - 1, day));
  return probe.getUTCFullYear() === year && probe.getUTCMonth() === month - 1 && probe.getUTCDate() === day;
}

/**
 * The calendar day an instant falls on, in `tz`, as "YYYY-MM-DD".
 *
 * en-CA is the shortcut here: its date format is already ISO-ordered, so there
 * are no parts to reassemble.
 */
export function dayKey(date: Date, tz: string = REPORT_TIME_ZONE): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * How far `tz` is ahead of UTC at a given instant, in milliseconds.
 *
 * Read the instant's wall-clock reading in `tz`, rebuild that reading as though
 * it were UTC, and the difference is the offset in force at that moment — which
 * is what makes this DST-aware rather than assuming a fixed offset per zone.
 */
function zoneOffsetMs(instant: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(instant);

  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value);
  // hour12: false still renders midnight as "24" in some ICU versions.
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
  return asUtc - instant.getTime();
}

/**
 * The instant at which calendar day `key` begins in `tz`.
 *
 * Two passes, because the offset needed to find the moment depends on the
 * moment. The first guess treats the wall clock as UTC and asks what the offset
 * was near there; the second re-reads the offset at the corrected instant, which
 * settles it even when the guess landed on the far side of a DST change.
 */
export function startOfLocalDay(key: string, tz: string = REPORT_TIME_ZONE): Date {
  const [year, month, day] = key.split("-").map(Number);
  const guess = Date.UTC(year, month - 1, day);
  const firstPass = guess - zoneOffsetMs(new Date(guess), tz);
  return new Date(guess - zoneOffsetMs(new Date(firstPass), tz));
}

/** `key` moved by whole calendar days. */
export function addDays(key: string, n: number): string {
  const [year, month, day] = key.split("-").map(Number);
  const moved = new Date(Date.UTC(year, month - 1, day + n));
  return moved.toISOString().slice(0, 10);
}

/**
 * Every day key from `from` to `to`, both ends included.
 *
 * Trends are zero-filled from this, so a quiet Tuesday is a point at zero
 * rather than a gap the chart draws straight through.
 */
export function eachDayKey(from: string, to: string): string[] {
  const keys: string[] = [];
  for (let key = from; key <= to; key = addDays(key, 1)) keys.push(key);
  return keys;
}

export interface ResolvedRange {
  /** Inclusive first calendar day, "YYYY-MM-DD". */
  fromKey: string;
  /** Inclusive last calendar day, "YYYY-MM-DD". */
  toKey: string;
  /** Start of `fromKey`, for `createdAt: { gte }`. */
  gte: Date;
  /** Start of the day *after* `toKey`, for `createdAt: { lt }`. */
  lt: Date;
  days: number;
  timeZone: string;
}

/**
 * Turn `?from=&to=` into a range that the day buckets are guaranteed to fit in.
 *
 * The window is half-open — up to but not including the start of the next day —
 * rather than closed at 23:59:59.999. The old closed form drops anything in the
 * last millisecond of the day, and more importantly it invites the boundary and
 * the bucketing to be computed two different ways. Half-open means
 * `dayKey(order.createdAt)` is always one of `eachDayKey(fromKey, toKey)`, by
 * construction rather than by luck.
 */
export function resolveRange(query: Record<string, unknown>, tz: string = REPORT_TIME_ZONE): ResolvedRange {
  const fromKey = String(query.from ?? "");
  const toKey = String(query.to ?? "");

  if (!DAY_KEY.test(fromKey) || !DAY_KEY.test(toKey)) {
    throw new HttpError(400, "from and to are required, as YYYY-MM-DD dates");
  }
  if (!isRealDay(fromKey) || !isRealDay(toKey)) {
    throw new HttpError(400, "from and to must be real calendar dates");
  }
  if (fromKey > toKey) throw new HttpError(400, "from must not be after to");

  const gte = startOfLocalDay(fromKey, tz);
  const lt = startOfLocalDay(addDays(toKey, 1), tz);

  // Day count from the keys, not from (lt - gte): a DST changeover makes one
  // day 23 or 25 hours long, and a report covering it still spans whole days.
  const days = eachDayKey(fromKey, toKey).length;
  if (days > MAX_RANGE_DAYS) {
    throw new HttpError(400, `Range too large: ${days} days, maximum is ${MAX_RANGE_DAYS}`);
  }

  return { fromKey, toKey, gte, lt, days, timeZone: tz };
}
