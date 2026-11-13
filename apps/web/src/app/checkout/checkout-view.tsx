'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { CartLine } from '@/lib/cart/types';

export type PaymentMethod = 'MOCK_WALLET' | 'MOCK_CARD';

export type CheckoutState =
  | { phase: 'review' | 'processing' | 'failed' | 'unknown'; orderTotal?: number }
  | { phase: 'paid'; orderId: string; orderTotal: number };

interface CheckoutViewProps {
  items: readonly CartLine[];
  subtotal: number;
  state: CheckoutState;
  onPay?: (method: PaymentMethod) => void;
  onCheckStatus?: () => void;
  checkingStatus?: boolean;
}

const vnd = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
const methods: { value: PaymentMethod; label: string }[] = [
  { value: 'MOCK_WALLET', label: 'Ví điện tử mô phỏng' },
  { value: 'MOCK_CARD', label: 'Thẻ mô phỏng' },
];
const actionClass =
  'min-h-11 w-full rounded-lg bg-amber-900 px-4 py-2 font-semibold text-white hover:bg-amber-800 disabled:opacity-50';

export function CheckoutView({ items, subtotal, state, onPay, onCheckStatus, checkingStatus = false }: CheckoutViewProps) {
  const [method, setMethod] = useState<PaymentMethod>('MOCK_WALLET');

  if (state.phase === 'paid') {
    return (
      <section role="status" className="mt-6 rounded-xl border border-green-200 bg-white p-5">
        <h2 className="text-xl font-bold text-green-800">Thanh toán thành công</h2>
        <p className="mt-2 break-all">Mã đơn {state.orderId}</p>
        <p className="mt-1">Đã thanh toán {vnd.format(state.orderTotal)}</p>
        <Link href="/menu" className="mt-4 inline-block font-semibold text-amber-900 underline">
          Về menu
        </Link>
      </section>
    );
  }

  const processing = state.phase === 'processing';
  const unknown = state.phase === 'unknown';
  const busy = processing || checkingStatus;
  const canPay = Boolean(onPay) && !busy && !unknown && items.length > 0;

  return (
    <form
      aria-busy={busy}
      className="mt-6 space-y-5 rounded-xl border border-stone-200 bg-white p-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (canPay) onPay?.(method);
      }}
    >
      <section aria-labelledby="checkout-summary">
        <h2 id="checkout-summary" className="text-lg font-semibold">Đơn của bạn</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {items.map((item) => (
            <li key={item.id} className="wrap-anywhere">
              {item.productName}{item.size ? ` · Size ${item.size.name}` : ''} × {item.quantity}
              {item.toppings.length > 0 && ` · ${item.toppings.map((topping) => topping.name).join(', ')}`}
            </li>
          ))}
        </ul>
        <p className="mt-3 border-t border-stone-200 pt-3 font-semibold">
          {state.orderTotal === undefined ? 'Tạm tính' : 'Tổng tiền đơn'} {vnd.format(state.orderTotal ?? subtotal)}
        </p>
      </section>

      <fieldset disabled={busy || unknown} className="grid min-w-0 gap-2 sm:grid-cols-2">
        <legend className="mb-2 text-base font-semibold">Phương thức thanh toán</legend>
        {methods.map(({ value, label }) => (
          <label key={value} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-stone-300 px-3 py-2 has-checked:border-amber-900 has-checked:bg-amber-50">
            <input
              type="radio"
              name="payment-method"
              value={value}
              checked={method === value}
              onChange={() => setMethod(value)}
              className="accent-amber-900"
            />
            {label}
          </label>
        ))}
      </fieldset>

      {processing && <p role="status" className="text-sm">Đang xử lý thanh toán…</p>}
      {state.phase === 'failed' && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-900">
          Thanh toán thất bại. Giỏ hàng được giữ lại, bạn có thể thử lại.
        </p>
      )}
      {unknown && (
        <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">
          Chưa xác nhận được kết quả. Hãy kiểm tra lại trạng thái trước khi thanh toán lần nữa.
        </p>
      )}
      {state.phase === 'review' && !onPay && (
        <p role="status" className="text-sm text-stone-700">Chưa thể thanh toán lúc này.</p>
      )}

      {unknown ? (
        <button type="button" disabled={checkingStatus || !onCheckStatus} onClick={onCheckStatus} className={actionClass}>
          {checkingStatus ? 'Đang kiểm tra…' : 'Kiểm tra trạng thái'}
        </button>
      ) : (
        <button type="submit" disabled={!canPay} className={actionClass}>
          {processing ? 'Đang xử lý…' : state.phase === 'failed' ? 'Thử lại' : 'Xác nhận thanh toán'}
        </button>
      )}
    </form>
  );
}
