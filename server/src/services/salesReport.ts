import { OrderStatus } from "@prisma/client";
import { DEFAULT_LOCATION_ID, prisma } from "../lib/prisma";
import { round2 } from "../utils/pricing";
import { qualifiedProductLabel } from "../utils/productLabel";
import { dayKey, eachDayKey, type ResolvedRange } from "../utils/dateRange";

/**
 * The sales report behind GET /api/reports/sales.
 *
 * Its job is the question the rest of the reporting never answers: which
 * category and which item actually moved. Everything else here ranks by money
 * — /reports/weekly's topProducts, /analytics/revenue-by-product — so a cheap
 * item sold sixty times ranks below an expensive one sold twice. Both numbers
 * are carried on every row so the caller can rank either way without a refetch.
 */

export interface SalesTotals {
  /** Σ order.total — what was actually taken, tax included. */
  revenue: number;
  /** Σ (subtotal − discount). This is what the per-line rollups add up to. */
  netSales: number;
  tax: number;
  discounts: number;
  orders: number;
  itemsSold: number;
  avgOrderValue: number;
  expenses: number;
  netInflow: number;
}

export interface SalesRankRow {
  /** Category id for category rows, product id for item rows. */
  key: string;
  label: string;
  /** Owning category name — item rows only, so the UI can badge them. */
  category?: string;
  /** The category colour, so a category looks the same everywhere it appears. */
  color: string;
  /** Units sold. This is "most used". */
  quantity: number;
  /** Σ lineTotal. */
  revenue: number;
  /** How many distinct orders contained it — a different story from quantity. */
  orders: number;
  /** Percent of totals.itemsSold, one decimal place. */
  quantityShare: number;
  /** Percent of totals.netSales, one decimal place. */
  revenueShare: number;
}

export interface SalesTrendPoint {
  date: string;
  revenue: number;
  orders: number;
  items: number;
}

export interface SalesReport {
  range: { from: string; to: string; timeZone: string; days: number };
  generatedAt: string;
  totals: SalesTotals;
  /** All five categories, including the ones that sold nothing. */
  categories: SalesRankRow[];
  /** The top `limit` items by revenue; re-rank client-side for units. */
  products: SalesRankRow[];
  /** Distinct products sold in the range, so the UI can say "top 15 of 37". */
  productCount: number;
  /** One point per calendar day, zero-filled. */
  trend: SalesTrendPoint[];
  highlights: {
    topCategoryByQuantity: SalesRankRow | null;
    topCategoryByRevenue: SalesRankRow | null;
    topItemByQuantity: SalesRankRow | null;
    topItemByRevenue: SalesRankRow | null;
  };
}

interface RankAccumulator {
  key: string;
  label: string;
  category?: string;
  color: string;
  quantity: number;
  revenue: number;
  orders: number;
}

/** Percent to one decimal place, and 0 rather than NaN when nothing sold. */
const share = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);

/**
 * Highest by `metric`, or null when nothing sold.
 *
 * Ties break on the other measure — four drinks can easily sell nine each, and
 * the headline has to name the same one the table underneath puts first. The
 * client's rankBy breaks ties the same way; if these two disagreed, the page
 * would announce one winner and then list a different one directly below it.
 */
function leader(rows: SalesRankRow[], metric: "quantity" | "revenue"): SalesRankRow | null {
  const other = metric === "quantity" ? "revenue" : "quantity";
  let best: SalesRankRow | null = null;
  for (const row of rows) {
    if (row[metric] <= 0) continue;
    if (!best || row[metric] > best[metric] || (row[metric] === best[metric] && row[other] > best[other])) best = row;
  }
  return best;
}

