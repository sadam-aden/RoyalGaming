import { useEffect, useState } from "react";
import { Download, Printer, Receipt, ShoppingBag, TrendingUp, Trophy } from "lucide-react";
import { Topbar } from "../../components/layout/Topbar";
import { Card, CardHeader, CardTitle } from "../../components/ui/Card";
import { StatCard } from "../../components/ui/StatCard";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { PeriodPicker } from "../../components/reports/PeriodPicker";
import { RankedBarChart } from "../../components/reports/RankedBarChart";
import { RevenueTrendChart } from "../../components/analytics/RevenueTrendChart";
import { apiErrorMessage } from "../../lib/api";
import { downloadBlob } from "../../lib/download";
import { formatCurrency } from "../../lib/format";
import { type Period, periodFileSlug, periodFor, periodLabel } from "../../lib/period";
import { printSalesReport } from "../../lib/printSalesReport";
import {
  type RankMetric,
  categoryLabel,
  formatMetric,
  leadersFor,
  metricShare,
  metricValue,
  rankBy,
  rowColor,
} from "../../lib/reportRanking";
import { type SalesRankRow, type SalesReport, salesReportApi } from "../../lib/salesReportApi";

export function SalesReportPage() {
  const [period, setPeriod] = useState<Period>(() => periodFor("daily"));
  const [metric, setMetric] = useState<RankMetric>("quantity");
  const [report, setReport] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    // Stepping through periods quickly fires overlapping requests; without this
    // guard a slow earlier one can land last and show the wrong period's data.
    let cancelled = false;
    setLoading(true);
    setError(null);
    salesReportApi
      .get(period)
      .then((res) => {
        if (!cancelled) setReport(res.data);
      })
      .catch((err) => {
        if (!cancelled) {
          setReport(null);
          setError(apiErrorMessage(err));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period.from, period.to]);

  async function exportCsv() {
    setDownloading(true);
    try {
      const res = await salesReportApi.csv(period);
      downloadBlob(res.data as Blob, `sales-report-${periodFileSlug(period)}.csv`);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setDownloading(false);
    }
  }

  const hasSales = !!report && report.totals.orders > 0;

  return (
    <>
      <Topbar
        title="Sales Report"
        subtitle={periodLabel(period)}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!hasSales || downloading}>
              <Download size={14} />
              Export CSV
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => report && printSalesReport(report, period)}
              disabled={!hasSales}
              title="Opens your print dialog — choose 'Save as PDF' as the destination"
            >
              <Printer size={14} />
              Download PDF
            </Button>
          </div>
        }
      />

      <div className="flex flex-col gap-6 p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PeriodPicker value={period} onChange={setPeriod} />
          <MetricToggle value={metric} onChange={setMetric} />
        </div>

        {error && (
          <div className="rounded-xl border border-danger bg-danger-soft px-4 py-3 text-sm text-text">{error}</div>
        )}

        {loading && <div className="py-16 text-center text-sm text-text-faint">Loading report...</div>}

        {!loading && report && !hasSales && (
          <Card className="py-16 text-center">
            <div className="text-sm text-text-muted">No completed sales in this period.</div>
            <div className="mt-1 text-xs text-text-faint">Pick another period, or check back after the next sale.</div>
          </Card>
        )}

        {!loading && report && hasSales && <ReportBody report={report} metric={metric} />}
      </div>
    </>
  );
}

