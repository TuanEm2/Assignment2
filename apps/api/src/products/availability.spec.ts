import { calculateAvailableCups } from './availability';

describe('recipe-based available cups', () => {
  it('takes limiting ingredient and aggregates shared ingredients across size and topping', () => {
    expect(calculateAvailableCups(
      [
        { ingredientId: 'coffee', quantity: 18 },
        { ingredientId: 'milk', quantity: 20 },
        { ingredientId: 'milk', quantity: 5 },
        { ingredientId: 'cup', quantity: 1 },
      ],
      [{ id: 'coffee', stock: 100 }, { id: 'milk', stock: 74 }, { id: 'cup', stock: 50 }],
    )).toBe(2);
  });
  it('returns zero when a required ingredient is exhausted', () => {
    expect(calculateAvailableCups([{ ingredientId: 'cup', quantity: 1 }], [
      { id: 'cup', stock: 0 },
    ])).toBe(0);
  });
  it('rejects incomplete recipes and missing ingredient records', () => {
    expect(() => calculateAvailableCups([], [])).toThrow();
    expect(() => calculateAvailableCups([{ ingredientId: 'cup', quantity: 1 }], [])).toThrow();
  });
});
