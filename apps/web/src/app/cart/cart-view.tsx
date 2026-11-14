'use client';

import Link from 'next/link';
import { useClientReady } from '@/lib/client-ready';
import {
  getCartLineTotal,
  getCartLineUnitPrice,
  MAX_CART_QUANTITY,
} from '@/lib/cart/calculations';
import {
  selectCartItemCount,
  selectCartSubtotal,
  useCartStore,
} from '@/stores/cart-store';

const vnd = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
});

const controlClass =
  'flex size-11 items-center justify-center rounded-lg border border-stone-300 text-lg font-semibold transition hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800 disabled:opacity-40';

export function CartView() {
  const ready = useClientReady();
  const items = useCartStore((state) => state.items);
  const quantity = useCartStore(selectCartItemCount);
  const subtotal = useCartStore(selectCartSubtotal);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const removeItem = useCartStore((state) => state.removeItem);

  return (
    <main lang="vi" className="min-h-dvh bg-[#f7f3ec] px-4 py-8 text-[#30251d] sm:px-8 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <Link href="/menu" className="text-sm font-semibold text-amber-900 underline underline-offset-4">
          Tiếp tục chọn món
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Giỏ hàng</h1>

        {!ready ? (
          <p role="status" className="mt-6 text-sm text-stone-700">Đang tải giỏ hàng…</p>
        ) : items.length === 0 ? (
          <section className="mt-6 rounded-xl border border-stone-200 bg-white p-6">
            <h2 className="text-lg font-semibold">Giỏ hàng của bạn đang trống</h2>
            <p className="mt-2 text-sm text-stone-700">Thêm đồ uống để xem giỏ hàng tại đây.</p>
          </section>
        ) : (
          <div className="mt-6 grid gap-5 md:grid-cols-[minmax(0,1fr)_16rem]">
            <ul aria-label="Đồ uống trong giỏ" className="grid min-w-0 content-start gap-3">
              {items.map((item) => (
                <li key={item.id} className="min-w-0 rounded-xl border border-stone-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                    <h2 className="min-w-0 wrap-anywhere text-lg font-semibold">{item.productName}</h2>
                    <span className="shrink-0 font-semibold tabular-nums">{vnd.format(getCartLineTotal(item))}</span>
                  </div>
                  <p className="mt-1 wrap-anywhere text-sm text-stone-700">
                    {item.size && <>Size {item.size.name} · </>}
                    {item.toppings.length > 0
                      ? item.toppings.map((topping) => topping.name).join(', ')
                      : 'Không topping'}
                  </p>
                  <p className="mt-1 text-sm text-stone-700">{vnd.format(getCartLineUnitPrice(item))} / ly</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <div role="group" aria-label={`Số lượng ${item.productName}`} className="flex items-center gap-2">
                      <button
                        type="button"
                        className={controlClass}
                        aria-label={`Giảm số lượng ${item.productName}`}
                        disabled={item.quantity <= 1}
                        onClick={() => setQuantity(item.id, item.quantity - 1)}
                      >
                        −
                      </button>
                      <output aria-label="Số lượng hiện tại" className="min-w-7 text-center font-medium tabular-nums">
                        {item.quantity}
                      </output>
                      <button
                        type="button"
                        className={controlClass}
                        aria-label={`Tăng số lượng ${item.productName}`}
                        disabled={item.quantity >= MAX_CART_QUANTITY}
                        onClick={() => setQuantity(item.id, item.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      aria-label={`Xóa ${item.productName} khỏi giỏ`}
                      onClick={() => removeItem(item.id)}
                      className="min-h-11 px-2 text-sm font-medium text-amber-900 underline underline-offset-4"
                    >
                      Xóa món
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <aside className="self-start rounded-xl border border-stone-200 bg-white p-4 md:sticky md:top-4">
              <h2 className="text-lg font-semibold">Tóm tắt giỏ hàng</h2>
              <dl aria-live="polite" className="mt-3 grid gap-2 text-sm">
                <div className="flex justify-between gap-3 text-stone-700">
                  <dt>Số lượng</dt>
                  <dd>{quantity} ly</dd>
                </div>
                <div className="flex justify-between gap-3 border-t border-stone-200 pt-3 font-semibold">
                  <dt>Tạm tính</dt>
                  <dd className="tabular-nums">{vnd.format(subtotal)}</dd>
                </div>
              </dl>
              <Link
                href="/checkout"
                className="mt-4 flex min-h-11 items-center justify-center rounded-lg bg-amber-900 px-4 py-2 font-semibold text-white hover:bg-amber-800"
              >
                Thanh toán
              </Link>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
