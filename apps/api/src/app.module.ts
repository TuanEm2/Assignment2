import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersPersistenceModule } from './auth/users-persistence.module';
import { OrdersModule } from './orders/orders.module';
import { ProductsModule } from './products/products.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [ProductsModule, AuthModule.withUsers(UsersPersistenceModule), OrdersModule, PaymentsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
