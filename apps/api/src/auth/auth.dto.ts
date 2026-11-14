import { BadRequestException } from '@nestjs/common';

export interface Credentials {
  email: string;
  password: string;
  name?: string;
}

function parse(body: unknown, registration: boolean): Credentials {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new BadRequestException('Email và mật khẩu không hợp lệ.');
  }
  const input = body as Record<string, unknown>;
  if (Object.keys(input).some(key => !(registration ? ['email', 'password', 'name'] : ['email', 'password']).includes(key))) {
    throw new BadRequestException('Request chứa trường không được phép.');
  }
  if (typeof input.email !== 'string' || typeof input.password !== 'string') {
    throw new BadRequestException('Email và mật khẩu phải là chuỗi.');
  }
  const email = input.email.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new BadRequestException('Email không hợp lệ.');
  }
  // Do not trim passwords. This policy is proposed for the shared SRS/TV6 forms.
  if (input.password.length < (registration ? 12 : 1) || input.password.length > 128) {
    throw new BadRequestException(registration
      ? 'Mật khẩu phải dài từ 12 đến 128 ký tự.'
      : 'Mật khẩu không hợp lệ.');
  }
  let name: string | undefined;
  if (registration && input.name !== undefined) {
    if (typeof input.name !== 'string' || input.name.trim().length > 120) {
      throw new BadRequestException('Tên phải là chuỗi tối đa 120 ký tự.');
    }
    name = input.name.trim() || undefined;
  }
  return { email, password: input.password, ...(name ? { name } : {}) };
}

export class RegisterDto {
  static parse(body: unknown): Credentials { return parse(body, true); }
}

export class LoginDto {
  static parse(body: unknown): Credentials { return parse(body, false); }
}
