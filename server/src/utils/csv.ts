export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => {
    const str = value === null || value === undefined ? "" : String(value);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const lines = [headers.join(","), ...rows.map((row) => headers.map((h) => escape(row[h])).join(","))];
  return lines.join("\n");
}

/**
 * `bom` prefixes a UTF-8 byte order mark. Excel assumes the system codepage for
 * a .csv without one, which turns any non-ASCII product name into mojibake.
 * Opt-in rather than default so the reports that predate this stay byte-identical.
 */
export function sendCsv(
  res: import("express").Response,
  filename: string,
  rows: Record<string, unknown>[],
  opts: { bom?: boolean } = {},
) {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(opts.bom ? `\uFEFF${toCsv(rows)}` : toCsv(rows));
}
