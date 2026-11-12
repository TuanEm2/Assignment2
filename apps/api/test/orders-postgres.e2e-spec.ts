import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from '@jest/globals';
import { randomUUID } from 'node:crypto';
import type { OrderItemInput } from '../src/orders/order-input';
import type { CreateOrderOptions } from '../src/orders/order-types';
import { OrdersService } from '../src/orders/orders.service';
import { PrismaService } from '../src/prisma/prisma.service';

const databaseUrl = process.env.BREWLITE_ORDERS_TEST_DATABASE_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;

describeWithDatabase('OrdersService with the TV2 PostgreSQL schema', () => {
  const fixtureId = randomUUID();
  let prisma: PrismaService;
  let service: OrdersService;
  let userId: string;
  let productId: string;
  let item: OrderItemInput;

  // Test callback for TV4's inventory boundary, using the real Stock table.
  const reserveStock: CreateOrderOptions['reserveStock'] = async (
    tx,
    requirements,
  ) => {
    for (const { productId, quantity } of requirements) {
      const updated = await tx.stock.updateMany({
        where: { productId, quantity: { gte: quantity } },
        data: { quantity: { decrement: quantity }, version: { increment: 1 } },
      });
      if (updated.count !== 1)
        throw new ConflictException('Insufficient stock');
    }
  };

  beforeAll(async () => {
    prisma = new PrismaService({ datasourceUrl: databaseUrl });
    service = new OrdersService(prisma);
    const user = await prisma.user.create({
      data: {
        email: `tv3-${fixtureId}@example.invalid`,
        passwordHash: 'test-only',
      },
    });
    userId = user.id;
    const product = await prisma.product.create({
      data: {
        slug: `tv3-${fixtureId}`,
        name: 'Integration Americano',
        price: 40000,
        imageUrl: '/test',
        stock: { create: { quantity: 5 } },
        sizes: { create: { name: 'M', price: 5000 } },
        toppings: { create: { name: 'Cream', price: 10000 } },
      },
      include: { sizes: true, toppings: true },
    });
    productId = product.id;
    item = {
      productId,
      sizeId: product.sizes[0].id,
      toppingIds: [product.toppings[0].id],
      quantity: 2,
    };
  });

  beforeEach(async () => {
    await prisma.order.deleteMany({ where: { userId } });
    await prisma.stock.update({
      where: { productId },
      data: { quantity: 5, version: 0 },
    });
  });

  afterAll(async () => {
    if (!prisma) return;
    try {
      if (userId) {
        await prisma.order.deleteMany({ where: { userId } });
        await prisma.user.delete({ where: { id: userId } });
      }
      if (productId) await prisma.product.delete({ where: { id: productId } });
    } finally {
      await prisma.$disconnect();
    }
  });

  async function availableStock(): Promise<number> {
    const stock = await prisma.stock.findUniqueOrThrow({
      where: { productId },
    });
    return stock.quantity;
  }

  it('persists the order and its price, size and topping snapshots', async () => {
    const order = await service.createOrder(
      userId,
      { items: [{ ...item, unitPrice: 1 }], total: 1 },
      { reserveStock },
    );
    const stored = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { items: true },
    });

    expect(stored).toMatchObject({
      id: order.id,
      userId,
      status: 'PENDING',
      total: 110000,
      items: [
        {
          productId,
          productName: 'Integration Americano',
          sizeId: item.sizeId,
          sizeName: 'M',
          toppings: [{ id: item.toppingIds[0], name: 'Cream', price: 10000 }],
          quantity: 2,
          unitPrice: 55000,
          lineTotal: 110000,
        },
      ],
    });
    expect(await availableStock()).toBe(3);
  });

  it('rolls back the order, items and stock when reservation fails after writing', async () => {
    const error = new ConflictException('Failed after reserving stock');
    await expect(
      service.createOrder(
        userId,
        { items: [item] },
        {
          reserveStock: async (tx, requirements) => {
            await reserveStock(tx, requirements);
            throw error;
          },
        },
      ),
    ).rejects.toBe(error);

    expect(await prisma.order.count({ where: { userId } })).toBe(0);
    expect(await prisma.orderItem.count({ where: { productId } })).toBe(0);
    expect(await availableStock()).toBe(5);
  });

  it('rejects multiple lines whose combined quantity exceeds shared stock', async () => {
    const items = [
      { ...item, quantity: 3 },
      { ...item, toppingIds: [], quantity: 3 },
    ];
    await expect(
      service.createOrder(userId, { items }, { reserveStock }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(await prisma.order.count({ where: { userId } })).toBe(0);
    expect(await availableStock()).toBe(5);
  });

  it('stores the payment retry and fulfillment transitions, including READY', async () => {
    const { id } = await service.createOrder(
      userId,
      { items: [item] },
      { reserveStock },
    );
    await service.transitionStatus(id, 'PAYMENT_FAILED');
    await prisma.$transaction((tx) => service.transitionStatus(id, 'PAID', tx));
    await service.transitionStatus(id, 'PREPARING');
    await expect(
      service.transitionStatus(id, 'COMPLETED'),
    ).rejects.toBeInstanceOf(ConflictException);
    await service.transitionStatus(id, 'READY');
    await service.transitionStatus(id, 'COMPLETED');
    await expect(service.transitionStatus(id, 'PAID')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(
      await prisma.order.findUniqueOrThrow({
        where: { id },
        select: { status: true },
      }),
    ).toEqual({ status: 'COMPLETED' });
  });

  it('does not reserve stock for a missing customer', async () => {
    await expect(
      service.createOrder(randomUUID(), { items: [item] }, { reserveStock }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(await availableStock()).toBe(5);
  });

  it('replays concurrent requests with the same key and reserves stock once', async () => {
    const options = { reserveStock, idempotencyKey: randomUUID() };
    const input = { items: [{ ...item, quantity: 5 }] };
    const [first, second] = await Promise.all([
      service.createOrder(userId, input, options),
      service.createOrder(userId, input, options),
    ]);
    expect(second.id).toBe(first.id);
    expect(await prisma.order.count({ where: { userId } })).toBe(1);
    expect(await availableStock()).toBe(0);
    await expect(
      service.createOrder(userId, { items: [item] }, options),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('allows only one of two concurrent writes to the same order status', async () => {
    const { id } = await service.createOrder(
      userId,
      { items: [item] },
      { reserveStock },
    );
    const results = await Promise.allSettled([
      service.transitionStatus(id, 'PAID'),
      service.transitionStatus(id, 'PAID'),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      results.find((result) => result.status === 'rejected')?.reason,
    ).toBeInstanceOf(ConflictException);
    expect(
      await prisma.order.findUniqueOrThrow({
        where: { id },
        select: { status: true },
      }),
    ).toEqual({ status: 'PAID' });
  });
});
