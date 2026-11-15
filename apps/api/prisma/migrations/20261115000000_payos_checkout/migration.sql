-- Isolated extension to the Assignment 2 schema; existing mock payments stay valid.
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'PAYOS_QR';

CREATE TABLE "PayosCheckout" (
  "orderCode" INTEGER NOT NULL,
  "orderId" UUID NOT NULL,
  "amount" INTEGER NOT NULL,
  "checkoutUrl" TEXT,
  "paymentLinkId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'CREATING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PayosCheckout_pkey" PRIMARY KEY ("orderCode"),
  CONSTRAINT "PayosCheckout_amount_positive" CHECK ("amount" > 0)
);
CREATE UNIQUE INDEX "PayosCheckout_orderId_key" ON "PayosCheckout"("orderId");
ALTER TABLE "PayosCheckout" ADD CONSTRAINT "PayosCheckout_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
