import { Router } from "express";
import { z } from "zod";
import { DEFAULT_LOCATION_ID, prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
router.use(requireAuth, requireRole("ADMIN"));

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { from, to } = req.query as { from?: string; to?: string };
    const expenses = await prisma.expense.findMany({
      where: {
        locationId: DEFAULT_LOCATION_ID,
        ...(from || to
          ? {
              date: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      orderBy: { date: "desc" },
      include: { createdBy: { select: { name: true } } },
    });
    res.json(expenses);
  })
);

const expenseSchema = z.object({
  category: z.string().min(1),
  amount: z.number().positive(),
  note: z.string().optional(),
  date: z.coerce.date().optional(),
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = expenseSchema.parse(req.body);
    const expense = await prisma.expense.create({
      data: { ...data, locationId: DEFAULT_LOCATION_ID, createdById: req.user!.id },
    });
    res.status(201).json(expense);
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = expenseSchema.partial().parse(req.body);
    const expense = await prisma.expense.update({ where: { id: req.params.id }, data });
    res.json(expense);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.expense.delete({ where: { id: req.params.id } });
    res.status(204).end();
  })
);

export default router;
