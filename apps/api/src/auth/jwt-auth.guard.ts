import { Injectable, UnauthorizedException, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { AccessTokens } from './access-tokens';
import { AuthUsers, publicUser, type PublicUser } from './auth-users';

export type AuthenticatedRequest = Request & { user?: PublicUser };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly tokens: AccessTokens, private readonly users: AuthUsers) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const match = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/i.exec(request.headers.authorization ?? '');
    if (!match) throw new UnauthorizedException('Cần đăng nhập bằng Bearer token.');
    const id = await this.tokens.subject(match[1]);
    const user = await this.users.findById(id);
    if (!user) throw new UnauthorizedException('Phiên đăng nhập không còn hợp lệ.');
    request.user = publicUser(user);
    return true;
  }
}
