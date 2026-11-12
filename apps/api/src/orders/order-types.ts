import type { Prisma, SizeName } from '@prisma/client';
import type { OrderItemInput } from './order-input';

export type OrderCatalog = Pick<Prisma.TransactionClient, 'product'>;

interface PricedOption {
  id: string;
  name: string;
  price: number;
}

export interface PricedOrderItem {
  productId: string;
  productName: string;
  basePrice: number;
  size: (PricedOption & { name: SizeName }) | null;
  toppings: PricedOption[];
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface PreparedOrder {
  status: 'PENDING';
  items: PricedOrderItem[];
  total: number;
}

export interface StockReservationRequest {
  orderId: string;
  items: readonly OrderItemInput[];
}

export interface CreateOrderOptions {
  reserveStock(
    tx: Prisma.TransactionClient,
    request: StockReservationRequest,
  ): Promise<void>;
  idempotencyKey?: string;
}
