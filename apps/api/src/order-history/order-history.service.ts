import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { parseOrderUuid } from '../orders/order-input';
import { PrismaService } from '../prisma/prisma.service';

const summarySelect = {
  id: true, status: true, total: true, createdAt: true, updatedAt: true,
  items: { select: { quantity: true } },
} satisfies Prisma.OrderSelect;

function pageQuery(query: Record<string, unknown>) {
  if (Object.keys(query).some(key => key !== 'limit' && key !== 'cursor')) {
    throw new BadRequestException('Only limit and cursor are accepted; the owner comes from JWT.');
  }
  const limit = query.limit === undefined ? '20' : query.limit;
  if (typeof limit !== 'string' || !/^[1-9][0-9]?$/.test(limit) || Number(limit) > 50) {
    throw new BadRequestException('limit must be an integer from 1 to 50.');
  }
  return {
    limit: Number(limit),
    cursor: query.cursor === undefined ? undefined : parseOrderUuid(query.cursor, 'cursor'),
  };
}

/** Read-only projections: never recalculate historical prices from today's catalog. */
@Injectable()
export class OrderHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async mine(owner: string, query: Record<string, unknown>) {
    const userId = parseOrderUuid(owner, 'Authenticated user id');
    const { limit, cursor } = pageQuery(query);
    let boundary: Prisma.OrderWhereInput = {};
    if (cursor) {
      const anchor = await this.prisma.order.findFirst({
        where: { id: cursor, userId }, select: { id: true, createdAt: true },
      });
      // Do not reveal whether an unowned cursor exists.
      if (!anchor) throw new BadRequestException('Invalid history cursor.');
      boundary = { OR: [
        { createdAt: { lt: anchor.createdAt } },
        { createdAt: anchor.createdAt, id: { lt: anchor.id } },
      ] };
    }
    const rows = await this.prisma.order.findMany({
      where: { userId, ...boundary },
      select: summarySelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });
    const page = rows.slice(0, limit);
    return {
      items: page.map(({ items, ...row }) => ({
        ...row, itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      })),
      nextCursor: rows.length > limit ? page[page.length - 1].id : null,
    };
  }

  async detail(owner: string, orderId: string) {
    const userId = parseOrderUuid(owner, 'Authenticated user id');
    const id = parseOrderUuid(orderId, 'orderId');
    const order = await this.prisma.order.findFirst({
      where: { id, userId },
      select: {
        id: true, status: true, total: true, createdAt: true, updatedAt: true,
        items: { orderBy: { id: 'asc' }, select: {
          id: true, productId: true, productName: true, sizeName: true,
          toppings: true, quantity: true, unitPrice: true, lineTotal: true,
        } },
        payment: { select: { id: true, method: true, amount: true, createdAt: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return {
      ...order,
      items: order.items.map(item => ({
        ...item,
        // TV6's detail contract uses names and subtotal; retain canonical lineTotal too.
        toppings: toppingNames(item.toppings),
        subtotal: item.lineTotal,
      })),
    };
  }

  async status(owner: string, orderId: string) {
    const userId = parseOrderUuid(owner, 'Authenticated user id');
    const id = parseOrderUuid(orderId, 'orderId');
    const order = await this.prisma.order.findFirst({
      where: { id, userId },
      select: { id: true, status: true, total: true, updatedAt: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }
}

function toppingNames(value: Prisma.JsonValue): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => {
    if (typeof item === 'string') return [item];
    if (item && typeof item === 'object' && !Array.isArray(item) && typeof item.name === 'string') {
      return [item.name];
    }
    return [];
  });
}
