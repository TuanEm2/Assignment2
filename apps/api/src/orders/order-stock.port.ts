import type { CreateOrderOptions } from './order-types';

/**
 * Điểm nối callback giữ kho của đợt 2.
 * Dùng đúng transaction do OrdersService truyền vào.
 */
export const ORDER_STOCK_RESERVATION = Symbol(
  'ORDER_STOCK_RESERVATION',
);

export type OrderStockReservation =
  CreateOrderOptions['reserveStock'];