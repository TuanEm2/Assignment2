import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { AccessTokens, TOKEN_TTL_SECONDS } from './access-tokens';
import { AuthUsers, EmailAlreadyExists, publicUser } from './auth-users';
import { LoginDto, RegisterDto } from './auth.dto';
import { PasswordHasher } from './password-hasher';

@Injectable()
export class AuthService {
  private readonly dummyHash: Promise<string>;

  constructor(
    private readonly users: AuthUsers,
    private readonly passwords: PasswordHasher,
    private readonly tokens: AccessTokens,
  ) {
    this.dummyHash = passwords.hash(randomBytes(32).toString('hex'));
  }

  async register(body: unknown) {
    const { email, password, name } = RegisterDto.parse(body);
    const passwordHash = await this.passwords.hash(password);
    try {
      const user = await this.users.create({ email, passwordHash, ...(name ? { name } : {}) });
      return { user: publicUser(user) };
    } catch (error: unknown) {
      if (error instanceof EmailAlreadyExists) {
        throw new ConflictException('Email đã được đăng ký.');
      }
      throw error;
    }
  }

  async login(body: unknown) {
    const { email, password } = LoginDto.parse(body);
    const user = await this.users.findByEmail(email);
    const hash = user?.passwordHash ?? await this.dummyHash;
    const matches = await this.passwords.verify(password, hash);
    if (!user || !matches) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng.');
    }
    return {
      accessToken: await this.tokens.issue(user.id),
      tokenType: 'Bearer' as const,
      expiresIn: TOKEN_TTL_SECONDS,
      user: publicUser(user),
    };
  }
}
