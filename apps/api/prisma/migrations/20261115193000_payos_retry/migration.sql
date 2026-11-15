-- Retain historical PayOS payment attempts for webhook reconciliation.
-- A cancelled or expired PayOS link can be followed by a new link for the same BrewLite order.
DROP INDEX IF EXISTS "PayosCheckout_orderId_key";
CREATE INDEX "PayosCheckout_orderId_createdAt_idx" ON "PayosCheckout"("orderId", "createdAt");
