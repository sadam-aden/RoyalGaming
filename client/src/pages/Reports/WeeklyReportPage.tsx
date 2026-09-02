import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Topbar } from "../../components/layout/Topbar";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { StatCard } from "../../components/ui/StatCard";
import { RevenueByProductChart } from "../../components/analytics/RevenueByProductChart";
import { reportsApi, type WeeklyReport } from "../../lib/reportsApi";
import { downloadBlob } from "../../lib/download";
import { formatCurrency } from "../../lib/format";

export function WeeklyReportPage() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    reportsApi
      .weekly(date)
      .then((r) => setReport(r.data))
      .finally(() => setLoading(false));
  }, [date]);

  async function handleExport() {
    const res = await reportsApi.weeklyCsv(date);
    downloadBlob(res.data as Blob, `weekly-report-${date}.csv`);
  }

  return (
    <div>
      <Topbar
        title="Weekly Report"
        subtitle="Auto-generated summary of revenue, expenses, and sessions"
        actions={
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download size={14} /> Export CSV
          </Button>
        }
      />

      <div className="p-8">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-border bg-surface-alt px-3 py-1.5 text-sm text-text outline-none"
        />

        {loading || !report ? (
          <p className="mt-6 text-sm text-text-muted">Loading...</p>
        ) : (
          <>
            <p className="mt-4 text-sm text-text-muted">
              Week of {format(new Date(report.weekStart), "MMM d")} – {format(new Date(report.weekEnd), "MMM d, yyyy")}
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Revenue" value={formatCurrency(report.revenue)} tone="accent" />
              <StatCard label="Expenses" value={formatCurrency(report.expenses)} />
              <StatCard label="Net Inflow" value={formatCurrency(report.netInflow)} />
              <StatCard label="Orders / Sessions" value={`${report.ordersCount} / ${report.sessionsCount}`} />
            </div>

            <Card className="mt-6">
              <h3 className="mb-4 text-sm font-semibold text-text">Top Products</h3>
              <RevenueByProductChart data={report.topProducts} />
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
