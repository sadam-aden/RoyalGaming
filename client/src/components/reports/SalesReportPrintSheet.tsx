import { format } from "date-fns";
import { formatCurrency } from "../../lib/format";
import { type Period, periodLabel } from "../../lib/period";
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
import type { SalesRankRow, SalesReport } from "../../lib/salesReportApi";

/**
 * The report as it goes on paper.
 *
 * A separate rendering from the screen for two reasons. The app is dark and
 * paper is not, so every colour has to be restated light-on-white. And there
 * are deliberately no recharts here: ResponsiveContainer measures its parent
 * and animates in, so a tree rendered off-screen and printed a moment later can
 * be caught at zero width or mid-animation. Plain tables print exactly as laid
 * out — and read better on paper than a dark SVG.
 */
export function SalesReportPrintSheet({
  report,
  period,
  metric,
}: {
  report: SalesReport;
  period: Period;
  metric: RankMetric;
}) {
  const categories = rankBy(report.categories, metric);
  const products = rankBy(report.products, metric);
  const leaders = leadersFor(report, metric);
  const measure = metric === "quantity" ? "units sold" : "revenue";

  return (
    <div className="report-sheet-body">
      <header className="report-section report-head">
        <div>
          <h1>Royal Gaming &amp; Cafeteria</h1>
          <p className="report-subtitle">Sales Report &middot; {periodLabel(period)}</p>
        </div>
        <div className="report-meta">
          <div>Generated {format(new Date(report.generatedAt), "d MMM yyyy, HH:mm")}</div>
          <div>
            {report.range.from} to {report.range.to} &middot; {report.range.days}{" "}
            {report.range.days === 1 ? "day" : "days"}
          </div>
          <div>Ranked by {measure}</div>
        </div>
      </header>

      <section className="report-section report-leaders">
        <LeaderBlock title="Most used category" row={leaders.category} metric={metric} measure={measure} isItem={false} />
        <LeaderBlock title="Most used item" row={leaders.item} metric={metric} measure={measure} isItem />
      </section>

      <section className="report-section report-kpis">
        <Kpi label="Revenue" value={formatCurrency(report.totals.revenue)} />
        <Kpi label="Orders" value={String(report.totals.orders)} />
        <Kpi label="Items sold" value={String(report.totals.itemsSold)} />
        <Kpi label="Avg order value" value={formatCurrency(report.totals.avgOrderValue)} />
        <Kpi label="Discounts" value={formatCurrency(report.totals.discounts)} />
        <Kpi label="Tax" value={formatCurrency(report.totals.tax)} />
        <Kpi label="Expenses" value={formatCurrency(report.totals.expenses)} />
        <Kpi label="Net inflow" value={formatCurrency(report.totals.netInflow)} />
      </section>

      <section className="report-section">
        <h2>Categories by {measure}</h2>
        <RankTable rows={categories} isItem={false} />
      </section>

      <section className="report-section">
        <h2>
          Items by {measure}
          {products.length < report.productCount && (
            <span className="report-note">
              {" "}
              top {products.length} of {report.productCount}
            </span>
          )}
        </h2>
        <RankTable rows={products} isItem />
      </section>

      {/* On a one-day report this table is a single row restating the totals
          above it, so it only earns its space once there is a day to compare. */}
      {report.trend.length > 1 && (
      <section className="report-section">
        <h2>Daily breakdown</h2>
        <table className="report-table">
          <thead>
            <tr>
              <th>Date</th>
              <th className="num">Orders</th>
              <th className="num">Items</th>
              <th className="num">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {report.trend.map((d) => (
              <tr key={d.date}>
                <td>{format(new Date(`${d.date}T00:00:00`), "EEE d MMM yyyy")}</td>
                <td className="num">{d.orders}</td>
                <td className="num">{d.items}</td>
                <td className="num">{formatCurrency(d.revenue)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>Total</td>
              <td className="num">{report.totals.orders}</td>
              <td className="num">{report.totals.itemsSold}</td>
              <td className="num">{formatCurrency(report.totals.revenue)}</td>
            </tr>
          </tfoot>
        </table>
      </section>
      )}

    </div>
  );
}

function LeaderBlock({
  title,
  row,
  metric,
  measure,
  isItem,
}: {
  title: string;
  row: SalesRankRow | null;
  metric: RankMetric;
  measure: string;
  isItem: boolean;
}) {
  return (
    <div className="report-leader" style={{ borderLeftColor: rowColor(row) }}>
      <div className="report-leader-title">{title}</div>
      {row ? (
        <>
          <div className="report-leader-name">{row.label}</div>
          <div className="report-leader-detail">
            <strong>{formatMetric(metricValue(row, metric), metric)}</strong>
            {" · "}
            {metric === "quantity" ? formatCurrency(row.revenue) : `${row.quantity} units`}
            {" · "}
            {metricShare(row, metric)}% of all {measure}
            {isItem && row.category ? ` · ${categoryLabel(row.category)}` : ""}
          </div>
        </>
      ) : (
        <div className="report-leader-detail">Nothing sold in this period</div>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="report-kpi">
      <div className="report-kpi-label">{label}</div>
      <div className="report-kpi-value">{value}</div>
    </div>
  );
}

function RankTable({ rows, isItem }: { rows: SalesRankRow[]; isItem: boolean }) {
  if (rows.length === 0) return <p className="report-note">No data for this period.</p>;

  return (
    <table className="report-table">
      <thead>
        <tr>
          <th className="rank">#</th>
          <th>Name</th>
          {isItem && <th>Category</th>}
          <th className="num">Units</th>
          <th className="num">Revenue</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={row.key}>
            <td className="rank">{i + 1}</td>
            <td>
              {/* The category's colour, kept as a dot now that the share bar is
                  gone, so the printed rows still group by eye. */}
              <span className="report-dot" style={{ backgroundColor: rowColor(row) }} />
              {row.label}
            </td>
            {isItem && <td>{categoryLabel(row.category)}</td>}
            <td className="num">{row.quantity}</td>
            <td className="num">{formatCurrency(row.revenue)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
