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

const prisma = new PrismaClient();

try {
  await prisma.$transaction(async (db) => {
    for (const sample of products) {
      const product = await db.product.upsert({
        where: { slug: sample.slug },
        create: { ...sample, imageUrl: `/images/products/${sample.slug}.jpg` },
        update: {},
        select: { id: true },
      });

      await db.stock.upsert({
        where: { productId: product.id },
        create: { productId: product.id, quantity: 100 },
        update: {},
      });

      // The keys allow seed to fill missing options without replacing existing prices.
      for (const size of sizes) {
        const key = { productId: product.id, name: size.name };
        await db.productSize.upsert({
          where: { productId_name: key },
          create: { ...key, price: size.price },
          update: {},
        });
      }

      for (const topping of toppings) {
        const key = { productId: product.id, name: topping.name };
        await db.productTopping.upsert({
          where: { productId_name: key },
          create: { ...key, price: topping.price },
          update: {},
        });
      }
    }
  });
  console.log('Đã kiểm tra và bổ sung dữ liệu mẫu BrewLite.');
} finally {
  await prisma.$disconnect();
}
