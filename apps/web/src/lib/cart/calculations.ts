import type { AddCartLineInput, CartLine, CartOption } from './types';

export const MAX_CART_QUANTITY = 99;

function assertWholeNonnegativeVnd(price: number, label: string): void {
  if (!Number.isSafeInteger(price) || price < 0) {
    throw new Error(`${label} phải là số nguyên VND không âm`);
  }
}

function validateOption(option: CartOption, label: string): void {
  if (!option.id?.trim() || !option.name?.trim()) {
    throw new Error(`${label} phải có id và name`);
  }
  assertWholeNonnegativeVnd(option.price, `${label}.price`);
}

export function clampQuantity(quantity: number): number {
  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    throw new Error('Số lượng phải là số nguyên dương');
  }
  return Math.min(quantity, MAX_CART_QUANTITY);
}

/** Thứ tự chọn topping không tạo dòng giỏ hàng trùng. */
export function makeCartLineId(
  productId: string,
  sizeId: string | null,
  toppingIds: readonly string[],
): string {
  return JSON.stringify([
    productId,
    sizeId ?? '',
    [...new Set(toppingIds)].sort(),
  ]);
}

export function createCartLine(input: AddCartLineInput): CartLine {
  if (!input.productId?.trim() || !input.productName?.trim()) {
    throw new Error('Sản phẩm phải có productId và productName');
  }
  assertWholeNonnegativeVnd(input.basePrice, 'basePrice');
  if (input.size) validateOption(input.size, 'size');

  const toppingsById = new Map<string, CartOption>();
  for (const topping of input.toppings ?? []) {
    validateOption(topping, 'topping');
    toppingsById.set(topping.id, { ...topping });
  }
  const toppings = [...toppingsById.values()].sort((a, b) =>
    a.id.localeCompare(b.id),
  );
  const size = input.size ? { ...input.size } : null;

  return {
    id: makeCartLineId(input.productId, size?.id ?? null, toppings.map((t) => t.id)),
    productId: input.productId,
    productName: input.productName,
    basePrice: input.basePrice,
    size,
    toppings,
    quantity: clampQuantity(input.quantity ?? 1),
    ...(input.imageUrl ? { imageUrl: input.imageUrl } : {}),
  };
}

/** Giá 1 món = giá gốc + phụ thu size + tổng topping. */
export function getCartLineUnitPrice(line: CartLine): number {
  return (
    line.basePrice +
    (line.size?.price ?? 0) +
    line.toppings.reduce((total, option) => total + option.price, 0)
  );
}

export function getCartLineTotal(line: CartLine): number {
  return getCartLineUnitPrice(line) * line.quantity;
}

export function getCartSubtotal(lines: readonly CartLine[]): number {
  return lines.reduce((total, line) => total + getCartLineTotal(line), 0);
}

export function getCartItemCount(lines: readonly CartLine[]): number {
  return lines.reduce((total, line) => total + line.quantity, 0);
}
