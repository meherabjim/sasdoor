-- Telling the customer what happened to their door.
--
-- Kept as rows rather than fired and forgotten: the customer's own page shows what they
-- were told and when, and a text message that never left is still visible to them there.
-- Both languages are written at the time, because which one to read is the reader's choice.
--
-- Nothing existing is touched: one new table, no changes to any column that holds data.

CREATE TABLE IF NOT EXISTS "Notification" (
  "id"         SERIAL       PRIMARY KEY,
  "customerId" INTEGER      NOT NULL,
  "estimateId" INTEGER,
  "titleEn"    TEXT         NOT NULL,
  "titleBn"    TEXT         NOT NULL,
  "bodyEn"     TEXT         NOT NULL,
  "bodyBn"     TEXT         NOT NULL,
  "readAt"     TIMESTAMP(3),
  "smsSentAt"  TIMESTAMP(3),
  "smsError"   TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Notification_customerId_fkey') THEN
    ALTER TABLE "Notification" ADD CONSTRAINT "Notification_customerId_fkey"
      FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Notification_estimateId_fkey') THEN
    ALTER TABLE "Notification" ADD CONSTRAINT "Notification_estimateId_fkey"
      FOREIGN KEY ("estimateId") REFERENCES "Estimate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Notification_customerId_createdAt_idx" ON "Notification"("customerId", "createdAt");
