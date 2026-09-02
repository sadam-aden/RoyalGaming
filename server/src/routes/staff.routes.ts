import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { StaffRole } from "@prisma/client";
import { DEFAULT_LOCATION_ID, prisma } from "../lib/prisma";
import { asyncHandler, HttpError } from "../utils/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const staff = await prisma.staff.findMany({
      where: { locationId: DEFAULT_LOCATION_ID, active: true },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    });
    res.json(staff);
  })
);

const createStaffSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.nativeEnum(StaffRole).default(StaffRole.CASHIER),
});

router.post(
  "/",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const data = createStaffSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(data.password, 10);
    const staff = await prisma.staff.create({
      data: {
        locationId: DEFAULT_LOCATION_ID,
        name: data.name,
        email: data.email,
        role: data.role,
        passwordHash,
      },
      select: { id: true, name: true, email: true, role: true },
    });
    res.status(201).json(staff);
  })
);

router.patch(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const data = z
      .object({ name: z.string().min(1).optional(), role: z.nativeEnum(StaffRole).optional(), active: z.boolean().optional() })
      .parse(req.body);
    const staff = await prisma.staff.update({
      where: { id: req.params.id },
      data,
      select: { id: true, name: true, email: true, role: true, active: true },
    });
    res.json(staff);
  })
);

const changeOwnPasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

router.patch(
  "/me/password",
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = changeOwnPasswordSchema.parse(req.body);
    const staff = await prisma.staff.findUniqueOrThrow({ where: { id: req.user!.id } });
    const valid = await bcrypt.compare(currentPassword, staff.passwordHash);
    if (!valid) throw new HttpError(401, "Current password is incorrect");
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.staff.update({ where: { id: staff.id }, data: { passwordHash } });
    res.status(204).end();
  })
);

const resetPasswordSchema = z.object({ newPassword: z.string().min(8) });

router.patch(
  "/:id/password",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const { newPassword } = resetPasswordSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.staff.update({ where: { id: req.params.id }, data: { passwordHash } });
    res.status(204).end();
  })
);

export default router;
