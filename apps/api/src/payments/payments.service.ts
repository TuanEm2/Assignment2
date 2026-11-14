import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, PaymentMethod, PaymentOutcome, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { parseOrderUuid } from '../orders/order-input';
import { assertOrderStatusTransition } from '../orders/order-status';
import type { MockPaymentDto } from './mock-payment.dto';

export interface MockPaymentResponse {
  orderId: string;
  status: OrderStatus;
  outcome: PaymentOutcome;
  method: PaymentMethod;
  amount: number;
  idempotencyKey: string;
  replayed: boolean;
  success: boolean;
  transactionId?: string;
  message: string;
}

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  private assertMockMode(): void {
    if (process.env.PAYMENT_MODE !== 'mock') {
      throw new ForbiddenException('Mock payment is disabled');
    }
  }

  async mockPayment(userId: string, dto: MockPaymentDto): Promise<MockPaymentResponse> {
    this.assertMockMode();
    const ownerId = parseOrderUuid(userId, 'Authenticated user id');

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Serialize all mock attempts for the same owned order, across instances.
        const locked = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT "id" FROM "Order"
          WHERE "id" = ${dto.orderId}::uuid AND "userId" = ${ownerId}::uuid
          FOR UPDATE
        `;
        if (!locked.length) throw new NotFoundException('Order not found');

        const order = await tx.order.findUniqueOrThrow({
          where: { id: dto.orderId },
          select: { id: true, status: true, total: true },
        });

        const previous = await tx.paymentAttempt.findUnique({
          where: {
            orderId_idempotencyKey: { orderId: order.id, idempotencyKey: dto.idempotencyKey },
          },
        });
        if (previous) {
          if (previous.method !== dto.method || previous.outcome !== dto.outcome) {
            throw new ConflictException('Idempotency key was used with another payment payload');
          }
          // A repeated successful attempt must point to the one payment already recorded.
          const savedPayment = previous.outcome === PaymentOutcome.SUCCESS
            ? await tx.payment.findUnique({ where: { orderId: order.id } })
            : null;
          if (previous.outcome === PaymentOutcome.SUCCESS && !savedPayment) {
            throw new ConflictException('Payment records are inconsistent');
          }
          return response(
            order.id, previous.outcome, previous.method, previous.amount,
            previous.idempotencyKey, true, savedPayment?.id,
          );
        }

        // An order may have progressed past PAID; the unique Payment is authoritative.
        const existingPayment = await tx.payment.findUnique({ where: { orderId: order.id } });
        if (existingPayment || order.status === OrderStatus.PAID) {
          throw new ConflictException('Order was already paid');
        }

        const target = dto.outcome === PaymentOutcome.SUCCESS
          ? OrderStatus.PAID
          : OrderStatus.PAYMENT_FAILED;
        assertOrderStatusTransition(order.status, target);

        let transactionId: string | undefined;
        if (dto.outcome === PaymentOutcome.SUCCESS) {
          const payment = await tx.payment.create({
            data: {
              orderId: order.id,
              method: dto.method,
              amount: order.total,
            },
          });
          transactionId = payment.id;
        }

        await tx.order.update({
          where: { id: order.id },
          data: { status: target },
        });

        await tx.paymentAttempt.create({
          data: {
            orderId: order.id,
            idempotencyKey: dto.idempotencyKey,
            method: dto.method,
            outcome: dto.outcome,
            amount: order.total,
          },
        });

        return response(
          order.id, dto.outcome, dto.method, order.total,
          dto.idempotencyKey, false, transactionId,
        );
      }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2002' || error.code === 'P2034')
      ) {
        throw new ConflictException('Concurrent payment conflict; retry the same idempotency key');
      }
      throw error;
    }
  }

  async status(userId: string, orderId: string) {
    this.assertMockMode();
    const ownerId = parseOrderUuid(userId, 'Authenticated user id');
    const id = parseOrderUuid(orderId, 'orderId');
    const order = await this.prisma.order.findFirst({
      where: { id, userId: ownerId },
      select: {
        id: true,
        status: true,
        total: true,
        payment: { select: { id: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return {
      orderId: order.id,
      status: order.status,
      amount: order.total,
      success: Boolean(order.payment),
      transactionId: order.payment?.id ?? null,
    };
  }
}

function response(
  orderId: string,
  outcome: PaymentOutcome,
  method: PaymentMethod,
  amount: number,
  idempotencyKey: string,
  replayed: boolean,
  transactionId?: string,
): MockPaymentResponse {
  return {
    orderId,
    status: outcome === PaymentOutcome.SUCCESS ? OrderStatus.PAID : OrderStatus.PAYMENT_FAILED,
    outcome,
    method,
    amount,
    idempotencyKey,
    replayed,
    success: outcome === PaymentOutcome.SUCCESS,
    ...(transactionId ? { transactionId } : {}),
    message: outcome === PaymentOutcome.SUCCESS
      ? 'Mock payment completed; no real money collected'
      : 'Mock payment failed; start a new attempt with a new key',
  };
}
