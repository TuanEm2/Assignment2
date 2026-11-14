import {
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import type { Prisma } from '@prisma/client';
import { InventoryService } from './inventory.service';

const uuid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

const orderId = uuid(1);
const productId = uuid(2);
const small = uuid(3);
const medium = uuid(4);
const topping = uuid(5);
const coffee = uuid(10);
const milk = uuid(11);
const cup = uuid(12);
const cream = uuid(13);

function fixture() {
  const sizeRows = [
    {
      id: small,
      productId,
      recipe: [
        { ingredientId: coffee, quantity: 10 },
        { ingredientId: milk, quantity: 20 },
        { ingredientId: cup, quantity: 1 },
      ],
    },
    {
      id: medium,
      productId,
      recipe: [
        { ingredientId: coffee, quantity: 15 },
        { ingredientId: milk, quantity: 30 },
        { ingredientId: cup, quantity: 1 },
      ],
    },
  ];

  const toppingRows = [
    {
      id: topping,
      productId,
      recipe: [
        { ingredientId: cream, quantity: 5 },
        { ingredientId: milk, quantity: 2 },
      ],
    },
  ];

  const ingredients = [coffee, milk, cup, cream].map((id) => ({
    id,
    name: id,
    unit: 'G',
    stock: 1000,
    version: 4,
  }));

  const updateMany = jest.fn(async () => ({ count: 1 }));
  const createMany = jest.fn(async () => ({ count: 4 }));
  const count = jest.fn(async () => 0);
  const queryRaw = jest.fn(async () => ingredients);

  const tx = {
    productSize: {
      findMany: jest.fn(async () => sizeRows),
    },
    productTopping: {
      findMany: jest.fn(async () => toppingRows),
    },
    ingredient: { updateMany },
    orderIngredient: { count, createMany },
    $queryRaw: queryRaw,
  };

  const reservation = {
    orderId,
    items: [
      {
        productId,
        sizeId: small,
        toppingIds: [topping],
        quantity: 2,
      },
      {
        productId,
        sizeId: medium,
        toppingIds: [],
        quantity: 1,
      },
    ],
  };

  return {
    service: new InventoryService(),
    tx: tx as unknown as Prisma.TransactionClient,
    sizeRows,
    toppingRows,
    ingredients,
    updateMany,
    createMany,
    count,
    reservation,
  };
}

describe('InventoryService ingredient requirements', () => {
  it('sums selected sizes, shared base/topping ingredients and quantities for the whole order', async () => {
    const f = fixture();

    await f.service.reserveStock(f.tx, f.reservation);

    expect(f.createMany).toHaveBeenCalledWith({
      data: [
        { orderId, ingredientId: coffee, quantity: 35 },
        { orderId, ingredientId: milk, quantity: 74 },
        { orderId, ingredientId: cup, quantity: 3 },
        { orderId, ingredientId: cream, quantity: 10 },
      ],
    });

    expect(f.updateMany).toHaveBeenCalledWith({
      where: {
        id: milk,
        version: 4,
        stock: { gte: 74 },
      },
      data: {
        stock: { decrement: 74 },
        version: { increment: 1 },
      },
    });
  });

  it('does not allow orders with an unconfigured size recipe', async () => {
    const f = fixture();
    f.sizeRows[0].recipe = [];

    await expect(
      f.service.reserveStock(f.tx, f.reservation),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    expect(f.updateMany).not.toHaveBeenCalled();
  });

  it('does not silently omit a selected topping with no ingredient recipe', async () => {
    const f = fixture();
    f.toppingRows[0].recipe = [];

    await expect(
      f.service.reserveStock(f.tx, f.reservation),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    expect(f.updateMany).not.toHaveBeenCalled();
  });

  it('rejects an option belonging to another product', async () => {
    const f = fixture();
    f.sizeRows[0].productId = uuid(99);

    await expect(
      f.service.reserveStock(f.tx, f.reservation),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    expect(f.updateMany).not.toHaveBeenCalled();
  });

  it('requires a configured base size instead of selling an untracked product', async () => {
    const f = fixture();

    await expect(
      f.service.reserveStock(f.tx, {
        orderId,
        items: [
          {
            productId,
            sizeId: null,
            toppingIds: [],
            quantity: 1,
          },
        ],
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    expect(f.updateMany).not.toHaveBeenCalled();
  });

  it('rejects ingredient requirements exceeding the PostgreSQL integer range', async () => {
    const f = fixture();
    f.sizeRows[0].recipe[0].quantity = 2_147_483_647;

    await expect(
      f.service.reserveStock(f.tx, f.reservation),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(f.updateMany).not.toHaveBeenCalled();
  });

  it('reports an insufficient ingredient and does not save a usage snapshot', async () => {
    const f = fixture();
    f.ingredients[0].stock = 0;

    await expect(
      f.service.reserveStock(f.tx, f.reservation),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(f.createMany).not.toHaveBeenCalled();
  });

  it('propagates a conditional update conflict for the caller to roll back', async () => {
    const f = fixture();
    f.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      f.service.reserveStock(f.tx, f.reservation),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(f.createMany).not.toHaveBeenCalled();
  });

  it('rejects a second reservation for an order that already has a snapshot', async () => {
    const f = fixture();
    f.count.mockResolvedValue(1);

    await expect(
      f.service.reserveStock(f.tx, f.reservation),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(f.updateMany).not.toHaveBeenCalled();
  });
});