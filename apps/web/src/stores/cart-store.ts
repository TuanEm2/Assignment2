'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  clampQuantity,
  createCartLine,
  getCartItemCount,
  getCartSubtotal,
} from '../lib/cart/calculations';
import type { AddCartLineInput, CartLine } from '../lib/cart/types';

interface CartStore {
  items: CartLine[];
  addItem: (input: AddCartLineInput) => void;
  removeItem: (lineId: string) => void;
  setQuantity: (lineId: string, quantity: number) => void;
  clearCart: () => void;
}

/** Chỉ sử dụng để hiển thị. Backend phải xác minh lại giá và tồn kho. */
export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      items: [],
      addItem: (input) => {
        const line = createCartLine(input);
        set((state) => {
          const existing = state.items.find((item) => item.id === line.id);
          if (!existing) return { items: [...state.items, line] };
          return {
            items: state.items.map((item) =>
              item.id === line.id
                ? { ...item, quantity: clampQuantity(item.quantity + line.quantity) }
                : item,
            ),
          };
        });
      },
      removeItem: (lineId) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== lineId),
        })),
      setQuantity: (lineId, quantity) => {
        if (!Number.isSafeInteger(quantity) || quantity < 0) {
          throw new Error('Số lượng phải là số nguyên không âm');
        }
        set((state) => ({
          items:
            quantity === 0
              ? state.items.filter((item) => item.id !== lineId)
              : state.items.map((item) =>
                  item.id === lineId
                    ? { ...item, quantity: clampQuantity(quantity) }
                    : item,
                ),
        }));
      },
      clearCart: () => set({ items: [] }),
    }),
    {
      name: 'brewlite-cart-v1',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: (state) => ({ items: state.items }),
    },
  ),
);

export const selectCartSubtotal = (state: CartStore) => getCartSubtotal(state.items);
export const selectCartItemCount = (state: CartStore) => getCartItemCount(state.items);
