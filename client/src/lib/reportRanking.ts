import { CATEGORICAL_ORDER } from "./chartTheme";
import { formatCurrency } from "./format";
import type { SalesRankRow, SalesReport } from "./salesReportApi";

/**
 * How the report is currently being ranked.
 *
 * The whole point of the page is "which category or item is most used", and
 * "most" has two honest answers — how many went out, and how much they earned.
 * The payload carries both on every row, so switching between them is a re-sort
 * here rather than another request.
 */
export type RankMetric = "quantity" | "revenue";

/**
 * The colour for a ranked row.
 *
 * Every row carries its category's own colour now — the one the admin picked
 * on the Products page — so there is nothing to look up and no fixed palette
 * position to drift out of step when a category is added or removed.
 */
export function rowColor(row: SalesRankRow | null | undefined): string {
  return row?.color ?? CATEGORICAL_ORDER[0];
}

/** Item rows carry their owning category's name; category rows are named by their label. */
export const categoryLabel = (name?: string) => name ?? "";

export const metricValue = (row: SalesRankRow, metric: RankMetric) =>
  metric === "quantity" ? row.quantity : row.revenue;

export const metricShare = (row: SalesRankRow, metric: RankMetric) =>
  metric === "quantity" ? row.quantityShare : row.revenueShare;

export const formatMetric = (value: number, metric: RankMetric) =>
  metric === "quantity" ? `${value} ${value === 1 ? "unit" : "units"}` : formatCurrency(value);

/** Highest first, with the other measure breaking ties so the order is stable. */
export function rankBy(rows: SalesRankRow[], metric: RankMetric): SalesRankRow[] {
  return [...rows].sort(
    (a, b) => metricValue(b, metric) - metricValue(a, metric) || metricValue(b, other(metric)) - metricValue(a, other(metric)),
  );
}

const other = (metric: RankMetric): RankMetric => (metric === "quantity" ? "revenue" : "quantity");

/** The two headline rows, for whichever measure is selected. */
export function leadersFor(report: SalesReport, metric: RankMetric) {
  const { highlights } = report;
  return metric === "quantity"
    ? { category: highlights.topCategoryByQuantity, item: highlights.topItemByQuantity }
    : { category: highlights.topCategoryByRevenue, item: highlights.topItemByRevenue };
}
