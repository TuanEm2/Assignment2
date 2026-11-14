import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma, type IngredientUnit, type OrderStatus } from '@prisma/client';
import { parseOrderItems, parseOrderUuid } from '../orders/order-input';
import type { OrderItemInput } from '../orders/order-input';
import type { StockReservationRequest } from '../orders/order-types';

const maxInt = 2_147_483_647;

type Recipe = {
  ingredientId: string;
  quantity: number;
};

type IngredientRow = {
  id: string;
  name: string;
  unit: IngredientUnit;
  stock: number;
  version: number;
};

@Injectable()
export class InventoryService {
  /**
   * Dùng transaction của OrdersService.
   * Nếu giữ kho thất bại, toàn bộ việc tạo đơn phải rollback.
   */
  async reserveStock(
    tx: Prisma.TransactionClient,
    request: StockReservationRequest,
  ): Promise<void> {
    const orderId = parseOrderUuid(request.orderId, 'orderId');
    const items = parseOrderItems({ items: [...request.items] });

    if (await tx.orderIngredient.count({ where: { orderId } })) {
      throw new ConflictException(
        'Ingredients have already been reserved for this order',
      );
    }

    const needs = await this.requirements(tx, items);
    const ingredients = await this.lockIngredients(tx, [...needs.keys()]);

    for (const [ingredientId, quantity] of needs) {
      const ingredient = ingredients.get(ingredientId)!;

      if (ingredient.stock < quantity) {
        throw new ConflictException({
          statusCode: 409,
          code: 'INSUFFICIENT_INGREDIENT',
          message: `Insufficient ingredient: ${ingredient.name}`,
          ingredientId,
          required: quantity,
          available: ingredient.stock,
          unit: ingredient.unit,
        });
      }

      const updated = await tx.ingredient.updateMany({
        where: {
          id: ingredientId,
          version: ingredient.version,
          stock: { gte: quantity },
        },
        data: {
          stock: { decrement: quantity },
          version: { increment: 1 },
        },
      });

      if (updated.count !== 1) {
        throw new ConflictException(
          'Ingredient stock changed; retry the same order request',
        );
      }
    }

    await tx.orderIngredient.createMany({
      data: [...needs].map(([ingredientId, quantity]) => ({
        orderId,
        ingredientId,
        quantity,
      })),
    });
  }

  /**
   * Gọi cùng bước chuyển CANCELLED trong một transaction.
   * Đơn đã thanh toán cần chính sách refund trước khi hoàn kho.
   */
  async releaseStock(
    tx: Prisma.TransactionClient,
    input: string,
  ): Promise<void> {
    const orderId = parseOrderUuid(input, 'orderId');

    const [order] = await tx.$queryRaw<
      Array<{
        id: string;
        status: OrderStatus;
        stockReleasedAt: Date | null;
      }>
    >`
      SELECT "id", "status", "stockReleasedAt" FROM "Order"
      WHERE "id" = ${orderId}::uuid FOR UPDATE
    `;

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== 'CANCELLED') {
      throw new ConflictException(
        'Only cancelled orders can release ingredients',
      );
    }

    if (order.stockReleasedAt) {
      return;
    }

    const payment = await tx.payment.findUnique({
      where: { orderId },
      select: { id: true },
    });

    if (payment) {
      throw new ConflictException(
        'A paid order requires a refund policy before releasing ingredients',
      );
    }

    const usages = await tx.orderIngredient.findMany({
      where: { orderId },
      orderBy: { ingredientId: 'asc' },
    });

    if (!usages.length) {
      throw new ConflictException(
        'Order has no ingredient snapshot; legacy-order handling is required',
      );
    }

    const ingredients = await this.lockIngredients(
      tx,
      usages.map((usage) => usage.ingredientId),
    );

