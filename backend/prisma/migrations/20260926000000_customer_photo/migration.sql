-- The photo a customer traced their own carving from.
--
-- The traced drawing alone is the tracer's reading of the photo; to price the carving and
-- to cut it, the shop needs the photo itself. It is stored as a file in uploads/ and only
-- its link sits here.
--
-- Nothing existing is touched. One nullable column, no drops: every estimate made before
-- this simply has no photo. IF NOT EXISTS, so a database that already has the column (it
-- was first added on 16 Nov 2026 under this same migration name) is left as it is.

ALTER TABLE "Estimate" ADD COLUMN IF NOT EXISTS "customDesignSourceUrl" TEXT;
