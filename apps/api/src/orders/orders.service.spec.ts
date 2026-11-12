import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import type { PrismaService } from '../prisma/prisma.service';
import { assertOrderStatusTransition } from './order-status';
import { OrdersService } from './orders.service';

const productId = '07442aa4-135f-4e17-b3f2-d935984b5633';
const size = {
  id: 'be72cb31-ea09-40ea-b37a-039b4f8081f5',
  name: 'M',
  price: 5000,
};
const topping = {
  id: '32bfcc03-659a-4aa3-9300-861664b5fc7e',
  name: 'Kem',
  price: 10000,
};
const product = {
  id: productId,
  name: 'Americano',
  price: 40000,
  sizes: [size],
  toppings: [topping],
};
const item = {
  productId,
  sizeId: size.id,
  toppingIds: [topping.id],
  quantity: 2,
};

function createService(products: (typeof product)[] = [product]) {
  const findMany = jest.fn(async () => products);
  const service = new OrdersService({
    product: { findMany },
  } as unknown as PrismaService);
  return { service, findMany };
}

describe('OrdersService', () => {
  it('prices all lines from catalog values and ignores prices supplied by the client', async () => {
    const { service, findMany } = createService();
    const result = await service.prepareOrder({
      items: [
        { ...item, productId: productId.toUpperCase(), unitPrice: 1 },
        { ...item, quantity: 1, toppingIds: [] },
      ],
      total: 1,
    });

    expect(result).toMatchObject({
      status: 'PENDING',
      total: 155000,
      items: [
        {
          productId,
          basePrice: 40000,
          size,
          toppings: [topping],
          unitPrice: 55000,
          lineTotal: 110000,
        },
        { unitPrice: 45000, lineTotal: 45000 },
      ],
    });
    expect(findMany).toHaveBeenCalledTimes(1);
  });

  it('allows a null size when a product has no sizes', async () => {
    const { service } = createService([{ ...product, sizes: [] }]);
    await expect(
      service.prepareOrder({ items: [{ ...item, sizeId: null }] }),
    ).resolves.toMatchObject({ total: 100000, items: [{ size: null }] });
  });

  it.each([
    ['an empty order', { items: [] }],
    [
      'a malformed product ID',
      { items: [{ ...item, productId: 'americano' }] },
    ],
    ['a fractional quantity', { items: [{ ...item, quantity: 1.5 }] }],
    [
      'a quantity above the cart limit',
      { items: [{ ...item, quantity: 100 }] },
    ],
    [
      'duplicate toppings',
      {
        items: [
          { ...item, toppingIds: [topping.id, topping.id.toUpperCase()] },
        ],
      },
    ],
  ])('rejects %s before querying Prisma', async (_label, input) => {
    const { service, findMany } = createService();
    await expect(service.prepareOrder(input)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(findMany).not.toHaveBeenCalled();
  });

  it.each([
    ['a missing size', { ...item, sizeId: null }],
    ['an unrelated size', { ...item, sizeId: topping.id }],
    ['an unrelated topping', { ...item, toppingIds: [size.id] }],
  ])('rejects %s for the product', async (_label, invalidItem) => {
    const { service } = createService();
    await expect(
      service.prepareOrder({ items: [invalidItem] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects totals larger than PostgreSQL integer can store', async () => {
    const { service } = createService([{ ...product, price: 2_147_483_647 }]);
    await expect(
      service.prepareOrder({ items: [item] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns not found when the selected product is no longer in the catalog', async () => {
    const { service } = createService([]);
    await expect(
      service.prepareOrder({ items: [item] }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('order status transitions', () => {
  it('allows the checkout and fulfillment path', () => {
    expect(() => assertOrderStatusTransition('PENDING', 'PAID')).not.toThrow();
    expect(() =>
      assertOrderStatusTransition('PAID', 'PREPARING'),
    ).not.toThrow();
    expect(() =>
      assertOrderStatusTransition('PREPARING', 'READY'),
    ).not.toThrow();
  });

  it('supports payment retry and requires READY before completion', () => {
    expect(() =>
      assertOrderStatusTransition('PENDING', 'PAYMENT_FAILED'),
    ).not.toThrow();
    expect(() =>
      assertOrderStatusTransition('PAYMENT_FAILED', 'PAID'),
    ).not.toThrow();
    expect(() => assertOrderStatusTransition('PREPARING', 'COMPLETED')).toThrow(
      ConflictException,
    );
    expect(() =>
      assertOrderStatusTransition('READY', 'COMPLETED'),
    ).not.toThrow();
  });

  it('blocks skipped states and rejects reopening a cancelled order', () => {
    expect(() => assertOrderStatusTransition('PAID', 'COMPLETED')).toThrow(
      ConflictException,
    );
    expect(() => assertOrderStatusTransition('CANCELLED', 'PAID')).toThrow(
      ConflictException,
    );
  });
});
