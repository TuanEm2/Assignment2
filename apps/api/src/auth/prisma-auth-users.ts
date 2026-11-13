import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUsers, EmailAlreadyExists, type StoredAuthUser } from './auth-users';

const userFields = { id: true, email: true, passwordHash: true, name: true } as const;

@Injectable()
export class PrismaAuthUsers extends AuthUsers {
  constructor(private readonly prisma: PrismaService) { super(); }

  findByEmail(email: string): Promise<StoredAuthUser | null> {
    return this.prisma.user.findUnique({ where: { email }, select: userFields });
  }

  findById(id: string): Promise<StoredAuthUser | null> {
    return this.prisma.user.findUnique({ where: { id }, select: userFields });
  }

  async create(input: { email: string; passwordHash: string; name?: string }): Promise<StoredAuthUser> {
    try {
      return await this.prisma.user.create({ data: input, select: userFields });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const target: unknown = error.meta?.target;
        if ((Array.isArray(target) && target.length === 1 && target[0] === 'email') || target === 'User_email_key') {
          throw new EmailAlreadyExists();
        }
      }
      throw error;
    }
  }
}
