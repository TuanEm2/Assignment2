import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  type INestApplication,
} from '@nestjs/common';

import { Test } from '@nestjs/testing';

import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';

import type {
  NextFunction,
  Request,
  Response,
} from 'express';

import request from 'supertest';
import type { App } from 'supertest/types';

import { configureHttp } from '../http/app-http.config';

import {
  ORDER_STOCK_RESERVATION,
  type OrderStockReservation,
} from './order-stock.port';

import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

const userId = '07442aa4-135f-4e17-b3f2-d935984b5633';
const productId = 'd173c985-d38e-40b6-9108-0a189615b403';
const sizeId = 'be72cb31-ea09-40ea-b37a-039b4f8081f5';
const orderId = '32bfcc03-659a-4aa3-9300-861664b5fc7e';

const line = {
  productId,
  sizeId,
  toppingIds: [],
  quantity: 1,
};

const payload = {
  items: [line],
};

const saved = {
  id: orderId,
  userId,
  status: 'PENDING' as const,
  total: 45000,
  createdAt: new Date('2026-11-12T00:00:00.000Z'),
  updatedAt: new Date('2026-11-12T00:00:00.000Z'),
  items: [
    {
      id: '42af221d-e198-4b7c-bcab-01debd661f65',
      productId,
      productName: 'Americano',
      sizeId,
      sizeName: 'M' as const,
      toppings: [],
      quantity: 1,
      unitPrice: 45000,
      lineTotal: 45000,
    },
  ],
};

describe('OrdersController — HTTP, dependencies mocked', () => {
  const createOrder = jest.fn<OrdersService['createOrder']>();
  const reserveStock = jest.fn<OrderStockReservation>();

  let principal: unknown;
  let app: INestApplication<App>;
  let withoutStock: INestApplication<App>;

  async function createApp(
    withStock: boolean,
  ): Promise<INestApplication<App>> {
    const module = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: { createOrder },
        },
        ...(withStock
          ? [
              {
                provide: ORDER_STOCK_RESERVATION,
                useValue: reserveStock,
              },
            ]
          : []),
      ],
    }).compile();

    const instance: INestApplication<App> =
      module.createNestApplication();

    configureHttp(instance);

    // Chỉ dùng trong test: giả lập người dùng do Auth xác thực.
    // Không lấy principal từ body/header của request.
    instance.use(
      (
        req: Request & { user?: unknown },
        _res: Response,
        next: NextFunction,
      ) => {
        req.user = principal;
        next();
      },
    );

    await instance.init();

    return instance;
  }

  beforeAll(async () => {
    app = await createApp(true);
    withoutStock = await createApp(false);
  });

  beforeEach(() => {
    principal = { id: userId };

    createOrder.mockReset().mockResolvedValue(saved);
    reserveStock.mockReset().mockResolvedValue(undefined);
  });

  afterAll(async () => {
    await app?.close();
    await withoutStock?.close();
  });

  it('phục vụ POST ở /api/orders, không ở /orders', async () => {
    await request(app.getHttpServer())
      .post('/orders')
      .send(payload)
      .expect(404);

    expect(createOrder).not.toHaveBeenCalled();
  });

  it.each([
    ['thiếu principal', undefined],
    ['principal null', null],
    ['thiếu id', { sub: userId }],
    ['id sai định dạng', { id: 'not-a-uuid' }],
  ])('trả 401 khi %s', async (_label, value) => {
    principal = value;

    await request(app.getHttpServer())
      .post('/api/orders')
      .send(payload)
      .expect(401);

    expect(createOrder).not.toHaveBeenCalled();
  });

  it('không lấy danh tính từ userId trong body hoặc header', async () => {
    principal = undefined;

    await request(app.getHttpServer())
      .post('/api/orders')
      .set('X-User-Id', userId)
      .send({ ...payload, userId })
      .expect(401);

    expect(createOrder).not.toHaveBeenCalled();
  });

  it.each([
    ['đơn trống', { items: [] }],
    [
      'số lượng bằng 0',
      { items: [{ ...line, quantity: 0 }] },
    ],
    [
      'productId sai',
      { items: [{ ...line, productId: 'americano' }] },
    ],
    ['client gửi tổng tiền', { ...payload, total: 1 }],
    ['client gửi chủ đơn', { ...payload, userId }],
    [
      'client gửi đơn giá',
      { items: [{ ...line, unitPrice: 1 }] },
    ],
  ])('trả 400 khi %s', async (_label, input) => {
    await request(app.getHttpServer())
      .post('/api/orders')
      .send(input)
      .expect(400);

    expect(createOrder).not.toHaveBeenCalled();
  });

  it('trả 400 khi Idempotency-Key chứa khoảng trắng', async () => {
    await request(app.getHttpServer())
      .post('/api/orders')
      .set('Idempotency-Key', 'invalid key')
      .send(payload)
      .expect(400);

    expect(createOrder).not.toHaveBeenCalled();
  });

  it('trả 503 khi chưa cấu hình giữ kho, không gọi tạo đơn', async () => {
    const response = await request(
      withoutStock.getHttpServer(),
    )
      .post('/api/orders')
      .send(payload)
      .expect(503);

    expect(response.body.code).toBe(
      'ORDER_STOCK_NOT_READY',
    );

    expect(createOrder).not.toHaveBeenCalled();
  });

  it('trả 201 và chuyển payload cùng callback giữ kho cho service', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/orders')
      .send(payload)
      .expect(201);

    expect(response.body).toMatchObject({
      id: orderId,
      userId,
      status: 'PENDING',
      total: 45000,
    });

    expect(createOrder).toHaveBeenCalledWith(
      userId,
      payload,
      {
        idempotencyKey: undefined,
        reserveStock,
      },
    );
  });

  it('chuyển Idempotency-Key hợp lệ nguyên vẹn cho service', async () => {
    await request(app.getHttpServer())
      .post('/api/orders')
      .set('Idempotency-Key', 'checkout-001')
      .send(payload)
      .expect(201);

    expect(createOrder).toHaveBeenCalledWith(
      userId,
      payload,
      {
        idempotencyKey: 'checkout-001',
        reserveStock,
      },
    );
  });

  it.each([
    [400, new BadRequestException('Invalid size')],
    [404, new NotFoundException('Product not found')],
    [409, new ConflictException('Idempotency key conflict')],
  ] as const)(
    'giữ nguyên lỗi HTTP %s từ service',
    async (status, error) => {
      createOrder.mockRejectedValueOnce(error);

      await request(app.getHttpServer())
        .post('/api/orders')
        .send(payload)
        .expect(status);

      expect(createOrder).toHaveBeenCalledTimes(1);
    },
  );
});