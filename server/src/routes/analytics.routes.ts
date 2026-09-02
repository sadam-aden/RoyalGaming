import { Router } from "express";
import { OrderStatus, PaymentMethod } from "@prisma/client";
import { DEFAULT_LOCATION_ID, prisma } from "../lib/prisma";
import { asyncHandler, HttpError } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { round2 } from "../utils/pricing";
import { qualifiedProductLabel } from "../utils/productLabel";

const router = Router();
router.use(requireAuth);

function parseRange(req: { query: Record<string, unknown> }) {
  const from = typeof req.query.from === "string" ? new Date(req.query.from) : null;
  const to = typeof req.query.to === "string" ? new Date(req.query.to) : null;
  if (!from || !to || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new HttpError(400, "Query params 'from' and 'to' (ISO dates) are required");
  }
  // make 'to' inclusive of the whole day if only a date (no time) was given
  const inclusiveTo = new Date(to);
  if (req.query.to && (req.query.to as string).length <= 10) inclusiveTo.setHours(23, 59, 59, 999);
  return { from, to: inclusiveTo };
}

async function completedOrdersInRange(from: Date, to: Date) {
  return prisma.order.findMany({
    where: { locationId: DEFAULT_LOCATION_ID, status: OrderStatus.COMPLETED, createdAt: { gte: from, lte: to } },
    include: { items: { include: { product: true } } },
  });
}

async function kpiSummary(from: Date, to: Date) {
  const orders = await completedOrdersInRange(from, to);
  const cashRevenue = round2(
    orders.filter((o) => o.paymentMethod !== PaymentMethod.CREDIT).reduce((s, o) => s + Number(o.total), 0)
  );
  const creditOutstanding = round2(
    orders.filter((o) => o.paymentMethod === PaymentMethod.CREDIT).reduce((s, o) => s + Number(o.total), 0)
  );
  const expenses = round2(
    (
      await prisma.expense.aggregate({
        where: { locationId: DEFAULT_LOCATION_ID, date: { gte: from, lte: to } },
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
    const { from, to } = parseRange(req);
    const current = await kpiSummary(from, to);

    const rangeMs = to.getTime() - from.getTime();
    const prevTo = new Date(from.getTime() - 1);
    const prevFrom = new Date(prevTo.getTime() - rangeMs);
    const previous = await kpiSummary(prevFrom, prevTo);

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
    const { from, to } = parseRange(req);
    const orders = await completedOrdersInRange(from, to);
    const byDay = new Map<string, number>();
    for (const o of orders) {
      const key = o.createdAt.toISOString().slice(0, 10);
      byDay.set(key, round2((byDay.get(key) ?? 0) + Number(o.total)));
    }
    const days = [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, revenue]) => ({ date, revenue }));
    res.json(days);
  })
);

router.get(
  "/revenue-by-category",
  asyncHandler(async (req, res) => {
    const { from, to } = parseRange(req);
    const orders = await completedOrdersInRange(from, to);
    const byCategory = new Map<string, number>();
    for (const o of orders) {
      for (const item of o.items) {
        const key = item.product.category;
        byCategory.set(key, round2((byCategory.get(key) ?? 0) + Number(item.lineTotal)));
      }
    }
    res.json([...byCategory.entries()].map(([category, revenue]) => ({ category, revenue })));
  })
);

router.get(
  "/revenue-by-product",
  asyncHandler(async (req, res) => {
    const { from, to } = parseRange(req);
    const orders = await completedOrdersInRange(from, to);
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

router.get(
  "/payment-methods",
  asyncHandler(async (req, res) => {
    const { from, to } = parseRange(req);
    const orders = await completedOrdersInRange(from, to);
    const byMethod = new Map<string, number>();
    for (const o of orders) {
      const key = o.paymentMethod ?? "UNKNOWN";
      byMethod.set(key, round2((byMethod.get(key) ?? 0) + Number(o.total)));
    }
    res.json([...byMethod.entries()].map(([method, amount]) => ({ method, amount })));
  })
);

router.get(
  "/orders-trend",
  asyncHandler(async (req, res) => {
    const { from, to } = parseRange(req);
    const orders = await completedOrdersInRange(from, to);
    const byDay = new Map<string, { orders: number; items: number }>();
    for (const o of orders) {
      const key = o.createdAt.toISOString().slice(0, 10);
      const existing = byDay.get(key) ?? { orders: 0, items: 0 };
      existing.orders += 1;
      existing.items += o.items.reduce((s, i) => s + i.quantity, 0);
      byDay.set(key, existing);
    }
    const days = [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v }));
    res.json(days);
  })
);

export default router;
