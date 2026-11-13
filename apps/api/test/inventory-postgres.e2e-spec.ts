import {
  ConflictException,
  ServiceUnavailableException,
  type INestApplication,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from '@jest/globals';
import { PaymentMethod, PaymentOutcome } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureHttp } from '../src/http/app-http.config';
import { InventoryService } from '../src/inventory/inventory.service';
import type { OrderItemInput } from '../src/orders/order-input';
import {
  ORDER_STOCK_RESERVATION,
  type OrderStockReservation,
} from '../src/orders/order-stock.port';
import { OrdersService } from '../src/orders/orders.service';
import { PaymentsService } from '../src/payments/payments.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('TV4 — real ingredient inventory, PostgreSQL, concurrency and HTTP/JWT', () => {
  const prefix = `tv4-${randomUUID()}`;
  const ids = { coffee: '', milk: '', cup: '', cream: '' };
  const original = {
    coffee: 1000,
    milk: 1000,
    cup: 100,
    cream: 1000,
  };
  const productIds: string[] = [];

  let small: string;
  let medium: string;
  let other: string;
  let topping: string;
  let userId: string;
  let token: string;
  let prisma: PrismaService;
  let app: INestApplication;
  let orders: OrdersService;
  let inventory: InventoryService;
  let reserveStock: OrderStockReservation;

  const previousSecret = process.env.JWT_SECRET;
  const previousMode = process.env.PAYMENT_MODE;

  async function clearOrders() {
    if (!userId) return;

    await prisma.paymentAttempt.deleteMany({
      where: { order: { userId } },
    });
    await prisma.payment.deleteMany({
      where: { order: { userId } },
    });
    await prisma.order.deleteMany({ where: { userId } });
  }

  function item(
    overrides: Partial<OrderItemInput> = {},
  ): OrderItemInput {
    return {
      productId: productIds[0],
      sizeId: small,
      toppingIds: [],
      quantity: 1,
      ...overrides,
    };
  }

  async function create(
    items = [item()],
    key = randomUUID(),
  ) {
    return orders.createOrder(
      userId,
      { items },
      { reserveStock, idempotencyKey: key },
    );
  }

  async function stock() {
    return prisma.ingredient.findMany({
      where: { id: { in: Object.values(ids) } },
      select: {
        id: true,
        stock: true,
        version: true,
      },
      orderBy: { id: 'asc' },
    });
  }

  async function assertNoOrder() {
    expect(
      await prisma.order.count({ where: { userId } }),
    ).toBe(0);
    expect(
      await prisma.orderItem.count({
        where: { order: { userId } },
      }),
    ).toBe(0);
    expect(
      await prisma.orderIngredient.count({
        where: { order: { userId } },
      }),
    ).toBe(0);
  }

  beforeAll(async () => {
    const value = process.env.BREWLITE_INVENTORY_TEST_DATABASE_URL;

    if (!value) {
      throw new Error(
        'Set BREWLITE_INVENTORY_TEST_DATABASE_URL to a dedicated migrated local PostgreSQL test database.',
      );
    }

    const url = new URL(value);

    if (
      !['postgres:', 'postgresql:'].includes(url.protocol) ||
      !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
      !/(^|_)tests?(_|$)/i.test(url.pathname.slice(1))
    ) {
      throw new Error(
        'Inventory E2E requires a local PostgreSQL database whose name contains _test; never use application/production data.',
      );
    }

    prisma = new PrismaService({ datasourceUrl: value });
    await prisma.$connect();

    process.env.JWT_SECRET =
      'tv4-inventory-http-test-only-secret-at-least-32-bytes';
    process.env.PAYMENT_MODE = 'mock';

    const module = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = module.createNestApplication({ logger: false });
    configureHttp(app);
    await app.init();

    orders = app.get(OrdersService);
    inventory = app.get(InventoryService);
    reserveStock = app.get<OrderStockReservation>(
      ORDER_STOCK_RESERVATION,
    );

    const email = `${prefix}@example.invalid`;
    const password = 'TV4-Inventory-Test-Only-42';

    const account = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, password })
      .expect(201);

    userId = account.body.user.id as string;

    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);

    token = login.body.accessToken as string;

    for (const name of Object.keys(ids) as Array<keyof typeof ids>) {
      const ingredient = await prisma.ingredient.create({
        data: {
          code: `${prefix}-${name}`,
          name: `${prefix} ${name}`,
          unit:
            name === 'milk'
              ? 'ML'
              : name === 'cup'
                ? 'PIECE'
                : 'G',
          stock: original[name],
        },
      });

      ids[name] = ingredient.id;
    }

    const a = await prisma.product.create({
      data: {
        slug: `${prefix}-a`,
        name: 'Ingredient drink A',
        price: 30000,
        imageUrl: '/test',
        stock: { create: { quantity: 1000 } },
        sizes: {
          create: [
            { name: 'S', price: 0 },
            { name: 'M', price: 5000 },
          ],
        },
        toppings: {
          create: { name: 'Cream', price: 5000 },
        },
      },
      include: {
        sizes: true,
        toppings: true,
      },
    });

    productIds.push(a.id);
    small = a.sizes.find((size) => size.name === 'S')!.id;
    medium = a.sizes.find((size) => size.name === 'M')!.id;
    topping = a.toppings[0].id;

    const b = await prisma.product.create({
      data: {
        slug: `${prefix}-b`,
        name: 'Ingredient drink B',
        price: 25000,
        imageUrl: '/test',
        stock: { create: { quantity: 1000 } },
        sizes: {
          create: { name: 'S', price: 0 },
        },
      },
      include: { sizes: true },
    });

    productIds.push(b.id);
    other = b.sizes[0].id;
  }, 30000);

  beforeEach(async () => {
    await clearOrders();

    for (const name of Object.keys(ids) as Array<keyof typeof ids>) {
      await prisma.ingredient.update({
        where: { id: ids[name] },
        data: {
          stock: original[name],
          version: 0,
        },
      });
    }

    await prisma.productSizeIngredient.deleteMany({
      where: { sizeId: { in: [small, medium, other] } },
    });

    await prisma.productToppingIngredient.deleteMany({
      where: { toppingId: topping },
    });

    await prisma.productSizeIngredient.createMany({
      data: [
        [small, 10, 20],
        [medium, 15, 30],
        [other, 5, 10],
      ].flatMap(([sizeId, coffee, milk]) => [
        {
          sizeId: sizeId as string,
          ingredientId: ids.coffee,
          quantity: coffee as number,
        },
        {
          sizeId: sizeId as string,
          ingredientId: ids.milk,
          quantity: milk as number,
        },
        {
          sizeId: sizeId as string,
          ingredientId: ids.cup,
          quantity: 1,
        },
      ]),
    });

    await prisma.productToppingIngredient.createMany({
      data: [
        {
          toppingId: topping,
          ingredientId: ids.cream,
          quantity: 5,
        },
        {
          toppingId: topping,
          ingredientId: ids.milk,
          quantity: 2,
        },
      ],
    });
  });

  afterAll(async () => {
    try {
      if (prisma) {
        await clearOrders();

        if (productIds.length) {
          await prisma.product.deleteMany({
            where: { id: { in: productIds } },
          });
        }

        if (userId) {
          await prisma.user.delete({ where: { id: userId } });
        }

        await prisma.ingredient.deleteMany({
          where: {
            id: { in: Object.values(ids).filter(Boolean) },
          },
        });
      }
    } finally {
      await app?.close();
      await prisma?.$disconnect();

      if (previousSecret === undefined) {
        delete process.env.JWT_SECRET;
      } else {
        process.env.JWT_SECRET = previousSecret;
      }

      if (previousMode === undefined) {
        delete process.env.PAYMENT_MODE;
      } else {
        process.env.PAYMENT_MODE = previousMode;
      }
    }
  });

  it('reserves exact base/size/topping quantities across products and stores snapshots', async () => {
    const saved = await create([
      item({ quantity: 2, toppingIds: [topping] }),
      item({ sizeId: medium }),
      item({
        productId: productIds[1],
        sizeId: other,
      }),
    ]);

    const usages = await prisma.orderIngredient.findMany({
      where: { orderId: saved.id },
    });

    expect(
      Object.fromEntries(
        usages.map((usage) => [
          usage.ingredientId,
          usage.quantity,
        ]),
      ),
    ).toEqual({
      [ids.coffee]: 40,
      [ids.milk]: 84,
      [ids.cup]: 4,
      [ids.cream]: 10,
    });

    expect(
      (
        await prisma.ingredient.findUniqueOrThrow({
          where: { id: ids.milk },
        })
      ).stock,
    ).toBe(916);

    const legacy = await prisma.stock.findMany({
      where: { productId: { in: productIds } },
    });

    expect(legacy.map((entry) => entry.quantity)).toEqual([
      1000,
      1000,
    ]);
  });

  it('does not sell a size without an ingredient recipe', async () => {
    await prisma.productSizeIngredient.deleteMany({
      where: { sizeId: small },
    });

    const before = await stock();

    await expect(create()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );

    expect(await stock()).toEqual(before);
    await assertNoOrder();
  });

  it('does not silently skip selected toppings with missing recipes', async () => {
    await prisma.productToppingIngredient.deleteMany({
      where: { toppingId: topping },
    });

    const before = await stock();

    await expect(
      create([item({ toppingIds: [topping] })]),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    expect(await stock()).toEqual(before);
    await assertNoOrder();
  });

  it('rolls back all ingredients and order rows if any ingredient is insufficient', async () => {
    await prisma.ingredient.update({
      where: { id: ids.milk },
      data: { stock: 0 },
    });

    const before = await stock();

    await expect(create()).rejects.toBeInstanceOf(
      ConflictException,
    );

    expect(await stock()).toEqual(before);
    await assertNoOrder();
  });

  it('sums repeated lines before checking shared ingredient stock', async () => {
    await prisma.ingredient.update({
      where: { id: ids.coffee },
      data: { stock: 25 },
    });

    const before = await stock();

    await expect(
      create([
        item({ quantity: 2 }),
        item({ quantity: 1, toppingIds: [topping] }),
      ]),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(await stock()).toEqual(before);
    await assertNoOrder();
  });

  it('rolls back order, item, version and usage snapshot after a later transaction failure', async () => {
    const before = await stock();
    const error = new Error('Failure after ingredient reservation');

    await expect(
      orders.createOrder(
        userId,
        { items: [item()] },
        {
          reserveStock: async (tx, reservation) => {
            await reserveStock(tx, reservation);
            throw error;
          },
        },
      ),
    ).rejects.toBe(error);

    expect(await stock()).toEqual(before);
    await assertNoOrder();
  });

  it('allows exactly 3 of 10 simultaneous orders sharing ingredients across different products', async () => {
    await prisma.productSizeIngredient.update({
      where: {
        sizeId_ingredientId: {
          sizeId: other,
          ingredientId: ids.coffee,
        },
      },
      data: { quantity: 10 },
    });

    await prisma.ingredient.update({
      where: { id: ids.coffee },
      data: { stock: 30 },
    });

    const results = await Promise.allSettled(
      Array.from({ length: 10 }, (_, i) =>
        create([
          i % 2
            ? item({
                productId: productIds[1],
                sizeId: other,
              })
            : item(),
        ]),
      ),
    );

    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(3);

    for (const result of results) {
      if (result.status === 'rejected') {
        expect(result.reason).toBeInstanceOf(ConflictException);
      }
    }

    expect(
      await prisma.order.count({ where: { userId } }),
    ).toBe(3);

    expect(
      await prisma.ingredient.findUniqueOrThrow({
        where: { id: ids.coffee },
      }),
    ).toMatchObject({
      stock: 0,
      version: 3,
    });

    expect(
      await prisma.orderIngredient.count({
        where: { ingredientId: ids.coffee },
      }),
    ).toBe(3);
  }, 30000);

  it('replays 10 simultaneous requests with one idempotency key without deducting twice', async () => {
    const key = randomUUID();

    const results = await Promise.all(
      Array.from({ length: 10 }, () => create([item()], key)),
    );

    expect(new Set(results.map((result) => result.id)).size).toBe(1);

    expect(
      await prisma.order.count({ where: { userId } }),
    ).toBe(1);

    expect(
      await prisma.ingredient.findUniqueOrThrow({
        where: { id: ids.coffee },
      }),
    ).toMatchObject({
      stock: 990,
      version: 1,
    });
  }, 30000);

  it('rejects a changed payload for the same order key without deducting more ingredients', async () => {
    const key = randomUUID();

    await create([item()], key);
    const before = await stock();

    await expect(
      create([item({ quantity: 2 })], key),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(await stock()).toEqual(before);
  });

  it('serves real JWT-protected HTTP orders through the production inventory provider', async () => {
    const http = request(app.getHttpServer());

    await http
      .post('/api/orders')
      .send({ items: [item()] })
      .expect(401);

    await http
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [item()], total: 1 })
      .expect(400);

    const key = randomUUID();

    const send = () =>
      http
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', key)
        .send({
          items: [item({ toppingIds: [topping] })],
        });

    const first = await send().expect(201);
    await send().expect(201, first.body);

    expect(
      await prisma.order.count({ where: { userId } }),
    ).toBe(1);

    expect(
      await prisma.ingredient.findUniqueOrThrow({
        where: { id: ids.milk },
      }),
    ).toMatchObject({
      stock: 978,
      version: 1,
    });
  });

  it('payment failure, replay and success do not deduct reserved ingredients again', async () => {
    const saved = await create();
    const before = await stock();
    const payments = app.get(PaymentsService);

    const failure = {
      orderId: saved.id,
      method: PaymentMethod.MOCK_WALLET,
      outcome: PaymentOutcome.FAILURE,
      idempotencyKey: randomUUID(),
    };

    await payments.mockPayment(userId, failure);
    await payments.mockPayment(userId, failure);

    await payments.mockPayment(userId, {
      ...failure,
      outcome: PaymentOutcome.SUCCESS,
      idempotencyKey: randomUUID(),
    });

    expect(await stock()).toEqual(before);

    expect(
      await prisma.payment.count({
        where: { orderId: saved.id },
      }),
    ).toBe(1);

    expect(
      await prisma.paymentAttempt.count({
        where: { orderId: saved.id },
      }),
    ).toBe(2);
  });

  it('releases stored quantities after recipe changes and only once across concurrent calls', async () => {
    const saved = await create([
      item({ toppingIds: [topping] }),
    ]);

    await prisma.productSizeIngredient.update({
      where: {
        sizeId_ingredientId: {
          sizeId: small,
          ingredientId: ids.coffee,
        },
      },
      data: { quantity: 500 },
    });

    await prisma.productToppingIngredient.update({
      where: {
        toppingId_ingredientId: {
          toppingId: topping,
          ingredientId: ids.cream,
        },
      },
      data: { quantity: 99 },
    });

    await orders.transitionStatus(saved.id, 'CANCELLED');

    await Promise.all(
      Array.from({ length: 3 }, () =>
        prisma.$transaction((tx) =>
          inventory.releaseStock(tx, saved.id),
        ),
      ),
    );

    for (const name of Object.keys(ids) as Array<keyof typeof ids>) {
      expect(
        await prisma.ingredient.findUniqueOrThrow({
          where: { id: ids[name] },
        }),
      ).toMatchObject({
        stock: original[name],
        version: 2,
      });
    }

    expect(
      (
        await prisma.order.findUniqueOrThrow({
          where: { id: saved.id },
        })
      ).stockReleasedAt,
    ).toBeInstanceOf(Date);

    expect(
      await prisma.orderIngredient.count({
        where: { orderId: saved.id },
      }),
    ).toBe(4);
  });

  it('rolls back cancellation, stock and release marker together when the caller fails', async () => {
    const saved = await create();
    const before = await stock();
    const error = new Error('Failure after release');

    await expect(
      prisma.$transaction(async (tx) => {
        await orders.transitionStatus(saved.id, 'CANCELLED', tx);
        await inventory.releaseStock(tx, saved.id);
        throw error;
      }),
    ).rejects.toBe(error);

    expect(await stock()).toEqual(before);

    expect(
      await prisma.order.findUniqueOrThrow({
        where: { id: saved.id },
      }),
    ).toMatchObject({
      status: 'PENDING',
      stockReleasedAt: null,
    });
  });

  it('does not release a pending or paid order without the cancellation/refund conditions', async () => {
    const saved = await create();
    const before = await stock();

    await expect(
      prisma.$transaction((tx) =>
        inventory.releaseStock(tx, saved.id),
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    await app.get(PaymentsService).mockPayment(userId, {
      orderId: saved.id,
      method: PaymentMethod.MOCK_CARD,
      outcome: PaymentOutcome.SUCCESS,
      idempotencyKey: randomUUID(),
    });

    await orders.transitionStatus(saved.id, 'CANCELLED');

    await expect(
      prisma.$transaction((tx) =>
        inventory.releaseStock(tx, saved.id),
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(await stock()).toEqual(before);

    expect(
      (
        await prisma.order.findUniqueOrThrow({
          where: { id: saved.id },
        })
      ).stockReleasedAt,
    ).toBeNull();
  });
});