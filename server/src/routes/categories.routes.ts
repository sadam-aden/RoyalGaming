import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { DEFAULT_LOCATION_ID, prisma } from "../lib/prisma";
import { asyncHandler, HttpError } from "../utils/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

/**
 * Product categories, managed from the Products page.
 *
 * Reading is open to any signed-in user because the POS needs the list to build
 * its filter bar; changing them is ADMIN, like the products themselves.
 */

/** Default swatches for new categories, in the app's categorical order. */
const PALETTE = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"];

const HEX = /^#[0-9a-fA-F]{6}$/;

const categorySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(40),
  color: z.string().regex(HEX, "Color must be a hex value like #3987e5").optional(),
  sortOrder: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    // The POS wants only what it can sell; the admin screen wants everything,
    // including the categories that have been switched off.
    const includeInactive = req.query.includeInactive === "true";
    const categories = await prisma.productCategory.findMany({
      where: { locationId: DEFAULT_LOCATION_ID, ...(includeInactive ? {} : { active: true }) },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { products: true } } },
    });
    res.json(categories.map(({ _count, ...c }) => ({ ...c, productCount: _count.products })));
  })
);

router.post(
  "/",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const data = categorySchema.parse(req.body);

    // New categories land at the end of the bar rather than silently sharing
    // position 0 with an existing one.
    const last = await prisma.productCategory.findFirst({
      where: { locationId: DEFAULT_LOCATION_ID },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    const sortOrder = data.sortOrder ?? (last ? last.sortOrder + 1 : 0);

    try {
      const category = await prisma.productCategory.create({
        data: {
          locationId: DEFAULT_LOCATION_ID,
          name: data.name,
          color: data.color ?? PALETTE[sortOrder % PALETTE.length],
          sortOrder,
          active: data.active ?? true,
        },
      });
      res.status(201).json({ ...category, productCount: 0 });
    } catch (err) {
      throw asDuplicateNameError(err, data.name);
    }
  })
);

router.patch(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const data = categorySchema.partial().parse(req.body);
    const existing = await prisma.productCategory.findFirst({
      where: { id: req.params.id, locationId: DEFAULT_LOCATION_ID },
    });
    if (!existing) throw new HttpError(404, "Category not found");

    try {
      const category = await prisma.productCategory.update({
        where: { id: existing.id },
        data,
        include: { _count: { select: { products: true } } },
      });
      const { _count, ...rest } = category;
      res.json({ ...rest, productCount: _count.products });
    } catch (err) {
      throw asDuplicateNameError(err, data.name ?? existing.name);
    }
  })
);

router.delete(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const category = await prisma.productCategory.findFirst({
      where: { id: req.params.id, locationId: DEFAULT_LOCATION_ID },
      include: { _count: { select: { products: true } } },
    });
    if (!category) throw new HttpError(404, "Category not found");

    // Refused rather than cascaded. Products point at a category, and every
    // past order line reaches its category through its product — deleting one
    // that is still in use would rewrite history in the reports. Switching it
    // off hides it from the POS and keeps the record intact, which is what is
    // almost always meant by "remove this category".
    if (category._count.products > 0) {
      throw new HttpError(
        409,
        `"${category.name}" still has ${category._count.products} product${category._count.products === 1 ? "" : "s"}. ` +
          `Move them to another category first, or switch this one off to hide it from the POS.`
      );
    }

    await prisma.productCategory.delete({ where: { id: category.id } });
    res.status(204).end();
  })
);

/** Turns the unique-constraint violation into something worth reading. */
function asDuplicateNameError(err: unknown, name: string): unknown {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    return new HttpError(409, `A category called "${name}" already exists`);
  }
  return err;
}

export default router;
