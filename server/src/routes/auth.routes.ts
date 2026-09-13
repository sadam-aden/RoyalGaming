import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { signToken } from "../middleware/auth";
import { loginLimiter } from "../middleware/security";
import { prisma } from "../lib/prisma";
import { asyncHandler, HttpError } from "../utils/asyncHandler";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post(
  "/login",
  loginLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);

    const staff = await prisma.staff.findUnique({ where: { email } });
    if (!staff || !staff.active) throw new HttpError(401, "Invalid email or password");

    const valid = await bcrypt.compare(password, staff.passwordHash);
    if (!valid) throw new HttpError(401, "Invalid email or password");

    const user = { id: staff.id, email: staff.email, name: staff.name, role: staff.role, locationId: staff.locationId };
    const token = signToken(user);
    res.json({ token, user });
  })
);

export default router;
