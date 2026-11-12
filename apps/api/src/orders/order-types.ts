import type { Prisma, SizeName } from '@prisma/client';

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

export interface StockRequirement {
  productId: string;
  quantity: number;
}

export interface CreateOrderOptions {
  reserveStock(
    tx: Prisma.TransactionClient,
    requirements: readonly StockRequirement[],
  ): Promise<void>;
  idempotencyKey?: string;
}
