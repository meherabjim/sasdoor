-- How much thickness the planer takes off a rough plank.
--
-- A 1.5" door is not cut from 1.5" timber: the plank arrives rough and is planed smooth,
-- and the shavings were wood the shop paid for. This is added to the door and frame
-- thickness (and the frame width) when the wood for a door is worked out.
--
-- Defaulted to 0, which is exactly today's behaviour. One column, nothing dropped.

ALTER TABLE "Setting" ADD COLUMN IF NOT EXISTS "planingAllowanceInch" DECIMAL(6,2) NOT NULL DEFAULT 0;
