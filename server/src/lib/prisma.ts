import { Prisma, PrismaClient } from "@prisma/client";

// Prisma's Decimal serializes to a JSON string by default (e.g. "45.00"),
// which silently breaks client-side arithmetic/formatting that expects a
// number. Every price/amount field in this schema is a Decimal, so patch
// serialization globally instead of converting at every call site.
// decimal.js types toJSON() as returning string, but JSON.stringify accepts
// any JSON-serializable return value from toJSON — a number is valid here.
Prisma.Decimal.prototype.toJSON = function (this: Prisma.Decimal) {
  return this.toNumber() as unknown as string;
};

export const prisma = new PrismaClient();

// Hardcoded until multi-location support lands; every location-scoped
// query should go through this constant rather than assuming a single row.
export const DEFAULT_LOCATION_ID = "00000000-0000-0000-0000-000000000001";
