BEGIN;

CREATE TYPE "SizeName" AS ENUM ('S', 'M', 'L');

CREATE TABLE "Product" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "imageUrl" TEXT NOT NULL,
    CONSTRAINT "Product_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Product_price_nonnegative" CHECK ("price" >= 0)
);

CREATE TABLE "ProductSize" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "name" "SizeName" NOT NULL,
    "price" INTEGER NOT NULL,
    CONSTRAINT "ProductSize_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProductSize_price_nonnegative" CHECK ("price" >= 0)
);

CREATE TABLE "ProductTopping" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    CONSTRAINT "ProductTopping_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProductTopping_price_nonnegative" CHECK ("price" >= 0)
);

CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
CREATE UNIQUE INDEX "ProductSize_productId_name_key" ON "ProductSize"("productId", "name");
CREATE UNIQUE INDEX "ProductTopping_productId_name_key" ON "ProductTopping"("productId", "name");

ALTER TABLE "ProductSize" ADD CONSTRAINT "ProductSize_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductTopping" ADD CONSTRAINT "ProductTopping_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