    for (const { ingredientId, quantity } of usages) {
      const ingredient = ingredients.get(ingredientId)!;

      if (ingredient.stock > maxInt - quantity) {
        throw new ConflictException(
          'Released ingredient quantity exceeds the supported range',
        );
      }

      const updated = await tx.ingredient.updateMany({
        where: {
          id: ingredientId,
          version: ingredient.version,
        },
        data: {
          stock: { increment: quantity },
          version: { increment: 1 },
        },
      });

      if (updated.count !== 1) {
        throw new ConflictException(
          'Ingredient stock changed during release',
        );
      }
    }

    await tx.order.update({
      where: { id: orderId },
      data: { stockReleasedAt: new Date() },
    });
  }

  private async requirements(
    tx: Prisma.TransactionClient,
    items: readonly OrderItemInput[],
  ): Promise<Map<string, number>> {
    const sizeIds = [
      ...new Set(
        items.flatMap((item) => (item.sizeId ? [item.sizeId] : [])),
      ),
    ];

    const toppingIds = [
      ...new Set(items.flatMap((item) => item.toppingIds)),
    ];

    const recipe = {
      select: {
        ingredientId: true,
        quantity: true,
      },
    } as const;

    const [sizes, toppings] = await Promise.all([
      tx.productSize.findMany({
        where: { id: { in: sizeIds } },
        select: {
          id: true,
          productId: true,
          recipe,
        },
      }),
      tx.productTopping.findMany({
        where: { id: { in: toppingIds } },
        select: {
          id: true,
          productId: true,
          recipe,
        },
      }),
    ]);

    const bySize = new Map(sizes.map((size) => [size.id, size]));
    const byTopping = new Map(
      toppings.map((topping) => [topping.id, topping]),
    );
    const totals = new Map<string, number>();

    const add = (rows: readonly Recipe[], count: number): void => {
      for (const row of rows) {
        if (!Number.isInteger(row.quantity) || row.quantity <= 0) {
          throw new ServiceUnavailableException(
            'Ingredient recipe has an invalid quantity',
          );
        }

        const total =
          (totals.get(row.ingredientId) ?? 0) + row.quantity * count;

        if (!Number.isSafeInteger(total) || total > maxInt) {
          throw new BadRequestException(
            'Order ingredient requirement exceeds the supported range',
          );
        }

        totals.set(row.ingredientId, total);
      }
    };

    for (const item of items) {
      const size = item.sizeId
        ? bySize.get(item.sizeId)
        : undefined;

      if (
        !size ||
        size.productId !== item.productId ||
        !size.recipe.length
      ) {
        throw new ServiceUnavailableException({
          statusCode: 503,
          code: 'INGREDIENT_RECIPE_NOT_CONFIGURED',
          message: 'A size with a valid ingredient recipe is required',
          productId: item.productId,
          sizeId: item.sizeId,
        });
      }

      add(size.recipe, item.quantity);

      for (const toppingId of item.toppingIds) {
        const topping = byTopping.get(toppingId);

        if (
          !topping ||
          topping.productId !== item.productId ||
          !topping.recipe.length
        ) {
          throw new ServiceUnavailableException({
            statusCode: 503,
            code: 'INGREDIENT_RECIPE_NOT_CONFIGURED',
            message: 'Selected topping has no valid ingredient recipe',
            toppingId,
          });
        }

        add(topping.recipe, item.quantity);
      }
    }

    return new Map(
      [...totals].sort(([a], [b]) => a.localeCompare(b)),
    );
  }

  private async lockIngredients(
    tx: Prisma.TransactionClient,
    ids: readonly string[],
  ): Promise<Map<string, IngredientRow>> {
    // Mọi đơn khóa nguyên liệu theo cùng thứ tự để tránh deadlock.
    const rows = await tx.$queryRaw<IngredientRow[]>(Prisma.sql`
      SELECT "id", "name", "unit", "stock", "version" FROM "Ingredient"
      WHERE "id" IN (
        ${Prisma.join(ids.map((id) => Prisma.sql`${id}::uuid`))}
      )
      ORDER BY "id" FOR UPDATE
    `);

    if (rows.length !== new Set(ids).size) {
      throw new ServiceUnavailableException(
        'An ingredient referenced by a recipe is unavailable',
      );
    }

    return new Map(rows.map((row) => [row.id, row]));
  }
}