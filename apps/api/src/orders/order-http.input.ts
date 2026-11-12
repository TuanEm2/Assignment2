import { BadRequestException } from '@nestjs/common';
import {
  type OrderItemInput,
  parseOrderItems,
} from './order-input';

export interface CreateOrderBody {
  items: OrderItemInput[];
}

function rejectUnknownFields(
  value: Record<string, unknown>,
  allowed: readonly string[],
  field: string,
): void {
  const unknownFields = Object.keys(value).filter(
    (key) => !allowed.includes(key),
  );

  if (unknownFields.length > 0) {
    throw new BadRequestException(
      `${field} contains unsupported fields: ${unknownFields.join(', ')}`,
    );
  }
}

export function parseCreateOrderBody(
  input: unknown,
): CreateOrderBody {
  const items = parseOrderItems(input);

  // Validation của TV3 đã xác nhận body và từng dòng hợp lệ.
  const body = input as Record<string, unknown>;

  rejectUnknownFields(body, ['items'], 'Order');

  const rows = body.items as Record<string, unknown>[];

  rows.forEach((row, index) => {
    rejectUnknownFields(
      row,
      ['productId', 'sizeId', 'toppingIds', 'quantity'],
      `items[${index}]`,
    );
  });

  return { items };
}