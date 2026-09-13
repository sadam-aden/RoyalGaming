import { Router } from "express";
import { OrderStatus } from "@prisma/client";
import { DEFAULT_LOCATION_ID, prisma } from "../lib/prisma";
import { asyncHandler, HttpError } from "../utils/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { round2 } from "../utils/pricing";
import { sendCsv } from "../utils/csv";
import { qualifiedProductLabel } from "../utils/productLabel";
import { resolveRange } from "../utils/dateRange";
import { buildSalesReport, salesReportCsvRows } from "../services/salesReport";

const router = Router();
router.use(requireAuth, requireRole("ADMIN"));

/** How many ranked items the report returns when the caller does not say. */
const DEFAULT_ITEM_LIMIT = 15;
const MAX_ITEM_LIMIT = 200;

/**
 * Sales report for any span of whole days.
 *
 * The one endpoint the Sales Report page calls: totals, category and item
 * rankings, a daily trend and the payment split, all in a single response so
 * changing the period is one request rather than six.
 *
 * Rankings carry both units and money, and the page re-sorts them client-side —
 * so the "most used" question can be asked either way without coming back here.
 */
router.get(
  "/sales",
  asyncHandler(async (req, res) => {
    const range = resolveRange(req.query as Record<string, unknown>);
    const requested = Number(req.query.limit ?? DEFAULT_ITEM_LIMIT);
    const limit = Number.isFinite(requested) ? Math.min(Math.max(Math.trunc(requested), 1), MAX_ITEM_LIMIT) : DEFAULT_ITEM_LIMIT;

    const report = await buildSalesReport(range, limit);

    if (req.query.format === "csv") {
      // BOM on, unlike the older exports: this file carries product names.
      return sendCsv(res, `sales-report-${range.fromKey}-to-${range.toKey}.csv`, salesReportCsvRows(report), { bom: true });
    }

    res.json(report);
  })
);

function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day + 6) % 7; // Monday as start of week
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

