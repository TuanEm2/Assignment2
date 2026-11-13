import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersPersistenceModule } from '../auth/users-persistence.module';
import { InventoryModule } from '../inventory/inventory.module';
import { PrismaModule } from '../prisma/prisma.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [
    PrismaModule,
    AuthModule.withUsers(UsersPersistenceModule),
    InventoryModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}