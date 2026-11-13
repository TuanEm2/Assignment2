'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { useClientReady } from '@/lib/client-ready';
import { useCheckoutOrchestrator } from '@/lib/checkout/use-checkout-orchestrator';
import { selectIsAuthenticated, useAuthStore } from '@/stores/auth-store';
import { selectCartSubtotal, useCartStore } from '@/stores/cart-store';
import { CheckoutView, type PaymentMethod } from './checkout-view';

export function CheckoutScreen() {
  const ready = useClientReady();
  const signedIn = useAuthStore(selectIsAuthenticated);
  const items = useCartStore((state) => state.items);
  const subtotal = useCartStore(selectCartSubtotal);

  const { state, handlePay, handleCheckStatus } = useCheckoutOrchestrator();
  const actionInProgress = useRef(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const showEmptyCart = items.length === 0 && (state.phase === 'review' || state.phase === 'failed');

  const onPay = async (method: PaymentMethod) => {
    if (actionInProgress.current) return;
    actionInProgress.current = true;
    try {
      await handlePay(items, subtotal, method);
    } finally {
      actionInProgress.current = false;
    }
  };

  const onCheckStatus = async () => {
    if (actionInProgress.current) return;
    actionInProgress.current = true;
    setCheckingStatus(true);
    try {
      await handleCheckStatus();
    } finally {
      setCheckingStatus(false);
      actionInProgress.current = false;
    }
  };

  return (
    <main lang="vi" className="min-h-dvh bg-[#f7f3ec] px-4 py-8 text-[#30251d] sm:px-8 sm:py-12">
      <div className="mx-auto max-w-xl">
        <Link href="/cart" className="text-sm font-semibold text-amber-900 underline underline-offset-4">
          Quay lại giỏ hàng
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Thanh toán</h1>
        {!ready ? (
          <p role="status" className="mt-6">Đang tải đơn hàng…</p>
        ) : showEmptyCart ? (
          <p className="mt-6">Giỏ hàng của bạn đang trống.</p>
        ) : !signedIn ? (
          <section className="mt-6 rounded-xl border border-stone-200 bg-white p-5">
            <p>Vui lòng đăng nhập để tiếp tục thanh toán.</p>
            <Link href="/login?redirect=/checkout" className="mt-3 inline-block font-semibold text-amber-900 underline">
              Đăng nhập
            </Link>
          </section>
        ) : (
          <CheckoutView
            items={items}
            subtotal={subtotal}
            state={state}
            onPay={onPay}
            onCheckStatus={onCheckStatus}
            checkingStatus={checkingStatus}
          />
        )}
      </div>
    </main>
  );
}
