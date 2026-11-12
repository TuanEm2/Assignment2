BEGIN;

-- CreateEnum
CREATE TYPE "IngredientUnit" AS ENUM ('G', 'ML', 'PIECE');

-- CreateTable
CREATE TABLE "Ingredient" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" "IngredientUnit" NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSizeIngredient" (
    "sizeId" UUID NOT NULL,
    "ingredientId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "ProductSizeIngredient_pkey" PRIMARY KEY ("sizeId","ingredientId")
);

-- CreateTable
CREATE TABLE "ProductToppingIngredient" (
    "toppingId" UUID NOT NULL,
    "ingredientId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "ProductToppingIngredient_pkey" PRIMARY KEY ("toppingId","ingredientId")
);

-- CreateTable
CREATE TABLE "OrderIngredient" (
    "orderId" UUID NOT NULL,
    "ingredientId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "OrderIngredient_pkey" PRIMARY KEY ("orderId","ingredientId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ingredient_code_key" ON "Ingredient"("code");

-- CreateIndex
CREATE INDEX "ProductSizeIngredient_ingredientId_idx" ON "ProductSizeIngredient"("ingredientId");

-- CreateIndex
CREATE INDEX "ProductToppingIngredient_ingredientId_idx" ON "ProductToppingIngredient"("ingredientId");

-- CreateIndex
CREATE INDEX "OrderIngredient_ingredientId_idx" ON "OrderIngredient"("ingredientId");

-- AddForeignKey
ALTER TABLE "ProductSizeIngredient" ADD CONSTRAINT "ProductSizeIngredient_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "ProductSize"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSizeIngredient" ADD CONSTRAINT "ProductSizeIngredient_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductToppingIngredient" ADD CONSTRAINT "ProductToppingIngredient_toppingId_fkey" FOREIGN KEY ("toppingId") REFERENCES "ProductTopping"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductToppingIngredient" ADD CONSTRAINT "ProductToppingIngredient_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderIngredient" ADD CONSTRAINT "OrderIngredient_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderIngredient" ADD CONSTRAINT "OrderIngredient_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Ingredient"
    ADD CONSTRAINT "Ingredient_stock_nonnegative" CHECK ("stock" >= 0),
    ADD CONSTRAINT "Ingredient_version_nonnegative" CHECK ("version" >= 0);

ALTER TABLE "ProductSizeIngredient"
    ADD CONSTRAINT "ProductSizeIngredient_quantity_positive" CHECK ("quantity" > 0);

ALTER TABLE "ProductToppingIngredient"
    ADD CONSTRAINT "ProductToppingIngredient_quantity_positive" CHECK ("quantity" > 0);

ALTER TABLE "OrderIngredient"
    ADD CONSTRAINT "OrderIngredient_quantity_positive" CHECK ("quantity" > 0);

COMMIT;
