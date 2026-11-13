import { createParamDecorator, UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from './jwt-auth.guard';

export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext) => {
  const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;
  if (!user) throw new UnauthorizedException('Cần đăng nhập.');
  return user;
});
