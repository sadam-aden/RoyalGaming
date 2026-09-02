import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import { Topbar } from "../../components/layout/Topbar";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { reportsApi } from "../../lib/reportsApi";
import { downloadBlob } from "../../lib/download";
import { presetRange } from "../../components/analytics/DateRangePicker";

export function GeneralReportsPage() {
  const [range, setRange] = useState(presetRange("month"));
  const [type, setType] = useState<"orders" | "sessions">("orders");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    reportsApi
      .general(range.from, range.to, type)
      .then((r) => setRows(r.data))
      .finally(() => setLoading(false));
  }, [range.from, range.to, type]);

  async function handleExport() {
    const res = await reportsApi.generalCsv(range.from, range.to, type);
    downloadBlob(res.data as Blob, `${type}-${range.from}-to-${range.to}.csv`);
  }

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div>
      <Topbar
        title="General Reports"
        subtitle="Flexible export for orders and sessions"
        actions={
          <Button variant="outline" size="sm" onClick={handleExport} disabled={rows.length === 0}>
            <Download size={14} /> Export CSV
          </Button>
        }
      />

      <div className="p-8">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-xl bg-surface-alt p-1">
            {(["orders", "sessions"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  type === t ? "bg-accent text-white" : "text-text-muted hover:text-text"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <input
            type="date"
            value={range.from}
            onChange={(e) => setRange({ ...range, from: e.target.value })}
            className="rounded-lg border border-border bg-surface-alt px-3 py-1.5 text-sm text-text outline-none"
          />
          <span className="text-text-faint">to</span>
          <input
            type="date"
            value={range.to}
            onChange={(e) => setRange({ ...range, to: e.target.value })}
            className="rounded-lg border border-border bg-surface-alt px-3 py-1.5 text-sm text-text outline-none"
          />
        </div>

        <Card className="mt-6">
          {loading ? (
            <p className="text-sm text-text-muted">Loading...</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-text-faint">No records for this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border-soft text-xs uppercase tracking-wide text-text-faint">
                    {columns.map((c) => (
                      <th key={c} className="whitespace-nowrap pb-3 pr-4 font-medium">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className="border-b border-border-soft/60 text-text">
                      {columns.map((c) => (
                        <td key={c} className="whitespace-nowrap py-2.5 pr-4 text-text-muted">
                          {String(row[c] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
