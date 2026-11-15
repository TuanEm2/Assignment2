import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersPersistenceModule } from '../auth/users-persistence.module';
import { InventoryModule } from '../inventory/inventory.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PayosController } from './payos.controller';
import { PayosService } from './payos.service';

@Module({
  imports: [PrismaModule, InventoryModule, AuthModule.withUsers(UsersPersistenceModule)],
  controllers: [PayosController],
  providers: [PayosService],
})
export class PayosModule {}
