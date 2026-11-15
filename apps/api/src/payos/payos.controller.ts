import { BadRequestException, Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { PublicUser } from '../auth/auth-users';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { parseOrderUuid } from '../orders/order-input';
import { PayosService } from './payos.service';

@Controller('payments/payos')
export class PayosController {
  constructor(private readonly payos: PayosService) {}

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  checkout(@CurrentUser() user: PublicUser, @Body() raw: unknown) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new BadRequestException('Body must contain orderId');
    }
    const body = raw as Record<string, unknown>;
    if (Object.keys(body).length !== 1 || !('orderId' in body)) {
      throw new BadRequestException('Only orderId is allowed. Price is computed by backend.');
    }
    return this.payos.checkout(user.id, parseOrderUuid(body.orderId, 'orderId'));
  }

  @Post('cancel/:orderId')
  @UseGuards(JwtAuthGuard)
  cancel(@CurrentUser() user: PublicUser, @Param('orderId') orderId: string) {
    return this.payos.cancel(user.id, parseOrderUuid(orderId, 'orderId'));
  }

  @Get('status/:orderId')
  @UseGuards(JwtAuthGuard)
  status(@CurrentUser() user: PublicUser, @Param('orderId') orderId: string) {
    return this.payos.status(user.id, parseOrderUuid(orderId, 'orderId'));
  }

  // A PUBLIC route: authenticity is enforced by HMAC SHA-256, not JWT.
  @Post('webhook')
  webhook(@Body() raw: unknown) {
    return this.payos.webhook(raw);
  }
}
