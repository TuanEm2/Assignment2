import { ConflictException } from '@nestjs/common';
import type { OrderStatus } from '@prisma/client';

const transitions: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ['PAID', 'PAYMENT_FAILED', 'CANCELLED'],
  // A new failed attempt can be recorded while the order remains unpaid.
  PAYMENT_FAILED: ['PAYMENT_FAILED', 'PAID', 'CANCELLED'],
  PAID: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY'],
  READY: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

export function assertOrderStatusTransition(
  current: OrderStatus,
  next: OrderStatus,
): void {
  if (!transitions[current].includes(next)) {
    throw new ConflictException(
      `Cannot change order status from ${current} to ${next}`,
    );
  }
}
