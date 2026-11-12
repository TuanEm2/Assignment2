import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { assertSameOrderItems, validateOrderKey } from './order-idempotency';
import {
  type OrderItemInput,
  parseOrderItems,
  parseOrderUuid,
} from './order-input';
import { assertOrderStatusTransition } from './order-status';
import type {
  CreateOrderOptions,
  OrderCatalog,
  PreparedOrder,
  StockRequirement,
} from './order-types';

const optionFields = { id: true, name: true, price: true } as const;
const postgresIntMax = 2_147_483_647;
const orderSelection = {
  id: true,
  userId: true,
  status: true,
  total: true,
  createdAt: true,
  updatedAt: true,
  items: {
    select: {
      id: true,
      productId: true,
      productName: true,
      sizeId: true,
      sizeName: true,
      toppings: true,
      quantity: true,
      unitPrice: true,
      lineTotal: true,
    },
    orderBy: { id: 'asc' },
  },
} satisfies Prisma.OrderSelect;
type SavedOrder = Prisma.OrderGetPayload<{ select: typeof orderSelection }>;

function stockRequirements(items: OrderItemInput[]): StockRequirement[] {
  const totals = new Map<string, number>();
  for (const { productId, quantity } of items) {
    totals.set(productId, (totals.get(productId) ?? 0) + quantity);
  }

  return [...totals.entries()]
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([productId, quantity]) => ({ productId, quantity }));
}

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async prepareOrder(
    input: unknown,
    catalog: OrderCatalog = this.prisma,
  ): Promise<PreparedOrder> {
    return this.priceItems(parseOrderItems(input), catalog);
  }

  async createOrder(
    userId: string,
    input: unknown,
    options: CreateOrderOptions,
  ): Promise<SavedOrder> {
    const ownerId = parseOrderUuid(userId, 'userId');
    const items = parseOrderItems(input);
    const key = validateOrderKey(options.idempotencyKey);

    if (key !== undefined) {
      const existing = await this.findReplay(ownerId, key, items);
      if (existing) return existing;
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
          where: { id: ownerId },
          select: { id: true },
        });
        if (!user) throw new NotFoundException('Order customer not found');
        const priced = await this.priceItems(items, tx);

        // Claim the idempotency key before reserving stock so a concurrent
        // retry cannot fail because the original request consumed the stock.
        const order = await tx.order.create({
          data: {
            userId: ownerId,
            idempotencyKey: key,
            status: priced.status,
            total: priced.total,
            items: {
              create: priced.items.map((item) => ({
                productId: item.productId,
                productName: item.productName,
                sizeId: item.size?.id ?? null,
                sizeName: item.size?.name ?? null,
                toppings: item.toppings.map(({ id, name, price }) => ({
                  id,
                  name,
                  price,
                })),
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                lineTotal: item.lineTotal,
              })),
            },
          },
          select: orderSelection,
        });

        await options.reserveStock(tx, stockRequirements(items));
        return order;
      });
    } catch (error) {
      if (
        key !== undefined &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existing = await this.findReplay(ownerId, key, items);
        if (existing) return existing;
      }
      throw error;
    }
  }

  async transitionStatus(
    orderId: string,
    next: OrderStatus,
    tx: Pick<Prisma.TransactionClient, 'order'> = this.prisma,
  ): Promise<OrderStatus> {
    const id = parseOrderUuid(orderId, 'orderId');
    const order = await tx.order.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!order) throw new NotFoundException(`Order ${id} not found`);

    assertOrderStatusTransition(order.status, next);
    const updated = await tx.order.updateMany({
      where: { id, status: order.status },
      data: { status: next },
    });
    if (updated.count !== 1) {
      throw new ConflictException('Order status changed before the update');
    }

    return next;
  }

  private async findReplay(
    userId: string,
    key: string,
    items: OrderItemInput[],
  ): Promise<SavedOrder | null> {
    const existing = await this.prisma.order.findUnique({
      where: { userId_idempotencyKey: { userId, idempotencyKey: key } },
      select: orderSelection,
    });
    if (existing) assertSameOrderItems(items, existing.items);
    return existing;
  }

  private async priceItems(
    items: OrderItemInput[],
    catalog: OrderCatalog,
  ): Promise<PreparedOrder> {
    const productIds = [...new Set(items.map((item) => item.productId))];
    const products = await catalog.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        price: true,
        sizes: { select: optionFields },
        toppings: { select: optionFields },
      },
    });
    const productById = new Map(
      products.map((product) => [product.id, product]),
    );

    const pricedItems = items.map((item) => {
      const product = productById.get(item.productId);
      if (!product) {
        throw new NotFoundException(`Product ${item.productId} not found`);
      }

      const size = product.sizes.find((option) => option.id === item.sizeId);
      if (!size && (item.sizeId !== null || product.sizes.length > 0)) {
        throw new BadRequestException(
          `Select a valid size for product ${product.id}`,
        );
      }

      const toppings = item.toppingIds.map((id) => {
        const topping = product.toppings.find((option) => option.id === id);
        if (!topping) {
          throw new BadRequestException(
            `Topping ${id} is unavailable for product ${product.id}`,
          );
        }
        return topping;
      });
      const unitPrice =
        product.price +
        (size?.price ?? 0) +
        toppings.reduce((sum, topping) => sum + topping.price, 0);

      return {
        productId: product.id,
        productName: product.name,
        basePrice: product.price,
        size: size ?? null,
        toppings,
        quantity: item.quantity,
        unitPrice,
        lineTotal: unitPrice * item.quantity,
      };
    });

    const total = pricedItems.reduce((sum, item) => sum + item.lineTotal, 0);
    if (!Number.isSafeInteger(total) || total > postgresIntMax) {
      throw new BadRequestException('Order total exceeds the supported range');
    }

    return { status: 'PENDING', items: pricedItems, total };
  }
}