function ReportBody({ report, metric }: { report: SalesReport; metric: RankMetric }) {
  const categories = rankBy(report.categories, metric);
  const products = rankBy(report.products, metric);
  const leaders = leadersFor(report, metric);
  const measure = metric === "quantity" ? "units sold" : "revenue";

  return (
    <>
      {/* The headline: the question the page exists to answer, answered before
          anything else on the screen. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <LeaderPanel title="Most used category" row={leaders.category} metric={metric} measure={measure} />
        <LeaderPanel title="Most used item" row={leaders.item} metric={metric} measure={measure} showCategory />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Revenue" value={formatCurrency(report.totals.revenue)} icon={TrendingUp} tone="accent" />
        <StatCard label="Orders" value={String(report.totals.orders)} icon={Receipt} />
        <StatCard label="Items Sold" value={String(report.totals.itemsSold)} icon={ShoppingBag} />
        <StatCard label="Avg Order Value" value={formatCurrency(report.totals.avgOrderValue)} icon={Trophy} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Categories by {measure}</CardTitle>
          </CardHeader>
          <RankTable rows={categories} />
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top items by {measure}</CardTitle>
            <span className="text-xs text-text-faint">
              {products.length < report.productCount
                ? `Top ${products.length} of ${report.productCount} products`
                : `${report.productCount} products`}
            </span>
          </CardHeader>
          <RankTable rows={products} showCategory />
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Items ranked by {measure}</CardTitle>
        </CardHeader>
        <RankedBarChart
          data={products.map((p) => ({
            label: p.label,
            value: metricValue(p, metric),
            color: p.color,
          }))}
          valueName={metric === "quantity" ? "Units" : "Revenue"}
          formatValue={(v) => (metric === "quantity" ? String(v) : formatCurrency(v))}
        />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Revenue over time</CardTitle>
        </CardHeader>
        <RevenueTrendChart data={report.trend} />
      </Card>
    </>
  );
}

function MetricToggle({ value, onChange }: { value: RankMetric; onChange: (m: RankMetric) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-text-faint">Rank by</span>
      <div className="flex gap-1 rounded-xl bg-surface-alt p-1">
        {([
          ["quantity", "Units sold"],
          ["revenue", "Revenue"],
        ] as [RankMetric, string][]).map(([m, label]) => (
          <button
            key={m}
            onClick={() => onChange(m)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              value === m ? "bg-accent text-white" : "text-text-muted hover:text-text"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function LeaderPanel({
  title,
  row,
  metric,
  measure,
  showCategory = false,
}: {
  title: string;
  row: SalesRankRow | null;
  metric: RankMetric;
  measure: string;
  showCategory?: boolean;
}) {
  const color = rowColor(row);

  return (
    <Card className="relative overflow-hidden">
      {/* A wash of the category's own colour, so the two panels are told apart
          at a glance rather than by reading them. */}
      <div className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: color }} />
      <div className="pl-3">
        <div className="text-xs font-medium uppercase tracking-wider text-text-faint">{title}</div>
        {row ? (
          <>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-2xl font-semibold text-text">{row.label}</span>
              {showCategory && row.category && <Badge tone="blue">{categoryLabel(row.category)}</Badge>}
            </div>
            <div className="mt-2 text-sm text-text-muted">
              <span className="font-semibold" style={{ color }}>
                {formatMetric(metricValue(row, metric), metric)}
              </span>
              {" · "}
              {metric === "quantity" ? formatCurrency(row.revenue) : `${row.quantity} units`}
              {" · "}
              {metricShare(row, metric)}% of all {measure}
            </div>
          </>
        ) : (
          <div className="mt-2 text-sm text-text-faint">Nothing sold in this period</div>
        )}
      </div>
    </Card>
  );
}

function RankTable({ rows, showCategory = false }: { rows: SalesRankRow[]; showCategory?: boolean }) {
  if (rows.length === 0) {
    return <div className="py-10 text-center text-sm text-text-faint">No data for this period</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-text-faint">
            <th className="py-2 pr-2 font-medium">#</th>
            <th className="py-2 pr-3 font-medium">Name</th>
            <th className="py-2 pr-3 text-right font-medium">Units</th>
            <th className="py-2 text-right font-medium">Revenue</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.key} className="border-b border-border-soft last:border-0">
              <td className="py-2 pr-2 text-text-faint">{i + 1}</td>
              <td className="py-2 pr-3">
                <span className="inline-flex items-center gap-2">
                  {/* The colour dot is what is left of the share bar: it still
                      ties the row to its category everywhere else on the page. */}
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: rowColor(row) }} />
                  <span className="text-text">{row.label}</span>
                </span>
                {showCategory && row.category && (
                  <span className="ml-2 text-xs text-text-faint">{categoryLabel(row.category)}</span>
                )}
              </td>
              <td className="py-2 pr-3 text-right tabular-nums text-text">{row.quantity}</td>
              <td className="py-2 text-right tabular-nums text-text">{formatCurrency(row.revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
