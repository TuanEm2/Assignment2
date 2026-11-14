import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { PublicUser } from '../auth/auth-users';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { parseMockPaymentDto } from './mock-payment.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('mock')
  @HttpCode(HttpStatus.OK)
  mock(@CurrentUser() user: PublicUser, @Body() body: unknown) {
    return this.payments.mockPayment(user.id, parseMockPaymentDto(body));
  }

  @Get('mock/status/:orderId')
  status(@CurrentUser() user: PublicUser, @Param('orderId') orderId: string) {
    return this.payments.status(user.id, orderId);
  }
}
