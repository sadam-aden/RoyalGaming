import { Router } from "express";
import { OrderStatus, PaymentMethod } from "@prisma/client";
import { DEFAULT_LOCATION_ID, prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { round2 } from "../utils/pricing";
import { qualifiedProductLabel } from "../utils/productLabel";
import { dayKey, eachDayKey, resolveRange, type ResolvedRange } from "../utils/dateRange";

const router = Router();
router.use(requireAuth);

/**
 * Dates come from the shared resolver, the same one the sales report uses.
 *
 * This used to parse `from`/`to` with `new Date()` — which reads a bare
 * YYYY-MM-DD as UTC midnight — and then push `to` to the end of the day with
 * `setHours(23, 59, 59, 999)`, which is *local*. Meanwhile the day buckets
 * below were keyed off `toISOString()`, UTC again. Three different notions of
 * when a day starts, in one file. On a server away from UTC that put orders in
 * buckets outside the range that fetched them.
 */
const rangeOf = (req: { query: Record<string, unknown> }): ResolvedRange => resolveRange(req.query);

function completedOrdersIn(range: { gte: Date; lt: Date }) {
  return prisma.order.findMany({
    where: completedWhere(range),
    include: { items: { include: { product: { include: { category: true } } } } },
  });
}

const completedWhere = (range: { gte: Date; lt: Date }) => ({
  locationId: DEFAULT_LOCATION_ID,
  status: OrderStatus.COMPLETED,
  createdAt: { gte: range.gte, lt: range.lt },
});

async function kpiSummary(range: { gte: Date; lt: Date }) {
  const orders = await completedOrdersIn(range);
  const cashRevenue = round2(
    orders.filter((o) => o.paymentMethod !== PaymentMethod.CREDIT).reduce((s, o) => s + Number(o.total), 0)
  );
  const creditOutstanding = round2(
    orders.filter((o) => o.paymentMethod === PaymentMethod.CREDIT).reduce((s, o) => s + Number(o.total), 0)
  );
  const expenses = round2(
    (
      await prisma.expense.aggregate({
        where: { locationId: DEFAULT_LOCATION_ID, date: { gte: range.gte, lt: range.lt } },
        _sum: { amount: true },
      })
    )._sum.amount?.toNumber() ?? 0
  );
  const netInflow = round2(cashRevenue - expenses);
  return { cashRevenue, creditOutstanding, expenses, netInflow };
}

const pctChange = (current: number, previous: number) => {
  if (previous === 0) return current === 0 ? 0 : 100;
  return round2(((current - previous) / previous) * 100);
};

router.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const range = rangeOf(req);
    const current = await kpiSummary(range);

    // The equally-long window ending where this one begins. Half-open ranges
    // make that exact: the previous period runs up to, but not into, `gte`.
    const span = range.gte.getTime() - range.lt.getTime();
    const previous = await kpiSummary({ gte: new Date(range.gte.getTime() + span), lt: range.gte });

    res.json({
      current,
      previous,
      change: {
        cashRevenue: pctChange(current.cashRevenue, previous.cashRevenue),
        creditOutstanding: pctChange(current.creditOutstanding, previous.creditOutstanding),
        expenses: pctChange(current.expenses, previous.expenses),
        netInflow: pctChange(current.netInflow, previous.netInflow),
      },
    });
  })
);

router.get(
  "/revenue-trend",
  asyncHandler(async (req, res) => {
    const range = rangeOf(req);
    const orders = await completedOrdersIn(range);
    const byDay = new Map<string, number>();
    for (const o of orders) {
      const key = dayKey(o.createdAt, range.timeZone);
      byDay.set(key, round2((byDay.get(key) ?? 0) + Number(o.total)));
    }
    // Zero-filled: a day with no sales is a point at zero, not a gap the line
    // is drawn straight through as though the days either side were adjacent.
    res.json(eachDayKey(range.fromKey, range.toKey).map((date) => ({ date, revenue: byDay.get(date) ?? 0 })));
  })
);

router.get(
  "/revenue-by-category",
  asyncHandler(async (req, res) => {
    const range = rangeOf(req);
    const orders = await completedOrdersIn(range);
    // Keyed by id, not by name: a category renamed mid-period is still one
    // category, and two categories may not share a name anyway.
    const byCategory = new Map<string, { category: string; name: string; color: string; revenue: number; quantity: number }>();
    for (const o of orders) {
      for (const item of o.items) {
        const { id, name, color } = item.product.category;
        const acc = byCategory.get(id) ?? { category: id, name, color, revenue: 0, quantity: 0 };
        acc.revenue = round2(acc.revenue + Number(item.lineTotal));
        acc.quantity += item.quantity;
        byCategory.set(id, acc);
      }
    }
    res.json([...byCategory.values()].sort((a, b) => b.revenue - a.revenue));
  })
);

router.get(
  "/revenue-by-product",
  asyncHandler(async (req, res) => {
    const range = rangeOf(req);
    const orders = await completedOrdersIn(range);
    const byProduct = new Map<string, { name: string; revenue: number; quantity: number }>();
    for (const o of orders) {
      for (const item of o.items) {
        const existing = byProduct.get(item.productId) ?? { name: qualifiedProductLabel(item.product), revenue: 0, quantity: 0 };
        existing.revenue = round2(existing.revenue + Number(item.lineTotal));
        existing.quantity += item.quantity;
        byProduct.set(item.productId, existing);
      }
    }
    const top = [...byProduct.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10);
    res.json(top);
  })
);

/** Most recent receipts in the range, with what was on them. */
router.get(
  "/recent-orders",
  asyncHandler(async (req, res) => {
    const range = rangeOf(req);
    const requested = Number(req.query.limit ?? 10);
    const limit = Number.isFinite(requested) ? Math.min(Math.max(Math.trunc(requested), 1), 50) : 10;
    const where = completedWhere(range);

    // The list is `take`-limited rather than filtered in memory, and the two
    // totals are counted in the database, so a busy month does not have to be
    // loaded in full just to show the last ten receipts.
    const [recent, totalOrders, itemsAgg] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { items: { include: { product: { include: { category: true } } } } },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.order.count({ where }),
      prisma.orderItem.aggregate({ where: { order: where }, _sum: { quantity: true } }),
    ]);

    res.json({
      orders: recent.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        createdAt: o.createdAt,
        total: Number(o.total),
        paymentMethod: o.paymentMethod,
        items: o.items.map((i) => ({
          name: qualifiedProductLabel(i.product),
          quantity: i.quantity,
          lineTotal: Number(i.lineTotal),
        })),
      })),
      totalOrders,
      totalItems: itemsAgg._sum.quantity ?? 0,
    });
  })
);

export default router;
