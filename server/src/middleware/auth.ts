import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { StaffRole } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { asyncHandler, HttpError } from "../utils/asyncHandler";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: StaffRole;
  locationId: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not set");
}
// A short secret is worse than none, because it reads as configured while being
// guessable offline from any captured token. Fail at boot rather than pretend.
if (JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters");
}

const TOKEN_TTL = "12h";

export function signToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET as string, { expiresIn: TOKEN_TTL, algorithm: "HS256" });
}

/**
 * Verify the bearer token *and* that the account behind it is still valid.
 *
 * A signed JWT only proves what was true when it was issued. On its own it left
 * two holes: a member of staff who was deactivated kept full access until their
 * token expired, up to twelve hours later; and changing a password — or an
 * admin resetting a compromised one — did nothing to sessions already open.
 *
 * So every request re-reads the row. One indexed primary-key lookup against a
 * local Postgres is not the thing that will make this POS slow, and it buys
 * immediate revocation.
 */
export const requireAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new HttpError(401, "Missing or invalid Authorization header");
  }
  const token = header.slice("Bearer ".length);

  let payload: AuthUser & { iat?: number };
  try {
    // Pin the algorithm: without it a token could name its own, and "none"
    // historically turned verification into a formality.
    payload = jwt.verify(token, JWT_SECRET as string, { algorithms: ["HS256"] }) as AuthUser & { iat?: number };
  } catch {
    throw new HttpError(401, "Invalid or expired token");
  }

  const staff = await prisma.staff.findUnique({
    where: { id: payload.id },
    select: { id: true, email: true, name: true, role: true, locationId: true, active: true, passwordChangedAt: true },
  });
  if (!staff || !staff.active) throw new HttpError(401, "Account is no longer active");

  // `iat` only has second resolution, so a token issued in the same second as a
  // password change is indistinguishable from one issued just before it.
  // Rounding the change *up* resolves that tie against the token: better to ask
  // someone to sign in again than to leave a one-second window in which a stolen
  // token outlives the password change meant to kill it.
  const changedAt = Math.ceil(staff.passwordChangedAt.getTime() / 1000);
  if (payload.iat !== undefined && payload.iat < changedAt) {
    throw new HttpError(401, "Password changed — please sign in again");
  }

  // Take role and location from the row, not the token: a demotion should bite
  // at once rather than when the token happens to expire.
  req.user = {
    id: staff.id,
    email: staff.email,
    name: staff.name,
    role: staff.role,
    locationId: staff.locationId,
  };
  next();
});

export function requireRole(...roles: StaffRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new HttpError(403, "Insufficient permissions");
    }
    next();
  };
}
