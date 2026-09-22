-- How many people the colour work takes.
--
-- Everything else the shop prices already says how many men and how many days it needs; a
-- colour did not, so "how many people does this door take" had a hole in it.
--
-- Defaulted to 0, which is exactly today's behaviour: a colour with no crew is material,
-- not a job, and nothing appears on the work sheet for it. Fill it in and the colour
-- becomes a job somebody is put on - so a shop that prices painting through its Labour
-- rates instead can simply leave these at 0 and nothing changes.
--
-- Nothing existing is touched. Four defaulted columns, no drops.

ALTER TABLE "Color"
  ADD COLUMN IF NOT EXISTS "workersSingle" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "workersDouble" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "daysSingle"    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "daysDouble"    INTEGER NOT NULL DEFAULT 0;
