import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Optional,
  Post,
  Req,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';

import type { Request } from 'express';

import { parseCreateOrderBody } from './order-http.input';
import { validateOrderKey } from './order-idempotency';
import { parseOrderUuid } from './order-input';

import {
  ORDER_STOCK_RESERVATION,
  type OrderStockReservation,
} from './order-stock.port';

import { OrdersService } from './orders.service';

type OrderRequest = Request & {
  user?: unknown;
};

export type CreateOrderResponse = Awaited<
  ReturnType<OrdersService['createOrder']>
>;

/**
 * Auth backend của TV5 cần xác thực JWT trước
 * và gắn thông tin người dùng lên request.user.
 */
function authenticatedUserId(request: OrderRequest): string {
  const user = request.user;

  if (
    !user ||
    typeof user !== 'object' ||
    !('id' in user)
  ) {
    throw new UnauthorizedException(
      'Authentication required',
    );
  }

  try {
    return parseOrderUuid(
      user.id,
      'Authenticated user id',
    );
  } catch {
    throw new UnauthorizedException(
      'Invalid authenticated user',
    );
  }
}

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly orders: OrdersService,

    @Optional()
    @Inject(ORDER_STOCK_RESERVATION)
    private readonly reserveStock?: OrderStockReservation,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Req() request: OrderRequest,
    @Body() input: unknown,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<CreateOrderResponse> {
    const userId = authenticatedUserId(request);
    const body = parseCreateOrderBody(input);
    const key = validateOrderKey(idempotencyKey);

    if (typeof this.reserveStock !== 'function') {
      throw new ServiceUnavailableException({
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        code: 'ORDER_STOCK_NOT_READY',
        message: 'Order stock reservation is not configured',
      });
    }

    return this.orders.createOrder(userId, body, {
      idempotencyKey: key,
      reserveStock: this.reserveStock,
    });
  }
}