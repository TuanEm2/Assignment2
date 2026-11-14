import { BadRequestException, ConflictException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { OrderItemInput } from './order-input';

export function validateOrderKey(key: string | undefined): string | undefined {
  if (
    key !== undefined &&
    (typeof key !== 'string' || !/^[!-~]{1,128}$/.test(key))
  ) {
    throw new BadRequestException(
      'Idempotency key must be 1 to 128 printable characters without spaces',
    );
  }
  return key;
}

function itemKeys(items: OrderItemInput[]): string[] {
  return items
    .map(({ productId, sizeId, toppingIds, quantity }) =>
      JSON.stringify([productId, sizeId, [...toppingIds].sort(), quantity]),
    )
    .sort();
}

export function assertSameOrderItems(
  requested: OrderItemInput[],
  stored: {
    productId: string;
    sizeId: string | null;
    toppings: Prisma.JsonValue;
    quantity: number;
  }[],
): void {
  const existing = stored.map(({ productId, sizeId, toppings, quantity }) => {
    if (!Array.isArray(toppings)) {
      throw new ConflictException(
        'Idempotency key is already used for a different order',
      );
    }
    const toppingIds = toppings.map((topping) => {
      if (
        !topping ||
        typeof topping !== 'object' ||
        Array.isArray(topping) ||
        typeof topping.id !== 'string'
      ) {
        throw new ConflictException(
          'Idempotency key is already used for a different order',
        );
      }
      return topping.id;
    });
    return { productId, sizeId, toppingIds, quantity };
  });

  const expected = itemKeys(requested);
  const actual = itemKeys(existing);
  if (
    expected.length !== actual.length ||
    expected.some((key, index) => key !== actual[index])
  ) {
    throw new ConflictException(
      'Idempotency key is already used for a different order',
    );
  }
}
