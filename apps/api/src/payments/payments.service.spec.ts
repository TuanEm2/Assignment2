import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrderStatus, PaymentMethod, PaymentOutcome } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { parseMockPaymentDto } from './mock-payment.dto';
import { PaymentsService } from './payments.service';

const USER = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const ORDER = '33333333-3333-4333-8333-333333333333';
const KEY1 = 'pay-idem-111111111111';
const KEY2 = 'pay-idem-222222222222';
const TXN = '44444444-4444-4444-8444-444444444444';

const dto = (key = KEY1, outcome: PaymentOutcome = PaymentOutcome.SUCCESS, method: PaymentMethod = PaymentMethod.MOCK_WALLET) =>
  ({ orderId: ORDER, idempotencyKey: key, outcome, method });

describe('PaymentsService — Assignment 2 Mock + Idempotency', () => {
  let service: PaymentsService;
  let order: { id: string; userId: string; total: number; status: OrderStatus };
  let attempts: Array<{ orderId: string; idempotencyKey: string; outcome: PaymentOutcome; method: PaymentMethod; amount: number }>;
  let payments: Array<{ id: string; orderId: string; amount: number; method: PaymentMethod }>;
  let tx: {
    $queryRaw: jest.Mock;
    order: { findUniqueOrThrow: jest.Mock; update: jest.Mock };
    payment: { findUnique: jest.Mock; create: jest.Mock };
    paymentAttempt: { findUnique: jest.Mock; create: jest.Mock };
  };
  const prior = process.env.PAYMENT_MODE;

  beforeEach(() => {
    process.env.PAYMENT_MODE = 'mock';
    order = { id: ORDER, userId: USER, total: 65000, status: OrderStatus.PENDING };
    attempts = [];
    payments = [];
    tx = {
      $queryRaw: jest.fn(async (_sql: unknown, id: string, owner: string) =>
        id === order.id && owner === order.userId ? [{ id }] : []),
      order: {
        findUniqueOrThrow: jest.fn(async () => ({ ...order })),
        update: jest.fn(async ({ data }: { data: { status: OrderStatus } }) => {
          order.status = data.status;
          return { ...order };
        }),
      },
      payment: {
        findUnique: jest.fn(async () => payments.find((p) => p.orderId === order.id) ?? null),
        create: jest.fn(async ({ data }: { data: Omit<(typeof payments)[number], 'id'> }) => {
          const saved = { ...data, id: TXN };
          payments.push(saved);
          return saved;
        }),
      },
      paymentAttempt: {
        findUnique: jest.fn(async ({ where }: { where: { orderId_idempotencyKey: { orderId: string; idempotencyKey: string } } }) =>
          attempts.find((p) => p.orderId === where.orderId_idempotencyKey.orderId
            && p.idempotencyKey === where.orderId_idempotencyKey.idempotencyKey) ?? null),
        create: jest.fn(async ({ data }: { data: (typeof attempts)[number] }) => {
          attempts.push({ ...data });
          return data;
        }),
      },
    };

    const prisma = {
      $transaction: jest.fn(async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
      order: {
        findFirst: jest.fn(async ({ where }: { where: { id: string; userId: string } }) =>
          where.id === order.id && where.userId === order.userId
            ? { id: order.id, status: order.status, total: order.total, payment: payments[0] ?? null }
            : null),
      },
    } as unknown as PrismaService;
    service = new PaymentsService(prisma);
  });

  afterAll(() => {
    if (prior === undefined) delete process.env.PAYMENT_MODE;
    else process.env.PAYMENT_MODE = prior;
  });

  it('SUCCESS uses database amount; creates one Payment and Attempt', async () => {
    const result = await service.mockPayment(USER, dto());
    expect(result).toMatchObject({
      orderId: ORDER, status: 'PAID', amount: 65000,
      success: true, replayed: false, transactionId: TXN,
    });
    expect(payments).toHaveLength(1);
    expect(attempts).toHaveLength(1);
    expect(order.status).toBe(OrderStatus.PAID);
  });

  it('FAILURE records attempt but not Payment', async () => {
    const result = await service.mockPayment(USER, dto(KEY1, PaymentOutcome.FAILURE));
    expect(result).toMatchObject({ status: 'PAYMENT_FAILED', replayed: false, success: false });
    expect(payments).toHaveLength(0);
    expect(attempts).toHaveLength(1);
    expect(order.status).toBe(OrderStatus.PAYMENT_FAILED);
  });

  it('replays SUCCESS without side effects', async () => {
    const first = await service.mockPayment(USER, dto());
    const replay = await service.mockPayment(USER, dto());
    expect(replay).toEqual({ ...first, replayed: true });
    expect(payments).toHaveLength(1);
    expect(attempts).toHaveLength(1);
    expect(tx.payment.create).toHaveBeenCalledTimes(1);
  });

  it('replays FAILURE then succeeds with a new key', async () => {
    await service.mockPayment(USER, dto(KEY1, PaymentOutcome.FAILURE));
    const replay = await service.mockPayment(USER, dto(KEY1, PaymentOutcome.FAILURE));
    expect(replay).toMatchObject({ status: 'PAYMENT_FAILED', replayed: true, success: false });
    const next = await service.mockPayment(USER, dto(KEY2));
    expect(next).toMatchObject({ status: 'PAID', replayed: false, success: true });
    expect(payments).toHaveLength(1);
    expect(attempts).toHaveLength(2);
  });

  it('rejects same key with different outcome or method', async () => {
    await service.mockPayment(USER, dto(KEY1, PaymentOutcome.FAILURE));
    await expect(service.mockPayment(USER, dto(KEY1, PaymentOutcome.SUCCESS))).rejects.toBeInstanceOf(ConflictException);
    await expect(service.mockPayment(USER, dto(KEY1, PaymentOutcome.FAILURE, PaymentMethod.MOCK_CARD)))
      .rejects.toBeInstanceOf(ConflictException);
    expect(attempts).toHaveLength(1);
  });

  it('rejects a second successful payment with a different key', async () => {
    await service.mockPayment(USER, dto());
    await expect(service.mockPayment(USER, dto(KEY2))).rejects.toBeInstanceOf(ConflictException);
    expect(payments).toHaveLength(1);
  });

  it('rejects wrong owner and cancelled orders', async () => {
    await expect(service.mockPayment(OTHER, dto())).rejects.toBeInstanceOf(NotFoundException);
    order.status = OrderStatus.CANCELLED;
    await expect(service.mockPayment(USER, dto())).rejects.toBeInstanceOf(ConflictException);
    expect(payments).toHaveLength(0);
  });

  it('mock mode must be explicitly enabled', async () => {
    process.env.PAYMENT_MODE = 'payos';
    await expect(service.mockPayment(USER, dto())).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('status is owner-scoped and reports recorded payment', async () => {
    expect(await service.status(USER, ORDER)).toMatchObject({ status: 'PENDING', success: false });
    await service.mockPayment(USER, dto());
    expect(await service.status(USER, ORDER)).toMatchObject({ status: 'PAID', success: true, transactionId: TXN });
    await expect(service.status(OTHER, ORDER)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('validates DTO values and rejects client-controlled amount', () => {
    expect(parseMockPaymentDto(dto())).toMatchObject(dto());
    expect(() => parseMockPaymentDto({ ...dto(), amount: 1 })).toThrow(BadRequestException);
    expect(() => parseMockPaymentDto({ ...dto(), method: 'PAYOS' })).toThrow(BadRequestException);
    expect(() => parseMockPaymentDto({ ...dto(), idempotencyKey: 'x' })).toThrow(BadRequestException);
  });
});
