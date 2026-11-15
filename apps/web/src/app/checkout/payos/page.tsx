'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useClientReady } from '@/lib/client-ready';
import { useAuthStore } from '@/stores/auth-store';
import { useCartStore } from '@/stores/cart-store';

function apiPrefix() {
  const raw = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/+$/, '');
  return raw.endsWith('/api') ? raw : `${raw}/api`;
}

function getMessage(raw: unknown): string {
  if (raw && typeof raw === 'object' && 'message' in raw) {
    const message = (raw as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return 'Không thể tạo liên kết thanh toán; vui lòng thử lại hoặc liên hệ nhân viên.';
}

type SavedPayosAttempt = { signature: string; orderKey: string; orderId?: string };

/** Parse sessionStorage without narrowing the saved attempt to null/never. */
function readSavedAttempt(): SavedPayosAttempt | null {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem('brewlite-payos-attempt') ?? 'null');
    if (!parsed || typeof parsed !== 'object') return null;
    const value = parsed as Record<string, unknown>;
    if (typeof value.signature !== 'string' || typeof value.orderKey !== 'string') return null;
    return {
      signature: value.signature,
      orderKey: value.orderKey,
      ...(typeof value.orderId === 'string' ? { orderId: value.orderId } : {}),
    };
  } catch {
    return null;
  }
}

export default function PayosCheckoutPage() {
  const ready = useClientReady();
  const token = useAuthStore(s => s.token);
  const items = useCartStore(s => s.items);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function pay() {
    if (!token || busy || !items.length) return;
    setBusy(true);
    setError('');
    try {
      const payload = { items: items.map(item => ({
        productId: item.productId, sizeId: item.size?.id ?? null,
        toppingIds: item.toppings.map(topping => topping.id), quantity: item.quantity,
      })) };
      const signature = JSON.stringify({ payload, user: useAuthStore.getState().user?.id });
      let saved = readSavedAttempt();
      if (!saved || saved.signature !== signature) {
        saved = { signature, orderKey: `payos-order-${crypto.randomUUID()}` };
      }
      sessionStorage.setItem('brewlite-payos-attempt', JSON.stringify(saved));

      if (!saved.orderId) {
        const response = await fetch(`${apiPrefix()}/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`,
            'idempotency-key': saved.orderKey },
          body: JSON.stringify(payload),
        });
        const order: unknown = await response.json();
        if (!response.ok) throw new Error(getMessage(order));
        if (!order || typeof order !== 'object' || !('id' in order) || typeof order.id !== 'string') {
          throw new Error('Không nhận được mã đơn hợp lệ');
        }
        saved.orderId = order.id;
        sessionStorage.setItem('brewlite-payos-attempt', JSON.stringify(saved));
      }

      const response = await fetch(`${apiPrefix()}/payments/payos/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId: saved.orderId }),
      });
      const data: unknown = await response.json();
      if (!response.ok) throw new Error(getMessage(data));
      if (!data || typeof data !== 'object' || !('checkoutUrl' in data) || typeof data.checkoutUrl !== 'string') {
        throw new Error('Không nhận được liên kết PayOS');
      }
      const url = new URL(data.checkoutUrl);
      if (url.protocol !== 'https:' || url.hostname !== 'pay.payos.vn') {
        throw new Error('Liên kết PayOS không hợp lệ');
      }
      // Never clear cart on redirect. Real payment is confirmed by a verified webhook.
      window.location.assign(url.toString());
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Không thể kết nối cổng thanh toán');
      setBusy(false);
    }
  }

  return <main lang="vi" className="mx-auto max-w-lg p-8">
    <h1 className="text-2xl font-bold">Thanh toán chuyển khoản PayOS</h1>
    <p className="my-4">Sau khi tạo đơn, bạn sẽ được chuyển đến trang PayOS để quét mã VietQR bằng ứng dụng ngân hàng.</p>
    {!ready ? <p>Đang tải giỏ hàng…</p> : !token ?
      <p>Vui lòng <Link className="underline" href="/login?redirect=/checkout/payos">đăng nhập</Link> trước.</p> :
      items.length === 0 ? <p>Giỏ hàng đang trống. <Link className="underline" href="/menu">Xem menu</Link>.</p> :
      <button className="rounded-lg bg-amber-900 p-3 text-white disabled:opacity-50" type="button" disabled={busy} onClick={() => void pay()}>
        {busy ? 'Đang tạo liên kết…' : 'Tiếp tục đến PayOS / Quét QR'}
      </button>}
    {error && <p role="alert" className="mt-3 text-red-700">{error}</p>}
    <p className="mt-5 text-sm">Không chuyển tiền nếu thông tin người nhận hoặc số tiền trên PayOS không đúng. Không sử dụng tài khoản thật khi chưa được người quản lý kênh thanh toán đồng ý.</p>
    <Link href="/checkout" className="mt-5 inline-block underline">Quay lại thanh toán</Link>
  </main>;
}
