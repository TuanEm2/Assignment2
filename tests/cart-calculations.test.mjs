import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createCartLine,
  getCartSubtotal,
  getCartLineTotal,
  getCartItemCount,
  makeCartLineId,
  clampQuantity,
} from '../apps/web/src/lib/cart/calculations.ts';

const milkTea = {
  productId: 'p01',
  productName: 'Trà sữa',
  basePrice: 25000,
  size: { id: 'L', name: 'Lớn', price: 5000 },
  toppings: [{ id: 'pearl', name: 'Trân châu', price: 6000 }],
};

test('Giá gồm base, size, topping và nhân số lượng', () => {
  const line = createCartLine({ ...milkTea, quantity: 2 });
  assert.equal(getCartLineTotal(line), 72000);
  assert.equal(getCartSubtotal([line]), 72000);
  assert.equal(getCartItemCount([line]), 2);
});

test('Chọn topping khác thứ tự vẫn là cùng một line', () => {
  assert.equal(
    makeCartLineId('p01', 'L', ['a', 'b', 'a']),
    makeCartLineId('p01', 'L', ['b', 'a']),
  );
});

test('Khác size tạo ra line khác', () => {
  assert.notEqual(makeCartLineId('p01', 'S', []), makeCartLineId('p01', 'L', []));
});

test('Topping trùng id không bị tính tiền hai lần', () => {
  const line = createCartLine({
    ...milkTea,
    toppings: [milkTea.toppings[0], milkTea.toppings[0]],
  });
  assert.equal(line.toppings.length, 1);
  assert.equal(getCartLineTotal(line), 36000);
});

test('Chặn giá và số lượng không hợp lệ', () => {
  assert.throws(() => createCartLine({ ...milkTea, basePrice: -100 }), /basePrice/);
  assert.throws(() => createCartLine({ ...milkTea, quantity: 0 }), /Số lượng/);
  assert.equal(clampQuantity(101), 99);
});
