'use client';

import { useRef, useState } from 'react';
import type { CartLine } from '@/lib/cart/types';
import type { CheckoutState, PaymentMethod } from '@/app/checkout/checkout-view';
import { useAuthStore } from '@/stores/auth-store';
import { useCartStore } from '@/stores/cart-store';

export interface CreateOrderPayload {
  items: Array<{
    productId: string;
    sizeId: string | null;
    toppingIds: string[];
    quantity: number;
  }>;
}

export type OrderSubmitHandler = (
  payload: CreateOrderPayload,
  token: string,
  idempotencyKey: string,
) => Promise<{ id: string; total: number; status: string }>;

export type PaymentSubmitHandler = (
  orderId: string,
  amount: number,
  method: PaymentMethod,
  idempotencyKey: string,
) => Promise<{ success: boolean; transactionId?: string }>;

export type PaymentStatusHandler = (
  orderId: string,
  token: string,
) => Promise<{ success: boolean; status: string; amount: number }>;

export class PaymentStatusUnknownError extends Error {}

function apiPrefix() {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  const base = (configured || 'http://localhost:4000').replace(/\/+$/, '');
  return base.endsWith('/api') ? base : `${base}/api`;
}

async function defaultCreateOrder(
  payload: CreateOrderPayload,
  token: string,
  idempotencyKey: string,
) {
  const response = await fetch(`${apiPrefix()}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'idempotency-key': idempotencyKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Không thể tạo đơn hàng lúc này');
  }
  return response.json();
}

async function defaultProcessPayment(
  orderId: string,
  _amount: number,
  method: PaymentMethod,
  idempotencyKey: string,
) {
  void _amount;
  const token = useAuthStore.getState().token;
  if (!token) throw new Error('Cần đăng nhập để thanh toán.');

  // Only the mock endpoint accepts outcome. For a real provider, this must
  // come from a VERIFIED payment confirmation, never browser input.
  let response: Response;
  try {
    response = await fetch(`${apiPrefix()}/payments/mock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        orderId, method, outcome: 'SUCCESS', idempotencyKey,
      }),
    });
  } catch {
    throw new PaymentStatusUnknownError('Chưa xác định được kết quả thanh toán. Kiểm tra trạng thái trước khi thử lại.');
  }

  const body: unknown = await response.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    throw new PaymentStatusUnknownError('Không đọc được phản hồi thanh toán.');
  }
  const value = body as Record<string, unknown>;
  if (!response.ok) {
    if (response.status === 409 || response.status >= 500) {
      throw new PaymentStatusUnknownError('Thanh toán có thể đã được xử lý; cần kiểm tra trạng thái.');
    }
    throw new Error(typeof value.message === 'string' ? value.message : 'Thanh toán bị từ chối');
  }
  if (typeof value.success !== 'boolean') {
    throw new PaymentStatusUnknownError('Kết quả thanh toán không hợp lệ.');
  }
  return {
    success: value.success,
    ...(typeof value.transactionId === 'string' ? { transactionId: value.transactionId } : {}),
  };
}

async function defaultCheckPaymentStatus(orderId: string, token: string) {
  const response = await fetch(
    `${apiPrefix()}/payments/mock/status/${encodeURIComponent(orderId)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok) throw new Error('Không lấy được trạng thái thanh toán');
  const body: unknown = await response.json();
  if (!body || typeof body !== 'object') {
    throw new Error('Trạng thái thanh toán không hợp lệ');
  }
  const data = body as Record<string, unknown>;
  if (typeof data.success !== 'boolean' || typeof data.status !== 'string' ||
      typeof data.amount !== 'number') {
    throw new Error('Trạng thái thanh toán không hợp lệ');
  }
  return { success: data.success, status: data.status, amount: data.amount };
}

interface CheckoutAttempt {
  signature: string;
  orderKey: string;
  paymentKey: string;
}

export function useCheckoutOrchestrator({
  orderSubmitter = defaultCreateOrder,
  paymentProcessor = defaultProcessPayment,
  statusChecker = defaultCheckPaymentStatus,
}: {
  orderSubmitter?: OrderSubmitHandler;
  paymentProcessor?: PaymentSubmitHandler;
  statusChecker?: PaymentStatusHandler;
} = {}) {
  const [state, setState] = useState<CheckoutState>({ phase: 'review' });
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const attempt = useRef<CheckoutAttempt | null>(null);
  const token = useAuthStore((s) => s.token);
  const clearCart = useCartStore((s) => s.clearCart);

  const handlePay = async (items: readonly CartLine[], subtotal: number, method: PaymentMethod) => {
    if (!token) {
      setState({ phase: 'failed' });
      return;
    }
    if (items.length === 0) return;

    const orderPayload: CreateOrderPayload = {
      items: items.map((item) => ({
        productId: item.productId,
        sizeId: item.size?.id ?? null,
        toppingIds: item.toppings ? item.toppings.map((t) => t.id) : [],
        quantity: item.quantity,
      })),
    };
    // Preserve the order key across retries for the same basket. Never generate
    // a new key blindly after an ambiguous response from the API.
    const signature = JSON.stringify({ items: orderPayload.items, method, token });
    if (!attempt.current || attempt.current.signature !== signature) {
      const seed = `idem-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      attempt.current = { signature, orderKey: seed, paymentKey: `pay-${seed}` };
    }
    const currentAttempt = attempt.current;
    setState({ phase: 'processing', orderTotal: subtotal });

    try {
      const order = await orderSubmitter(orderPayload, token, currentAttempt.orderKey);
      setLastOrderId(order.id);
      const paymentResult = await paymentProcessor(
        order.id,
        order.total,
        method,
        currentAttempt.paymentKey,
      );

      if (paymentResult.success) {
        attempt.current = null;
        clearCart();
        setState({ phase: 'paid', orderId: order.id, orderTotal: order.total });
      } else {
        // Confirmed FAILURE is a completed attempt: next attempt needs a NEW
        // payment key, while the ORDER idempotency key remains the same.
        currentAttempt.paymentKey = `pay-idem-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        setState({ phase: 'failed', orderTotal: order.total });
      }
    } catch (cause: unknown) {
      console.error('Checkout orchestration error:', cause);
      if (cause instanceof PaymentStatusUnknownError) {
        setState({ phase: 'unknown', orderTotal: subtotal });
      } else {
        setState({ phase: 'failed', orderTotal: subtotal });
      }
    }
  };

  const handleCheckStatus = async () => {
    if (!lastOrderId || !token) {
      setState({ phase: 'failed' });
      return;
    }
    try {
      const latest = await statusChecker(lastOrderId, token);
      if (latest.success) {
        attempt.current = null;
        clearCart();
        setState({ phase: 'paid', orderId: lastOrderId, orderTotal: latest.amount });
      } else if (latest.status === 'PENDING' || latest.status === 'PAYMENT_FAILED') {
        setState({ phase: 'failed', orderTotal: latest.amount });
      } else {
        setState({ phase: 'unknown', orderTotal: latest.amount });
      }
    } catch (cause: unknown) {
      console.error('Payment status verification error:', cause);
      setState((previous) => ({
        phase: 'unknown',
        orderTotal: previous.orderTotal,
      }));
    }
  };

  return { state, handlePay, handleCheckStatus };
}
