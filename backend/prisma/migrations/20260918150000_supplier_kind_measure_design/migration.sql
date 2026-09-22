-- Step 2 + Step 3
--   1. Supplier.kind      : Local / International / Own manufacture (menu only; stock still uses `source`)
--   2. WoodType.density   : kg per CFT, only needed for the KG entry mode
--   3. WoodPurchase.measure : remember how the quantity was typed in, and the raw rows
--   4. DoorDesign.origin/visibility : built-in vs uploaded, private vs in the gallery
--   5. Estimate.designSvgUrl : freeze the carving picture onto the estimate
--
-- Nothing is dropped and every new column has a default, so old rows keep working.

-- 1 ---------------------------------------------------------------- supplier kind
CREATE TYPE "SupplierKind" AS ENUM ('LOCAL', 'INTERNATIONAL', 'OWN');

ALTER TABLE "Supplier"
  ADD COLUMN "kind" "SupplierKind" NOT NULL DEFAULT 'LOCAL';

-- existing foreign suppliers become INTERNATIONAL
UPDATE "Supplier" SET "kind" = 'INTERNATIONAL' WHERE "source" = 'FOREIGN';

-- 2 ---------------------------------------------------------------- wood density
ALTER TABLE "WoodType"
  ADD COLUMN "densityKgPerCft" DECIMAL(8,2);

-- 3 ---------------------------------------------------------------- measurement
CREATE TYPE "MeasureMode" AS ENUM ('CFT', 'FT_IN', 'INCH', 'GIRTH', 'KG');

ALTER TABLE "WoodPurchase"
  ADD COLUMN "measureMode" "MeasureMode" NOT NULL DEFAULT 'CFT',
  ADD COLUMN "measureRaw"  JSONB;

-- 4 ---------------------------------------------------------------- design
CREATE TYPE "DesignOrigin"     AS ENUM ('BUILTIN', 'UPLOADED');
CREATE TYPE "DesignVisibility" AS ENUM ('PRIVATE', 'LIBRARY');

ALTER TABLE "DoorDesign"
  ADD COLUMN "origin"     "DesignOrigin"     NOT NULL DEFAULT 'BUILTIN',
  ADD COLUMN "visibility" "DesignVisibility" NOT NULL DEFAULT 'LIBRARY';

-- 5 ---------------------------------------------------------------- estimate picture
ALTER TABLE "Estimate"
  ADD COLUMN "designSvgUrl" TEXT;

-- backfill: estimates already made from an uploaded design keep its picture
UPDATE "Estimate" e
   SET "designSvgUrl" = d."svgUrl"
  FROM "DoorDesign" d
 WHERE e."designId" = d."id"
   AND d."svgUrl" IS NOT NULL;

-- 6 ---------------------------------------------------------------- hand-typed selling price
-- Previously a price typed in by hand was stored only as a profit %, so the next
-- consignment recomputed it away. This flag keeps it as a real number.
ALTER TABLE "WoodStock"
  ADD COLUMN "sellLocked" BOOLEAN NOT NULL DEFAULT false;

-- 7 ---------------------------------------------------------------- how many workers
-- Filled in once on the price list, then shown on every estimate. Display only:
-- it does not take part in any price calculation.
ALTER TABLE "DoorDesign"
  ADD COLUMN "workersSingle" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "workersDouble" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "daysSingle"    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "daysDouble"    INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "LabourRate"
  ADD COLUMN "workersSingle" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "workersDouble" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "daysSingle"    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "daysDouble"    INTEGER NOT NULL DEFAULT 0;
