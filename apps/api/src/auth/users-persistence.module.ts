import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthUsers } from './auth-users';
import { PrismaAuthUsers } from './prisma-auth-users';

@Module({
  imports: [PrismaModule],
  providers: [PrismaAuthUsers, { provide: AuthUsers, useExisting: PrismaAuthUsers }],
  exports: [AuthUsers],
})
export class UsersPersistenceModule {}
