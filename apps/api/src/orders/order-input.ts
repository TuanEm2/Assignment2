import { BadRequestException } from '@nestjs/common';

export interface OrderItemInput {
  productId: string;
  sizeId: string | null;
  toppingIds: string[];
  quantity: number;
}

const uuidPattern = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const maxQuantityPerLine = 99;

function asObject(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new BadRequestException(`${field} must be an object`);
  }
  return value as Record<string, unknown>;
}

export function parseOrderUuid(value: unknown, field: string): string {
  if (typeof value !== 'string' || !uuidPattern.test(value)) {
    throw new BadRequestException(`${field} must be a UUID`);
  }
  return value.toLowerCase();
}

export function parseOrderItems(input: unknown): OrderItemInput[] {
  const { items } = asObject(input, 'Order');
  if (!Array.isArray(items) || items.length === 0) {
    throw new BadRequestException('Order must contain at least one item');
  }

  return items.map((value: unknown, index: number) => {
    const field = `items[${index}]`;
    const { productId, sizeId, toppingIds, quantity } = asObject(value, field);
    if (
      typeof quantity !== 'number' ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > maxQuantityPerLine
    ) {
      throw new BadRequestException(
        `${field}.quantity must be an integer from 1 to ${maxQuantityPerLine}`,
      );
    }
    if (!Array.isArray(toppingIds)) {
      throw new BadRequestException(`${field}.toppingIds must be an array`);
    }
    const parsedToppingIds = toppingIds.map(
      (id: unknown, toppingIndex: number) =>
        parseOrderUuid(id, `${field}.toppingIds[${toppingIndex}]`),
    );
    if (new Set(parsedToppingIds).size !== parsedToppingIds.length) {
      throw new BadRequestException(`${field}.toppingIds contains duplicates`);
    }

    return {
      productId: parseOrderUuid(productId, `${field}.productId`),
      sizeId:
        sizeId === null ? null : parseOrderUuid(sizeId, `${field}.sizeId`),
      toppingIds: parsedToppingIds,
      quantity,
    };
  });
}
