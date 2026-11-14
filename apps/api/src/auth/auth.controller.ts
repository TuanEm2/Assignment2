import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import type { PublicUser } from './auth-users';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() body: unknown) { return this.auth.register(body); }

  @Post('login')
  @HttpCode(200)
  login(@Body() body: unknown) { return this.auth.login(body); }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: PublicUser) { return { user }; }
}
