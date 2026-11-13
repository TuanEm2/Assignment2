import { Module, type DynamicModule, type Type } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AccessTokens, jwtSecret, TOKEN_AUDIENCE, TOKEN_ISSUER, TOKEN_TTL_SECONDS } from './access-tokens';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PasswordHasher } from './password-hasher';

@Module({})
export class AuthModule {
  /** usersModule must export AuthUsers backed by the actual persistence adapter. */
  static withUsers(usersModule: Type<unknown>): DynamicModule {
    return {
      module: AuthModule,
      imports: [usersModule, JwtModule.registerAsync({
        useFactory: () => ({
          secret: jwtSecret(),
          signOptions: { algorithm: 'HS256' as const, expiresIn: TOKEN_TTL_SECONDS, issuer: TOKEN_ISSUER, audience: TOKEN_AUDIENCE },
          verifyOptions: { algorithms: ['HS256' as const], issuer: TOKEN_ISSUER, audience: TOKEN_AUDIENCE },
        }),
      })],
      controllers: [AuthController],
      providers: [AuthService, PasswordHasher, AccessTokens, JwtAuthGuard],
      exports: [usersModule, AccessTokens, JwtAuthGuard],
    };
  }
}
