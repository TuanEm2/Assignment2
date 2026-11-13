import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import type { PublicUser } from '../auth/auth-users';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrderHistoryService } from './order-history.service';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrderHistoryController {
  constructor(private readonly history: OrderHistoryService) {}

  @Get('me')
  async mine(
    @CurrentUser() user: PublicUser,
    @Query() query: Record<string, unknown>,
    @Res({ passthrough: true }) response: Response,
  ) {
    const page = await this.history.mine(user.id, query);
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('Access-Control-Expose-Headers', 'X-Next-Cursor');
    response.setHeader('X-Next-Cursor', page.nextCursor ?? '');
    // Keep the array response consumed by TV6's existing OrdersView.
    return page.items;
  }

  @Get(':id/status')
  status(@CurrentUser() user: PublicUser, @Param('id') id: string, @Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'private, no-store');
    return this.history.status(user.id, id);
  }

  @Get(':id')
  detail(@CurrentUser() user: PublicUser, @Param('id') id: string, @Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'private, no-store');
    return this.history.detail(user.id, id);
  }
}
