-- Who turned this estimate into an order: the customer on their own page ("CUSTOMER"), or
-- the shop for them after they agreed by phone or in person ("SHOP").
--
-- The customer's page says which, so a door that became an order without them pressing
-- anything is explained rather than a surprise. Null on everything confirmed before this.
-- One nullable column, nothing dropped.

ALTER TABLE "Estimate" ADD COLUMN IF NOT EXISTS "confirmedBy" TEXT;
