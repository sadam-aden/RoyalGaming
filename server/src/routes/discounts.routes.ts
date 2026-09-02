import { Router } from "express";
import { z } from "zod";
import { DiscountType } from "@prisma/client";
import { DEFAULT_LOCATION_ID, prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const discounts = await prisma.discount.findMany({
      where: { locationId: DEFAULT_LOCATION_ID },
      orderBy: { createdAt: "desc" },
    });
    res.json(discounts);
  })
);

const discountSchema = z.object({
  name: z.string().min(1),
  type: z.nativeEnum(DiscountType),
  value: z.number().positive(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
  productId: z.string().uuid().optional(),
});

router.post(
  "/",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const data = discountSchema.parse(req.body);
    const discount = await prisma.discount.create({ data: { ...data, locationId: DEFAULT_LOCATION_ID } });
    res.status(201).json(discount);
  })
);

router.patch(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const data = discountSchema.partial().extend({ active: z.boolean().optional() }).parse(req.body);
    const discount = await prisma.discount.update({ where: { id: req.params.id }, data });
    res.json(discount);
  })
);

router.delete(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    await prisma.discount.update({ where: { id: req.params.id }, data: { active: false } });
    res.status(204).end();
  })
);

export default router;
