import { Router } from "express";
import { z } from "zod";
import { DEFAULT_LOCATION_ID, prisma } from "../lib/prisma";
import { asyncHandler, HttpError } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";
import {
  endSession,
  extendSession,
  pauseSession,
  resumeSession,
  startSession,
  transferSession,
} from "../services/sessionEngine";

const router = Router();

router.use(requireAuth);

const startSchema = z.object({
  stationId: z.string().uuid(),
  playerName: z.string().trim().min(1).optional(),
  packageLabel: z.string().min(1),
  ratePerHour: z.number().positive(),
  durationMin: z.number().int().positive().optional(),
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = startSchema.parse(req.body);
    const session = await startSession({ ...data, startedById: req.user!.id });
    res.status(201).json(session);
  })
);

router.post(
  "/:id/pause",
  asyncHandler(async (req, res) => {
    res.json(await pauseSession(req.params.id));
  })
);

router.post(
  "/:id/resume",
  asyncHandler(async (req, res) => {
    res.json(await resumeSession(req.params.id));
  })
);

const extendSchema = z.object({ minutes: z.number().int().positive() });

router.post(
  "/:id/extend",
  asyncHandler(async (req, res) => {
    const { minutes } = extendSchema.parse(req.body);
    res.json(await extendSession(req.params.id, minutes));
  })
);

const transferSchema = z.object({ targetStationId: z.string().uuid() });

router.post(
  "/:id/transfer",
  asyncHandler(async (req, res) => {
    const { targetStationId } = transferSchema.parse(req.body);
    res.json(await transferSession(req.params.id, targetStationId));
  })
);

router.post(
  "/:id/end",
  asyncHandler(async (req, res) => {
    res.json(await endSession(req.params.id));
  })
);

router.get(
  "/history",
  asyncHandler(async (req, res) => {
    const dateParam = typeof req.query.date === "string" ? req.query.date : undefined;
    const day = dateParam ? new Date(dateParam) : new Date();
    if (Number.isNaN(day.getTime())) throw new HttpError(400, "Invalid date");

    const start = new Date(day);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const sessions = await prisma.session.findMany({
      where: {
        station: { locationId: DEFAULT_LOCATION_ID },
        startedAt: { gte: start, lt: end },
      },
      include: { station: true, transferredTo: { include: { station: true } } },
      orderBy: { startedAt: "desc" },
    });

    res.json(
      sessions.map((s) => ({
        id: s.id,
        stationName: s.station.name,
        playerName: s.playerName,
        packageLabel: s.packageLabel,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        status: s.transferredTo ? "TRANSFERRED" : s.status,
        transferredToStation: s.transferredTo?.station.name ?? null,
        finalAmount: s.finalAmount ? Number(s.finalAmount) : null,
      }))
    );
  })
);

export default router;
