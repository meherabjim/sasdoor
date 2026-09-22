-- The workshop: who is on which job, and how far along it is.
--
-- Until now "2 people, 4 days" was worked out while the estimate was on screen and then
-- thrown away when it was saved, so an order could never answer "how many men does this
-- need" or "where has it got to". Both now live on the order itself.
--
-- Nothing existing is touched. One new table, five nullable-or-defaulted columns, no drops
-- and no changes to any column that already holds data. Every estimate in the table keeps
-- its lines, its totals and its status exactly as they are; the new columns read 0 and
-- NULL on all of them, which is the truth - nobody was ever assigned to those jobs.

-- 1 ---------------------------------------------------------------- the people
CREATE TABLE IF NOT EXISTS "Worker" (
  "id"        SERIAL           PRIMARY KEY,
  "name"      TEXT             NOT NULL,
  "phone"     TEXT,
  "skill"     "LabourCategory" NOT NULL DEFAULT 'OTHER',
  "note"      TEXT,
  "active"    BOOLEAN          NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2 ---------------------------------------------------------------- the plan, frozen
-- Copied off the price list when the estimate is saved, so a later price change cannot
-- rewrite what was agreed for a door that is already being made.
ALTER TABLE "EstimateLine"
  ADD COLUMN IF NOT EXISTS "workers"   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "days"      INTEGER NOT NULL DEFAULT 0;

-- 3 ---------------------------------------------------------------- who, and how far
ALTER TABLE "EstimateLine"
  ADD COLUMN IF NOT EXISTS "workerId"  INTEGER,
  ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "doneAt"    TIMESTAMP(3);

-- ON DELETE SET NULL: a worker who leaves the shop is removed from the list without
-- taking the history of the doors he built with him.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EstimateLine_workerId_fkey') THEN
    ALTER TABLE "EstimateLine"
      ADD CONSTRAINT "EstimateLine_workerId_fkey"
      FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "EstimateLine_workerId_idx" ON "EstimateLine"("workerId");
