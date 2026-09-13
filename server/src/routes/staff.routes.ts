import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { StaffRole } from "@prisma/client";
import { DEFAULT_LOCATION_ID, prisma } from "../lib/prisma";
import { asyncHandler, HttpError } from "../utils/asyncHandler";
import { requireAuth, requireRole, signToken } from "../middleware/auth";
import { sensitiveLimiter } from "../middleware/security";

const router = Router();
router.use(requireAuth);

/** Work factor for new hashes. 10 was the old default; 12 is the current one. */
const BCRYPT_ROUNDS = 12;

router.get(
  "/",
  asyncHandler(async (req, res) => {
    // The POS calls this to fill the waiter dropdown, so cashiers need it — but
    // they need names, not the roster of who is an admin and at which address.
    const isAdmin = req.user!.role === "ADMIN";
    const staff = await prisma.staff.findMany({
      where: { locationId: DEFAULT_LOCATION_ID, active: true },
      select: isAdmin
        ? { id: true, name: true, email: true, role: true }
        : { id: true, name: true },
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
    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
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

    const target = await prisma.staff.findFirst({
      where: { id: req.params.id, locationId: DEFAULT_LOCATION_ID },
      select: { id: true, role: true, active: true },
    });
    if (!target) throw new HttpError(404, "Staff member not found");

    // Demoting or deactivating the last remaining admin would leave nobody able
    // to manage products, staff or reports — and no way back in through the UI.
    const losingAdmin =
      target.role === "ADMIN" && ((data.role && data.role !== "ADMIN") || data.active === false);
    if (losingAdmin) {
      const admins = await prisma.staff.count({
        where: { locationId: DEFAULT_LOCATION_ID, role: "ADMIN", active: true },
      });
      if (admins <= 1) throw new HttpError(409, "This is the last active admin — promote someone else first");
    }

    const staff = await prisma.staff.update({
      where: { id: target.id },
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
  sensitiveLimiter,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = changeOwnPasswordSchema.parse(req.body);
    const staff = await prisma.staff.findUniqueOrThrow({ where: { id: req.user!.id } });
    const valid = await bcrypt.compare(currentPassword, staff.passwordHash);
    if (!valid) throw new HttpError(401, "Current password is incorrect");
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    // Stamping this invalidates every token issued before now, including any an
    // attacker may be holding — which is the point of changing a password.
    await prisma.staff.update({
      where: { id: staff.id },
      data: { passwordHash, passwordChangedAt: new Date() },
    });
    // That invalidation includes the caller's own token, so hand back a fresh
    // one: the person who just changed their password should stay signed in,
    // while every other session they had is now dead.
    const token = signToken({
      id: staff.id,
      email: staff.email,
      name: staff.name,
      role: staff.role,
      locationId: staff.locationId,
    });
    res.json({ token });
  })
);

const resetPasswordSchema = z.object({ newPassword: z.string().min(8) });

router.patch(
  "/:id/password",
  requireRole("ADMIN"),
  sensitiveLimiter,
  asyncHandler(async (req, res) => {
    const { newPassword } = resetPasswordSchema.parse(req.body);
    const target = await prisma.staff.findFirst({
      where: { id: req.params.id, locationId: DEFAULT_LOCATION_ID },
      select: { id: true },
    });
    if (!target) throw new HttpError(404, "Staff member not found");
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    // A reset exists to take an account back from whoever has it; leaving their
    // existing token working would defeat that.
    await prisma.staff.update({
      where: { id: target.id },
      data: { passwordHash, passwordChangedAt: new Date() },
    });
    res.status(204).end();
  })
);

export default router;
