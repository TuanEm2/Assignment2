import type { CreateOrderOptions } from './order-types';

/**
 * Điểm nối giữ kho theo nguyên liệu. Dùng transaction, mã đơn và từng dòng
 * món đã kiểm tra do OrdersService truyền vào.
 */
export const ORDER_STOCK_RESERVATION = Symbol(
  'ORDER_STOCK_RESERVATION',
);

export type OrderStockReservation =
  CreateOrderOptions['reserveStock'];
