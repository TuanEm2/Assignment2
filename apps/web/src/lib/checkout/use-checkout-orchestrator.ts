'use client';

import { useState } from 'react';
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

async function defaultCreateOrder(
  payload: CreateOrderPayload,
  token: string,
  idempotencyKey: string,
) {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  const base = (configured || 'http://localhost:4000').replace(/\/+$/, '');
  const prefix = base.endsWith('/api') ? base : `${base}/api`;

  const response = await fetch(`${prefix}/orders`, {
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
  amount: number,
  method: PaymentMethod,
  _idempotencyKey: string,
) {
  void _idempotencyKey;
  // Mock payment processing theo hợp đồng TV1
  await new Promise((resolve) => setTimeout(resolve, 600));
  return {
    success: true,
    transactionId: `txn-${Date.now()}-${method}`,
  };
}

export function useCheckoutOrchestrator({
  orderSubmitter = defaultCreateOrder,
  paymentProcessor = defaultProcessPayment,
}: {
  orderSubmitter?: OrderSubmitHandler;
  paymentProcessor?: PaymentSubmitHandler;
} = {}) {
  const [state, setState] = useState<CheckoutState>({ phase: 'review' });
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const token = useAuthStore((s) => s.token);
  const clearCart = useCartStore((s) => s.clearCart);

  const handlePay = async (items: readonly CartLine[], subtotal: number, method: PaymentMethod) => {
    if (!token) {
      setState({ phase: 'failed' });
      return;
    }

    if (items.length === 0) {
      return;
    }

    setState({ phase: 'processing', orderTotal: subtotal });

    const idempotencyKey = `idem-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    try {
      const orderPayload: CreateOrderPayload = {
        items: items.map((item) => ({
          productId: item.productId,
          sizeId: item.size?.id ?? null,
          toppingIds: item.toppings ? item.toppings.map((t) => t.id) : [],
          quantity: item.quantity,
        })),
      };

      // 1. Tạo đơn hàng phía Backend (tính giá và trừ kho server-side)
      const order = await orderSubmitter(orderPayload, token, idempotencyKey);
      setLastOrderId(order.id);

      // 2. Thực hiện thanh toán mock
      const paymentResult = await paymentProcessor(
        order.id,
        order.total ?? subtotal,
        method,
        `pay-${idempotencyKey}`,
      );

      if (paymentResult.success) {
        clearCart();
        setState({
          phase: 'paid',
          orderId: order.id,
          orderTotal: order.total ?? subtotal,
        });
      } else {
        setState({ phase: 'failed', orderTotal: order.total ?? subtotal });
      }
    } catch (cause: unknown) {
      console.error('Checkout orchestration error:', cause);
      setState({ phase: 'failed', orderTotal: subtotal });
    }
  };

  const handleCheckStatus = () => {
    if (lastOrderId) {
      setState({ phase: 'paid', orderId: lastOrderId, orderTotal: 0 });
    } else {
      setState({ phase: 'review' });
    }
  };

  return {
    state,
    handlePay,
    handleCheckStatus,
  };
}
