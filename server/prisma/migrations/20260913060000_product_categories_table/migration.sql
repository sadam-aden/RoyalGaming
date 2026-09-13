-- Product categories become rows instead of an enum value, so the shop can add,
-- rename and retire its own without a code change.
--
-- Written by hand rather than generated: the generated version drops
-- products.category outright, which would strip every product of what it
-- belongs to and, through them, every past order line in the reports. This
-- creates the new rows first, carries each product across, and only then
-- removes the old column.
--
-- The whole file runs in one transaction, so a product that fails to map stops
-- at the SET NOT NULL below and rolls the migration back rather than leaving
-- the catalogue half-converted.

-- 1. The new table.
CREATE TABLE "product_categories" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3987e5',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "product_categories_locationId_idx" ON "product_categories"("locationId");
CREATE UNIQUE INDEX "product_categories_locationId_name_key" ON "product_categories"("locationId", "name");

ALTER TABLE "product_categories"
    ADD CONSTRAINT "product_categories_locationId_fkey"
    FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 2. One row per location per old enum value, keeping the display names and the
--    chart colours the app was already using, so nothing changes appearance.
INSERT INTO "product_categories" ("id", "locationId", "name", "color", "sortOrder", "active", "createdAt", "updatedAt")
SELECT gen_random_uuid(), l."id", v.name, v.color, v.sort, true, NOW(), NOW()
FROM "locations" l
CROSS JOIN (VALUES
    ('PlayStation', '#3987e5', 0),
    ('Table Games', '#d95926', 1),
    ('Skating',     '#199e70', 2),
    ('Coffee',      '#c98500', 3),
    ('Cafeteria',   '#d55181', 4)
) AS v(name, color, sort);

-- 3. Carry every product across, matching on the label the old enum stood for.
ALTER TABLE "products" ADD COLUMN "categoryId" TEXT;

UPDATE "products" p
SET "categoryId" = c."id"
FROM "product_categories" c
WHERE c."locationId" = p."locationId"
  AND c."name" = CASE p."category"::text
      WHEN 'PLAYSTATION' THEN 'PlayStation'
      WHEN 'TABLE_GAMES' THEN 'Table Games'
      WHEN 'SKATING'     THEN 'Skating'
      WHEN 'COFFEE'      THEN 'Coffee'
      WHEN 'CAFETERIA'   THEN 'Cafeteria'
  END;

-- 4. Only once every row is pointed somewhere does the column become required
--    and the old one go.
ALTER TABLE "products" ALTER COLUMN "categoryId" SET NOT NULL;

DROP INDEX "products_category_idx";
ALTER TABLE "products" DROP COLUMN "category";
DROP TYPE "ProductCategory";

CREATE INDEX "products_categoryId_idx" ON "products"("categoryId");

-- RESTRICT, not CASCADE: deleting a category that still has products must fail
-- loudly rather than quietly taking the products with it.
ALTER TABLE "products"
    ADD CONSTRAINT "products_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "product_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
