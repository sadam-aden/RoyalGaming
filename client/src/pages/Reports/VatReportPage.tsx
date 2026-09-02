import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import { Topbar } from "../../components/layout/Topbar";
import { StatCard } from "../../components/ui/StatCard";
import { Button } from "../../components/ui/Button";
import { reportsApi, type VatReport } from "../../lib/reportsApi";
import { downloadBlob } from "../../lib/download";
import { formatCurrency } from "../../lib/format";
import { presetRange } from "../../components/analytics/DateRangePicker";

export function VatReportPage() {
  const [range, setRange] = useState(presetRange("month"));
  const [report, setReport] = useState<VatReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    reportsApi
      .vat(range.from, range.to)
      .then((r) => setReport(r.data))
      .finally(() => setLoading(false));
  }, [range.from, range.to]);

  async function handleExport() {
    const res = await reportsApi.vatCsv(range.from, range.to);
    downloadBlob(res.data as Blob, `vat-report-${range.from}-to-${range.to}.csv`);
  }

  return (
    <div>
      <Topbar
        title="VAT Report"
        subtitle="Tax summary for a given period"
        actions={
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download size={14} /> Export CSV
          </Button>
        }
      />

      <div className="p-8">
        <div className="flex items-center gap-2">
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

        {loading || !report ? (
          <p className="mt-6 text-sm text-text-muted">Loading...</p>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label="Orders" value={String(report.ordersCount)} />
            <StatCard label="Subtotal" value={formatCurrency(report.subtotal)} />
            <StatCard label="Discounts" value={formatCurrency(report.discountTotal)} />
            <StatCard label="VAT / Tax Collected" value={formatCurrency(report.taxAmount)} tone="accent" />
            <StatCard label="Total (incl. tax)" value={formatCurrency(report.total)} />
          </div>
        )}
      </div>
    </div>
  );
}
