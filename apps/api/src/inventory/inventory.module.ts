import { Module } from '@nestjs/common';
import {
  ORDER_STOCK_RESERVATION,
  type OrderStockReservation,
} from '../orders/order-stock.port';
import { InventoryService } from './inventory.service';

@Module({
  providers: [
    InventoryService,
    {
      provide: ORDER_STOCK_RESERVATION,
      useFactory: (
        inventory: InventoryService,
      ): OrderStockReservation =>
        (tx, request) => inventory.reserveStock(tx, request),
      inject: [InventoryService],
    },
  ],
  exports: [InventoryService, ORDER_STOCK_RESERVATION],
})
export class InventoryModule {}