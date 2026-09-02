import { Router } from "express";
import { z } from "zod";
import { StationType } from "@prisma/client";
import { DEFAULT_LOCATION_ID, prisma } from "../lib/prisma";
import { asyncHandler, HttpError } from "../utils/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { buildSnapshot } from "../services/sessionEngine";

const router = Router();

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const stations = await prisma.station.findMany({
      where: { locationId: DEFAULT_LOCATION_ID, active: true },
      orderBy: { sortOrder: "asc" },
    });
    res.json(stations);
  })
);

router.get(
  "/snapshot",
  asyncHandler(async (_req, res) => {
    res.json(await buildSnapshot());
  })
);

const createStationSchema = z.object({
  name: z.string().min(1),
  type: z.nativeEnum(StationType),
  sortOrder: z.number().int().optional(),
});

router.post(
  "/",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const data = createStationSchema.parse(req.body);
    const station = await prisma.station.create({ data: { ...data, locationId: DEFAULT_LOCATION_ID } });
    res.status(201).json(station);
  })
);

const updateStationSchema = createStationSchema.partial().extend({ active: z.boolean().optional() });

router.patch(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const data = updateStationSchema.parse(req.body);
    const station = await prisma.station.update({ where: { id: req.params.id }, data });
    res.json(station);
  })
);

router.delete(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const existing = await prisma.station.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, "Station not found");
    await prisma.station.update({ where: { id: req.params.id }, data: { active: false } });
    res.status(204).end();
  })
);

export default router;
