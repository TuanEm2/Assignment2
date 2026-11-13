import { BadRequestException } from '@nestjs/common';
import { PaymentMethod, PaymentOutcome } from '@prisma/client';
import { parseOrderUuid } from '../orders/order-input';

export interface MockPaymentDto {
  orderId: string;
  method: PaymentMethod;
  outcome: PaymentOutcome;
  idempotencyKey: string;
}

/**
 * Validate at the HTTP boundary. Payment is a MOCK ONLY endpoint.
 * No amount or userId accepted from the browser.
 */
export function parseMockPaymentDto(raw: unknown): MockPaymentDto {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new BadRequestException('Payment body must be an object');
  }
  const body = raw as Record<string, unknown>;
  const allowed = ['orderId', 'method', 'outcome', 'idempotencyKey'];
  if (Object.keys(body).some((key) => !allowed.includes(key))) {
    throw new BadRequestException('Unknown payment fields');
  }
  const orderId = parseOrderUuid(body.orderId, 'orderId');
  if (body.method !== PaymentMethod.MOCK_WALLET && body.method !== PaymentMethod.MOCK_CARD) {
    throw new BadRequestException('Unsupported mock payment method');
  }
  if (body.outcome !== PaymentOutcome.SUCCESS && body.outcome !== PaymentOutcome.FAILURE) {
    throw new BadRequestException('Mock outcome must be SUCCESS or FAILURE');
  }
  const key = body.idempotencyKey;
  if (typeof key !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9:_-]{7,127}$/.test(key)) {
    throw new BadRequestException('Invalid idempotencyKey (8-128 allowed characters)');
  }
  return { orderId, method: body.method, outcome: body.outcome, idempotencyKey: key };
}
