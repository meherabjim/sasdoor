-- Supplier advance: mark a payment as money given BEFORE the wood arrives.
-- PAYMENT = paying off what we already owe (the old behaviour, so it is the default).
-- ADVANCE = money handed over in advance; the supplier now owes us wood.

CREATE TYPE "SupplierPaymentType" AS ENUM ('PAYMENT', 'ADVANCE');

ALTER TABLE "SupplierPayment"
  ADD COLUMN "type" "SupplierPaymentType" NOT NULL DEFAULT 'PAYMENT';
