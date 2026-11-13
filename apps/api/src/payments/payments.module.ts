import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersPersistenceModule } from '../auth/users-persistence.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [PrismaModule, AuthModule.withUsers(UsersPersistenceModule)],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
