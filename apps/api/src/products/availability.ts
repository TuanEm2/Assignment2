import { ServiceUnavailableException } from '@nestjs/common';

export interface IngredientRequirement {
  ingredientId: string;
  quantity: number;
}

/** Snapshot only: reserveStock() checks the real inventory again at order creation. */
export function calculateAvailableCups(
  recipe: readonly IngredientRequirement[],
  ingredients: readonly { id: string; stock: number }[],
): number {
  if (!recipe.length) throw new ServiceUnavailableException('Ingredient recipe missing');
  const perCup = new Map<string, number>();
  for (const row of recipe) {
    const total = (perCup.get(row.ingredientId) ?? 0) + row.quantity;
    if (!Number.isSafeInteger(row.quantity) || row.quantity <= 0 ||
        !Number.isSafeInteger(total) || total > 2_147_483_647) {
      throw new ServiceUnavailableException('Invalid ingredient recipe');
    }
    perCup.set(row.ingredientId, total);
  }
  const byId = new Map(ingredients.map((row) => [row.id, row.stock]));
  let available = Number.MAX_SAFE_INTEGER;
  for (const [id, amount] of perCup) {
    const stock = byId.get(id);
    if (stock === undefined || !Number.isSafeInteger(stock) || stock < 0) {
      throw new ServiceUnavailableException('Ingredient stock unavailable');
    }
    available = Math.min(available, Math.floor(stock / amount));
  }
  return available;
}
