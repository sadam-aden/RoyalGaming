-- Tokens issued before a password change must stop working, which a stateless
-- JWT cannot express on its own. requireAuth compares the token's `iat` against
-- this column, so changing a password — or an admin resetting a compromised one
-- — signs that account out everywhere.
--
-- Backfilled from createdAt rather than now(): defaulting to the moment of the
-- migration would invalidate every token in circulation and sign the shop out
-- mid-shift for no security benefit, since none of those tokens predate a
-- password change that has actually happened.
ALTER TABLE "staff" ADD COLUMN "passwordChangedAt" TIMESTAMP(3);

UPDATE "staff" SET "passwordChangedAt" = "createdAt" WHERE "passwordChangedAt" IS NULL;

ALTER TABLE "staff" ALTER COLUMN "passwordChangedAt" SET NOT NULL;
ALTER TABLE "staff" ALTER COLUMN "passwordChangedAt" SET DEFAULT CURRENT_TIMESTAMP;
