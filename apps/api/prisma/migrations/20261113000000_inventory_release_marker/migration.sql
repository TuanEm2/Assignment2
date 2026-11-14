-- Keep ingredient usage snapshots and mark a cancelled order as released once.
ALTER TABLE "Order" ADD COLUMN "stockReleasedAt" TIMESTAMP(3);