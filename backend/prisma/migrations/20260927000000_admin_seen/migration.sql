-- When the shop first opened an order that came in from the website.
--
-- A door ordered off the website - picked from the gallery, or a customer's own carving
-- they accepted the price for - arrives while nobody is looking. Until somebody opens it,
-- it is counted on the Orders link and tagged "New" in the list, the way an unread
-- message is. Opening it sets this.
--
-- One nullable column, nothing dropped. Orders older than a day are marked as already
-- seen, so the count starts from what is actually new instead of the whole history.

ALTER TABLE "Estimate" ADD COLUMN IF NOT EXISTS "adminSeenAt" TIMESTAMP(3);

UPDATE "Estimate" SET "adminSeenAt" = NOW()
WHERE "adminSeenAt" IS NULL AND "createdAt" < NOW() - INTERVAL '1 day';