router.get(
  "/weekly",
  asyncHandler(async (req, res) => {
    const anchor = typeof req.query.date === "string" ? new Date(req.query.date) : new Date();
    if (Number.isNaN(anchor.getTime())) throw new HttpError(400, "Invalid date");
    const weekStart = startOfWeek(anchor);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const [orders, expensesAgg, sessionsCount] = await Promise.all([
      prisma.order.findMany({
        where: {
          locationId: DEFAULT_LOCATION_ID,
          status: OrderStatus.COMPLETED,
          createdAt: { gte: weekStart, lt: weekEnd },
        },
        include: { items: { include: { product: { include: { category: true } } } } },
      }),
      prisma.expense.aggregate({
        where: { locationId: DEFAULT_LOCATION_ID, date: { gte: weekStart, lt: weekEnd } },
        _sum: { amount: true },
      }),
      prisma.session.count({
        where: { station: { locationId: DEFAULT_LOCATION_ID }, startedAt: { gte: weekStart, lt: weekEnd } },
      }),
    ]);

    const revenue = round2(orders.reduce((s, o) => s + Number(o.total), 0));
    const expenses = round2(expensesAgg._sum.amount?.toNumber() ?? 0);

    const productTotals = new Map<string, { name: string; revenue: number; quantity: number }>();
    for (const o of orders) {
      for (const item of o.items) {
        const existing = productTotals.get(item.productId) ?? { name: qualifiedProductLabel(item.product), revenue: 0, quantity: 0 };
        existing.revenue = round2(existing.revenue + Number(item.lineTotal));
        existing.quantity += item.quantity;
        productTotals.set(item.productId, existing);
      }
    }
    const topProducts = [...productTotals.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    const payload = {
      weekStart,
      weekEnd,
      revenue,
      expenses,
      netInflow: round2(revenue - expenses),
      ordersCount: orders.length,
      sessionsCount,
      topProducts,
    };

    if (req.query.format === "csv") {
      return sendCsv(res, `weekly-report-${weekStart.toISOString().slice(0, 10)}.csv`, [
        { metric: "Week Start", value: weekStart.toISOString().slice(0, 10) },
        { metric: "Week End", value: weekEnd.toISOString().slice(0, 10) },
        { metric: "Revenue", value: revenue },
        { metric: "Expenses", value: expenses },
        { metric: "Net Inflow", value: payload.netInflow },
        { metric: "Orders", value: orders.length },
        { metric: "Sessions", value: sessionsCount },
        ...topProducts.map((p, i) => ({ metric: `Top Product #${i + 1}`, value: `${p.name} (${p.revenue})` })),
      ]);
    }

    res.json(payload);
  })
);

router.get(
  "/vat",
  asyncHandler(async (req, res) => {
    const { from, to } = req.query as { from?: string; to?: string };
    if (!from || !to) throw new HttpError(400, "'from' and 'to' query params are required");
    const start = new Date(from);
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);

    const orders = await prisma.order.findMany({
      where: { locationId: DEFAULT_LOCATION_ID, status: OrderStatus.COMPLETED, createdAt: { gte: start, lte: end } },
    });

    const subtotal = round2(orders.reduce((s, o) => s + Number(o.subtotal), 0));
    const discountTotal = round2(orders.reduce((s, o) => s + Number(o.discountAmount), 0));
    const taxAmount = round2(orders.reduce((s, o) => s + Number(o.taxAmount), 0));
    const total = round2(orders.reduce((s, o) => s + Number(o.total), 0));

    const payload = { from: start, to: end, ordersCount: orders.length, subtotal, discountTotal, taxAmount, total };

    if (req.query.format === "csv") {
      return sendCsv(res, `vat-report-${from}-to-${to}.csv`, [
        { metric: "From", value: from },
        { metric: "To", value: to },
        { metric: "Orders", value: orders.length },
        { metric: "Subtotal", value: subtotal },
        { metric: "Discounts", value: discountTotal },
        { metric: "VAT/Tax Collected", value: taxAmount },
        { metric: "Total", value: total },
      ]);
    }

    res.json(payload);
  })
);

router.get(
  "/general",
  asyncHandler(async (req, res) => {
    const { from, to, type } = req.query as { from?: string; to?: string; type?: string };
    if (!from || !to) throw new HttpError(400, "'from' and 'to' query params are required");
    const start = new Date(from);
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);

    if (type === "sessions") {
      const sessions = await prisma.session.findMany({
        where: { station: { locationId: DEFAULT_LOCATION_ID }, startedAt: { gte: start, lte: end } },
        include: { station: true },
        orderBy: { startedAt: "desc" },
      });
      const rows = sessions.map((s) => ({
        station: s.station.name,
        player: s.playerName ?? "",
        package: s.packageLabel,
        status: s.status,
        startedAt: s.startedAt.toISOString(),
        endedAt: s.endedAt ? s.endedAt.toISOString() : "",
        amount: s.finalAmount ? Number(s.finalAmount) : "",
      }));
      if (req.query.format === "csv") return sendCsv(res, `sessions-${from}-to-${to}.csv`, rows);
      return res.json(rows);
    }

    // default: orders
    const orders = await prisma.order.findMany({
      where: { locationId: DEFAULT_LOCATION_ID, createdAt: { gte: start, lte: end } },
      include: { customer: true },
      orderBy: { createdAt: "desc" },
    });
    const rows = orders.map((o) => ({
      orderNumber: o.orderNumber,
      type: o.type,
      status: o.status,
      customer: o.customer?.name ?? "",
      paymentMethod: o.paymentMethod ?? "",
      subtotal: Number(o.subtotal),
      discount: Number(o.discountAmount),
      tax: Number(o.taxAmount),
      total: Number(o.total),
      createdAt: o.createdAt.toISOString(),
    }));
    if (req.query.format === "csv") return sendCsv(res, `orders-${from}-to-${to}.csv`, rows);
    res.json(rows);
  })
);

export default router;
