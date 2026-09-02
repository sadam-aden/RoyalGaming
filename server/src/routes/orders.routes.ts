import { Router } from "express";
import { z } from "zod";
import { OrderStatus, OrderType, PaymentMethod, type Prisma } from "@prisma/client";
import { DEFAULT_LOCATION_ID, prisma } from "../lib/prisma";
import { asyncHandler, HttpError } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { computeDiscountAmount, computeSubtotal, computeTaxAmount, getTaxRate, round2 } from "../utils/pricing";
import { getIo, SOCKET_EVENTS } from "../sockets/io";

const router = Router();
router.use(requireAuth);

// Decrements countable stock for ITEM products when an order becomes
// COMPLETED. TIME_PACKAGE products (stockQty === null) are skipped —
// they have no countable unit stock.
async function decrementStock(tx: Prisma.TransactionClient, items: { productId: string; quantity: number }[]) {
  for (const item of items) {
    const product = await tx.product.findUnique({ where: { id: item.productId } });
    if (!product || product.stockQty === null) continue;
    const newQty = Math.max(0, product.stockQty - item.quantity);
    await tx.product.update({ where: { id: product.id }, data: { stockQty: newQty, inStock: newQty > 0 } });
  }
}

const orderInclude = {
  items: { include: { product: true } },
  customer: true,
  waiter: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
  discount: true,
  payments: true,
} as const;

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { status, from, to } = req.query as { status?: string; from?: string; to?: string };
    const orders = await prisma.order.findMany({
      where: {
        locationId: DEFAULT_LOCATION_ID,
        ...(status ? { status: status as OrderStatus } : {}),
        ...(from || to
          ? { createdAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } }
          : {}),
      },
      include: orderInclude,
      orderBy: { createdAt: "desc" },
    });
    res.json(orders);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: orderInclude });
    if (!order) throw new HttpError(404, "Order not found");
    res.json(order);
  })
);

const cartItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive().default(1),
  sessionId: z.string().uuid().optional(),
});

const createOrderSchema = z.object({
  type: z.nativeEnum(OrderType).default(OrderType.WALK),
  customerId: z.string().uuid().optional(),
  waiterId: z.string().uuid().optional(),
  discountId: z.string().uuid().optional(),
  notes: z.string().optional(),
  items: z.array(cartItemSchema).min(1),
  hold: z.boolean().default(false),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
});

async function priceAndCreateOrder(body: z.infer<typeof createOrderSchema>, createdById: string) {
  if (!body.hold && !body.paymentMethod) {
    throw new HttpError(400, "paymentMethod is required to complete an order");
  }

  const productIds = body.items.map((i) => i.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const productMap = new Map(products.map((p) => [p.id, p]));

  for (const item of body.items) {
    const product = productMap.get(item.productId);
    if (!product) throw new HttpError(404, `Product ${item.productId} not found`);
    if (!product.inStock) throw new HttpError(409, `${product.name} is out of stock`);
    if (product.stockQty !== null && item.quantity > product.stockQty) {
      throw new HttpError(409, `Only ${product.stockQty} of ${product.name} left in stock`);
    }
  }

  const lines = body.items.map((item) => ({
    unitPrice: Number(productMap.get(item.productId)!.price),
    quantity: item.quantity,
  }));
  const subtotal = computeSubtotal(lines);

  const discount = body.discountId
    ? await prisma.discount.findUnique({ where: { id: body.discountId } })
    : null;
  if (body.discountId && (!discount || !discount.active)) {
    throw new HttpError(400, "Discount is not valid");
  }
  const discountAmount = computeDiscountAmount(subtotal, discount);
  const taxAmount = computeTaxAmount(subtotal - discountAmount, getTaxRate());
  const total = round2(subtotal - discountAmount + taxAmount);

  const now = new Date();
  const status = body.hold ? OrderStatus.HELD : OrderStatus.COMPLETED;

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        locationId: DEFAULT_LOCATION_ID,
        type: body.type,
        status,
        customerId: body.customerId,
        waiterId: body.waiterId,
        createdById,
        discountId: discount?.id,
        subtotal,
        discountAmount,
        taxAmount,
        total,
        notes: body.notes,
        heldAt: body.hold ? now : null,
        paymentMethod: body.hold ? null : body.paymentMethod,
        paidAt: body.hold ? null : now,
        completedAt: body.hold ? null : now,
      },
    });

    for (const item of body.items) {
      const product = productMap.get(item.productId)!;
      const unitPrice = Number(product.price);
      const orderItem = await tx.orderItem.create({
        data: {
          orderId: created.id,
          productId: product.id,
          quantity: item.quantity,
          unitPrice,
          lineTotal: round2(unitPrice * item.quantity),
        },
      });
      if (item.sessionId) {
        await tx.session.update({ where: { id: item.sessionId }, data: { orderItemId: orderItem.id } });
      }
    }

    if (!body.hold) {
      await tx.payment.create({ data: { orderId: created.id, method: body.paymentMethod!, amount: total } });
      if (body.paymentMethod === PaymentMethod.CREDIT && body.customerId) {
        await tx.customer.update({ where: { id: body.customerId }, data: { balance: { increment: total } } });
      }
      if (body.customerId) {
        await tx.customer.update({ where: { id: body.customerId }, data: { visitCount: { increment: 1 } } });
      }
      await decrementStock(tx, body.items);
    }

    return tx.order.findUniqueOrThrow({ where: { id: created.id }, include: orderInclude });
  });

  return order;
}

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = createOrderSchema.parse(req.body);
    const order = await priceAndCreateOrder(body, req.user!.id);
    getIo().emit(SOCKET_EVENTS.ORDER_UPDATE, { id: order.id, status: order.status });
    res.status(201).json(order);
  })
);

const checkoutSchema = z.object({ paymentMethod: z.nativeEnum(PaymentMethod) });

router.patch(
  "/:id/checkout",
  asyncHandler(async (req, res) => {
    const { paymentMethod } = checkoutSchema.parse(req.body);
    const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: { items: true } });
    if (!order) throw new HttpError(404, "Order not found");
    if (order.status !== OrderStatus.HELD && order.status !== OrderStatus.OPEN) {
      throw new HttpError(409, "Order is not open for checkout");
    }

    const now = new Date();
    const updated = await prisma.$transaction(async (tx) => {
      await tx.payment.create({ data: { orderId: order.id, method: paymentMethod, amount: order.total } });
      if (paymentMethod === PaymentMethod.CREDIT && order.customerId) {
        await tx.customer.update({ where: { id: order.customerId }, data: { balance: { increment: order.total } } });
      }
      if (order.customerId) {
        await tx.customer.update({ where: { id: order.customerId }, data: { visitCount: { increment: 1 } } });
      }
      await decrementStock(tx, order.items);
      return tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.COMPLETED, paymentMethod, paidAt: now, completedAt: now },
        include: orderInclude,
      });
    });

    getIo().emit(SOCKET_EVENTS.ORDER_UPDATE, { id: updated.id, status: updated.status });
    res.json(updated);
  })
);

router.patch(
  "/:id/cancel",
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) throw new HttpError(404, "Order not found");
    if (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.CANCELLED) {
      throw new HttpError(409, "Order can no longer be cancelled");
    }
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.CANCELLED, cancelledAt: new Date() },
      include: orderInclude,
    });
    getIo().emit(SOCKET_EVENTS.ORDER_UPDATE, { id: updated.id, status: updated.status });
    res.json(updated);
  })
);

export default router;