export async function buildSalesReport(range: ResolvedRange, limit: number): Promise<SalesReport> {
  const [orders, expensesAgg, allCategories] = await Promise.all([
    prisma.order.findMany({
      where: {
        locationId: DEFAULT_LOCATION_ID,
        status: OrderStatus.COMPLETED,
        createdAt: { gte: range.gte, lt: range.lt },
      },
      include: { items: { include: { product: { include: { category: true } } } } },
    }),
    prisma.expense.aggregate({
      where: { locationId: DEFAULT_LOCATION_ID, date: { gte: range.gte, lt: range.lt } },
      _sum: { amount: true },
    }),
    prisma.productCategory.findMany({
      where: { locationId: DEFAULT_LOCATION_ID, active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  // Seeded with every live category, so a quiet day still renders a full table
  // rather than one lonely row. A category that has been switched off but still
  // has sales in this period gets added below when its first line is seen, so
  // retiring a category never makes past takings disappear from the report.
  const byCategory = new Map<string, RankAccumulator>(
    allCategories.map((c) => [c.id, { key: c.id, label: c.name, color: c.color, quantity: 0, revenue: 0, orders: 0 }]),
  );
  const byProduct = new Map<string, RankAccumulator>();
  const byDay = new Map<string, { revenue: number; orders: number; items: number }>();

  let revenue = 0;
  let netSales = 0;
  let tax = 0;
  let discounts = 0;
  let itemsSold = 0;

  for (const order of orders) {
    const orderTotal = Number(order.total);
    revenue += orderTotal;
    netSales += Number(order.subtotal) - Number(order.discountAmount);
    tax += Number(order.taxAmount);
    discounts += Number(order.discountAmount);

    const key = dayKey(order.createdAt, range.timeZone);
    const day = byDay.get(key) ?? { revenue: 0, orders: 0, items: 0 };
    day.revenue += orderTotal;
    day.orders += 1;
    byDay.set(key, day);

    // An order counts once towards a product's or category's order count no
    // matter how many lines of it there are — two lines of Espresso is still
    // one order that wanted Espresso.
    const seenProducts = new Set<string>();
    const seenCategories = new Set<string>();

    for (const item of order.items) {
      const lineTotal = Number(item.lineTotal);
      itemsSold += item.quantity;
      day.items += item.quantity;

      const product = byProduct.get(item.productId) ?? {
        key: item.productId,
        // Time packages share names ("1 Hour") across PlayStation, Table Games
        // and Skating; unqualified they would collapse into one meaningless row.
        label: qualifiedProductLabel(item.product),
        category: item.product.category.name,
        color: item.product.category.color,
        quantity: 0,
        revenue: 0,
        orders: 0,
      };
      product.quantity += item.quantity;
      product.revenue += lineTotal;
      if (!seenProducts.has(item.productId)) {
        product.orders += 1;
        seenProducts.add(item.productId);
      }
      byProduct.set(item.productId, product);

      const categoryId = item.product.category.id;
      const category =
        byCategory.get(categoryId) ??
        ({
          key: categoryId,
          label: item.product.category.name,
          color: item.product.category.color,
          quantity: 0,
          revenue: 0,
          orders: 0,
        } satisfies RankAccumulator);
      category.quantity += item.quantity;
      category.revenue += lineTotal;
      if (!seenCategories.has(categoryId)) {
        category.orders += 1;
        seenCategories.add(categoryId);
      }
      byCategory.set(categoryId, category);
    }
  }

  const expenses = round2(expensesAgg._sum.amount?.toNumber() ?? 0);
  const totals: SalesTotals = {
    revenue: round2(revenue),
    netSales: round2(netSales),
    tax: round2(tax),
    discounts: round2(discounts),
    orders: orders.length,
    itemsSold,
    avgOrderValue: orders.length > 0 ? round2(revenue / orders.length) : 0,
    expenses,
    netInflow: round2(revenue - expenses),
  };

  // Shares are taken against the full totals, never against the truncated list,
  // so the percentages in a top-15 table still mean "of everything sold".
  const finalise = (acc: RankAccumulator): SalesRankRow => ({
    key: acc.key,
    label: acc.label,
    ...(acc.category ? { category: acc.category } : {}),
    color: acc.color,
    quantity: acc.quantity,
    revenue: round2(acc.revenue),
    orders: acc.orders,
    quantityShare: share(acc.quantity, totals.itemsSold),
    revenueShare: share(acc.revenue, totals.netSales),
  });

  const categories = [...byCategory.values()].map(finalise).sort((a, b) => b.revenue - a.revenue || b.quantity - a.quantity);
  const allProducts = [...byProduct.values()].map(finalise).sort((a, b) => b.revenue - a.revenue || b.quantity - a.quantity);

  const trend: SalesTrendPoint[] = eachDayKey(range.fromKey, range.toKey).map((date) => {
    const bucket = byDay.get(date);
    return {
      date,
      revenue: round2(bucket?.revenue ?? 0),
      orders: bucket?.orders ?? 0,
      items: bucket?.items ?? 0,
    };
  });

  return {
    range: { from: range.fromKey, to: range.toKey, timeZone: range.timeZone, days: range.days },
    generatedAt: new Date().toISOString(),
    totals,
    categories,
    // Highlights read the full list, so the leader is the real leader even if
    // the table below is cut short.
    products: allProducts.slice(0, limit),
    productCount: allProducts.length,
    trend,
    highlights: {
      topCategoryByQuantity: leader(categories, "quantity"),
      topCategoryByRevenue: leader(categories, "revenue"),
      topItemByQuantity: leader(allProducts, "quantity"),
      topItemByRevenue: leader(allProducts, "revenue"),
    },
  };
}

/**
 * The report as one flat CSV table.
 *
 * Deliberately uniform: toCsv takes its headers from the first row alone, so a
 * file whose sections had different shapes would silently lose every column the
 * first row did not have. One key set for every row also means the whole thing
 * pivots in a spreadsheet without being cut up first.
 */
export function salesReportCsvRows(report: SalesReport): Record<string, unknown>[] {
  const row = (
    section: string,
    rank: number | "",
    label: string,
    category: string,
    quantity: number | "",
    value: number | "",
    quantityShare: number | "",
    revenueShare: number | "",
  ) => ({ section, rank, label, category, quantity, revenue: value, quantityShare, revenueShare });

  const { totals } = report;
  const rows: Record<string, unknown>[] = [
    // A SUMMARY row always comes first, which also means toCsv is never handed
    // an empty array (its "" return would produce a file with no header line).
    row("SUMMARY", "", "Period", `${report.range.from} to ${report.range.to}`, "", "", "", ""),
    row("SUMMARY", "", "Timezone", report.range.timeZone, "", "", "", ""),
    row("SUMMARY", "", "Revenue", "", "", totals.revenue, "", ""),
    row("SUMMARY", "", "Net sales", "", "", totals.netSales, "", ""),
    row("SUMMARY", "", "Tax", "", "", totals.tax, "", ""),
    row("SUMMARY", "", "Discounts", "", "", totals.discounts, "", ""),
    row("SUMMARY", "", "Orders", "", totals.orders, "", "", ""),
    row("SUMMARY", "", "Items sold", "", totals.itemsSold, "", "", ""),
    row("SUMMARY", "", "Average order value", "", "", totals.avgOrderValue, "", ""),
    row("SUMMARY", "", "Expenses", "", "", totals.expenses, "", ""),
    row("SUMMARY", "", "Net inflow", "", "", totals.netInflow, "", ""),
  ];

  report.categories.forEach((c, i) =>
    rows.push(row("CATEGORY", i + 1, c.label, c.label, c.quantity, c.revenue, c.quantityShare, c.revenueShare)),
  );
  report.products.forEach((p, i) =>
    rows.push(
      row("ITEM", i + 1, p.label, p.category ?? "", p.quantity, p.revenue, p.quantityShare, p.revenueShare),
    ),
  );
  report.trend.forEach((d) => rows.push(row("DAY", "", d.date, "", d.items, d.revenue, "", "")));

  return rows;
}

