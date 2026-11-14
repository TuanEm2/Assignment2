import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersPersistenceModule } from '../auth/users-persistence.module';
import { PrismaModule } from '../prisma/prisma.module';
import { OrderHistoryController } from './order-history.controller';
import { OrderHistoryService } from './order-history.service';

@Module({
  imports: [PrismaModule, AuthModule.withUsers(UsersPersistenceModule)],
  controllers: [OrderHistoryController],
  providers: [OrderHistoryService],
})
export class OrderHistoryModule {}
