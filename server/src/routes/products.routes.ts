import path from "node:path";
import fs from "node:fs";
import { Router } from "express";
import multer from "multer";
import sharp from "sharp";
import { z } from "zod";
import { ProductCategory, ProductType, StationType } from "@prisma/client";
import { DEFAULT_LOCATION_ID, prisma } from "../lib/prisma";
import { asyncHandler, HttpError } from "../utils/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

const uploadsDir = path.join(process.cwd(), "uploads", "products");
fs.mkdirSync(uploadsDir, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image uploads are allowed"));
      return;
    }
    cb(null, true);
  },
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const category = typeof req.query.category === "string" ? req.query.category : undefined;
    const products = await prisma.product.findMany({
      where: {
        locationId: DEFAULT_LOCATION_ID,
        active: true,
        ...(category ? { category: category as ProductCategory } : {}),
      },
      orderBy: { name: "asc" },
    });
    res.json(products);
  })
);

const createProductSchema = z.object({
  name: z.string().min(1),
  category: z.nativeEnum(ProductCategory),
  type: z.nativeEnum(ProductType).default(ProductType.ITEM),
  price: z.number().nonnegative(),
  durationMin: z.number().int().positive().optional(),
  stationTypeLink: z.nativeEnum(StationType).optional(),
  inStock: z.boolean().optional(),
  // Countable unit stock — only meaningful for ITEM products (retail/cafeteria
  // goods). TIME_PACKAGE products have nothing to count, so stockQty stays
  // null for them and inStock is toggled manually instead.
  stockQty: z.number().int().min(0).optional(),
});

router.post(
  "/",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const data = createProductSchema.parse(req.body);
    const isItem = data.type === ProductType.ITEM;
    const stockQty = isItem ? data.stockQty ?? 0 : null;
    const inStock = isItem ? stockQty! > 0 : data.inStock ?? true;
    const product = await prisma.product.create({
      data: { ...data, stockQty, inStock, locationId: DEFAULT_LOCATION_ID },
    });
    res.status(201).json(product);
  })
);

const updateProductSchema = createProductSchema.partial().extend({ active: z.boolean().optional() });

router.patch(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const data = updateProductSchema.parse(req.body);
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, "Product not found");

    const resultingType = data.type ?? existing.type;
    const updateData: Omit<typeof data, "stockQty"> & { stockQty?: number | null } = { ...data };

    if (resultingType === ProductType.ITEM) {
      if (data.stockQty !== undefined || data.type !== undefined) {
        const stockQty = data.stockQty ?? existing.stockQty ?? 0;
        updateData.stockQty = stockQty;
        updateData.inStock = stockQty > 0;
      }
    } else if (data.type !== undefined) {
      updateData.stockQty = null;
    }

    const product = await prisma.product.update({ where: { id: req.params.id }, data: updateData });
    res.json(product);
  })
);

router.delete(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    await prisma.product.update({ where: { id: req.params.id }, data: { active: false } });
    res.status(204).end();
  })
);

// Image optimizer: resize + compress on upload, save as webp, store relative URL on the product.
router.post(
  "/:id/image",
  requireAuth,
  requireRole("ADMIN"),
  upload.single("image"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new HttpError(400, "No image file provided");
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) throw new HttpError(404, "Product not found");

    const filename = `${product.id}-${Date.now()}.webp`;
    const outputPath = path.join(uploadsDir, filename);

    await sharp(req.file.buffer)
      .resize(600, 600, { fit: "cover" })
      .webp({ quality: 80 })
      .toFile(outputPath);

    const imageUrl = `/uploads/products/${filename}`;
    const updated = await prisma.product.update({ where: { id: product.id }, data: { imageUrl } });
    res.json(updated);
  })
);

export default router;
