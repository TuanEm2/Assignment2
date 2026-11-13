import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export const TOKEN_ISSUER = 'brewlite-assignment2';
export const TOKEN_AUDIENCE = 'brewlite-web';
export const TOKEN_TTL_SECONDS = 3600;

export function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret?.trim() || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('JWT_SECRET phải có ít nhất 32 byte trước khi bật AuthModule.');
  }
  return secret;
}

@Injectable()
export class AccessTokens {
  constructor(private readonly jwt: JwtService) {}

  issue(userId: string): Promise<string> {
    return this.jwt.signAsync({}, { subject: userId });
  }

  async subject(token: string): Promise<string> {
    try {
      const claims = await this.jwt.verifyAsync<Record<string, unknown>>(token, {
        algorithms: ['HS256'], issuer: TOKEN_ISSUER, audience: TOKEN_AUDIENCE,
      });
      if (typeof claims.sub !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(claims.sub) ||
          typeof claims.exp !== 'number' || !Number.isFinite(claims.exp) ||
          typeof claims.iat !== 'number' || !Number.isFinite(claims.iat) ||
          claims.iat > Date.now() / 1000 + 5 || claims.exp <= claims.iat) {
        throw new Error('Invalid claims');
      }
      return claims.sub;
    } catch {
      throw new UnauthorizedException('Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
    }
  }
}
