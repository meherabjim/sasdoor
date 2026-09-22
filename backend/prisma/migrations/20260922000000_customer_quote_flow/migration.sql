-- Customer quote flow.
--
-- A customer can now design a door on the website with a carving traced from their own
-- photo. Nobody has ever priced that carving, so the website shows an estimate, marks it
-- as an estimate, and the shop sends a real price back before it can become an order.
--
-- Nothing existing is touched: three nullable columns, one boolean that defaults to false,
-- and one more value on the status enum. Every estimate already in the table keeps its
-- status, its lines and its totals exactly as they are.

-- 1 ---------------------------------------------------------------- the waiting status
ALTER TYPE "EstimateStatus" ADD VALUE IF NOT EXISTS 'QUOTED' AFTER 'NEW';

-- 2 ---------------------------------------------------------------- the customer's carving
-- Held on the estimate, not in the carving gallery: an abandoned request must not leave a
-- row behind, and the website must not be able to write into the shop's own gallery.
ALTER TABLE "Estimate"
  ADD COLUMN IF NOT EXISTS "customDesignSvg"  TEXT,
  ADD COLUMN IF NOT EXISTS "customDesignName" TEXT;

-- 3 ---------------------------------------------------------------- "this price is not final"
ALTER TABLE "Estimate"
  ADD COLUMN IF NOT EXISTS "needsQuote" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "quotedAt"   TIMESTAMP(3);
