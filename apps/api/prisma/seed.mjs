import { PrismaClient } from '@prisma/client';

const products = [
  { slug: 'ca-phe-sua', name: 'Cà phê sữa', price: 35000 },
  { slug: 'americano', name: 'Americano', price: 40000 },
  { slug: 'cappuccino', name: 'Cappuccino', price: 45000 },
  { slug: 'tra-dao', name: 'Trà đào', price: 39000 },
];

const sizes = [
  { name: 'S', price: 0 },
  { name: 'M', price: 5000 },
  { name: 'L', price: 10000 },
];

const toppings = [
  { name: 'Trân châu', price: 5000 },
  { name: 'Kem', price: 10000 },
];

const ingredients = [
  { code: 'COFFEE', name: 'Cà phê', unit: 'G', stock: 1000 },
  { code: 'WATER', name: 'Nước', unit: 'ML', stock: 10000 },
  { code: 'CONDENSED_MILK', name: 'Sữa đặc', unit: 'ML', stock: 1000 },
  { code: 'FRESH_MILK', name: 'Sữa tươi', unit: 'ML', stock: 2000 },
  { code: 'TEA', name: 'Trà', unit: 'G', stock: 500 },
  { code: 'PEACH_SYRUP', name: 'Siro đào', unit: 'ML', stock: 1000 },
  { code: 'PEARLS', name: 'Trân châu', unit: 'G', stock: 1000 },
  { code: 'CREAM', name: 'Kem', unit: 'G', stock: 1000 },
  { code: 'CUP', name: 'Ly giấy', unit: 'PIECE', stock: 100 },
];

// Công thức demo theo một ly. Các mảng lượng được xếp theo S, M, L.
const baseRecipes = {
  'ca-phe-sua': { COFFEE: [18, 22, 26], WATER: [60, 80, 100], CONDENSED_MILK: [25, 30, 35] },
  americano: { COFFEE: [18, 22, 26], WATER: [120, 160, 200] },
  cappuccino: { COFFEE: [18, 22, 26], FRESH_MILK: [120, 160, 200] },
  'tra-dao': { TEA: [5, 6, 7], WATER: [120, 160, 200], PEACH_SYRUP: [20, 25, 30] },
};
const toppingRecipes = {
  'Trân châu': { code: 'PEARLS', quantity: 30 },
  Kem: { code: 'CREAM', quantity: 20 },
};

const prisma = new PrismaClient();

try {
  await prisma.$transaction(async (db) => {
    const ingredientIds = new Map();
    for (const sample of ingredients) {
      const ingredient = await db.ingredient.upsert({
        where: { code: sample.code },
        create: sample,
        update: {},
        select: { id: true, unit: true },
      });
      if (ingredient.unit !== sample.unit) {
        throw new Error(`Đơn vị của ${sample.code} không khớp công thức mẫu`);
      }
      ingredientIds.set(sample.code, ingredient.id);
    }

    for (const sample of products) {
      const product = await db.product.upsert({
        where: { slug: sample.slug },
        create: { ...sample, imageUrl: `/images/products/${sample.slug}.jpg` },
        update: {},
        select: { id: true },
      });

      // The keys allow seed to fill missing options without replacing existing prices.
      for (const [index, size] of sizes.entries()) {
        const key = { productId: product.id, name: size.name };
        const savedSize = await db.productSize.upsert({
          where: { productId_name: key },
          create: { ...key, price: size.price },
          update: {},
          select: { id: true },
        });
        const recipe = { ...baseRecipes[sample.slug], CUP: [1, 1, 1] };
        for (const [code, quantities] of Object.entries(recipe)) {
          const ingredientKey = { sizeId: savedSize.id, ingredientId: ingredientIds.get(code) };
          await db.productSizeIngredient.upsert({
            where: { sizeId_ingredientId: ingredientKey },
            create: { ...ingredientKey, quantity: quantities[index] },
            update: {},
          });
        }
      }

      for (const topping of toppings) {
        const key = { productId: product.id, name: topping.name };
        const savedTopping = await db.productTopping.upsert({
          where: { productId_name: key },
          create: { ...key, price: topping.price },
          update: {},
          select: { id: true },
        });
        const { code, quantity } = toppingRecipes[topping.name];
        const ingredientKey = { toppingId: savedTopping.id, ingredientId: ingredientIds.get(code) };
        await db.productToppingIngredient.upsert({
          where: { toppingId_ingredientId: ingredientKey },
          create: { ...ingredientKey, quantity },
          update: {},
        });
      }
    }
  }, { timeout: 15000 });
  console.log('Đã kiểm tra và bổ sung dữ liệu mẫu BrewLite.');
} finally {
  await prisma.$disconnect();
}
