'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useClientReady } from '@/lib/client-ready';
import { useAuthStore } from '@/stores/auth-store';
import { useCartStore } from '@/stores/cart-store';

function apiPrefix() {
  const raw = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/+$/, '');
  return raw.endsWith('/api') ? raw : `${raw}/api`;
}

type Result = { status: string; amount: number; orderId: string; success: boolean };

export default function PayosResultPage() {
  const ready = useClientReady();
  const token = useAuthStore(s => s.token);
  const clearCart = useCartStore(s => s.clearCart);
  // useClientReady is false during SSR/hydration; read query only on the client.
  // Derive orderId instead of synchronously setting it inside useEffect.
  const orderId = ready && typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('orderId') ?? ''
    : '';
  const validOrderId = /^[a-fA-F\d]{8}-(?:[a-fA-F\d]{4}-){3}[a-fA-F\d]{12}$/.test(orderId);
  const [result, setResult] = useState<Result | null>(null);
  const [message, setMessage] = useState('Đang xác minh trạng thái từ backend…');
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!ready || !token || !validOrderId) return;
    const id = orderId;
    const controller = new AbortController();
    void fetch(`${apiPrefix()}/payments/payos/status/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${token}` }, signal: controller.signal,
    }).then(async response => {
      if (!response.ok) throw new Error(`API trả HTTP ${response.status}`);
      return response.json() as Promise<Result>;
    }).then(data => {
      if (controller.signal.aborted) return;
      if (data.orderId !== id || typeof data.status !== 'string' || typeof data.success !== 'boolean') {
        throw new Error('Dữ liệu trạng thái không hợp lệ');
      }
      setResult(data);
      if (data.success && data.status === 'PAID') {
        // Only the SERVER-VERIFIED payment clears the cart; never trust PayOS return URL params.
        const raw = sessionStorage.getItem('brewlite-payos-attempt');
        try {
          const saved = raw ? JSON.parse(raw) as { orderId?: string; signature?: string } : null;
          if (saved?.orderId === id) {
            const cart = useCartStore.getState().items;
            const payload = { items: cart.map(item => ({
              productId: item.productId, sizeId: item.size?.id ?? null,
              toppingIds: item.toppings.map(t => t.id), quantity: item.quantity,
            })) };
            const signature = JSON.stringify({ payload, user: useAuthStore.getState().user?.id });
            // Do not erase a newer/different basket after the user returns.
            if (saved.signature === signature) clearCart();
            sessionStorage.removeItem('brewlite-payos-attempt');
          }
        } catch { /* ignore corrupt local cache */ }
        setMessage('Đã nhận xác nhận thanh toán từ backend.');
      } else {
        setMessage('Chưa có xác nhận đã nhận tiền. Không chuyển khoản thêm lần nữa; hãy kiểm tra lại sau.');
      }
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : 'Lỗi kiểm tra thanh toán');
    });
    return () => controller.abort();
  }, [ready, token, validOrderId, orderId, nonce, clearCart]);

  const displayMessage = !ready
    ? 'Đang tải thông tin đơn hàng…'
    : !token
      ? 'Cần đăng nhập lại để kiểm tra đơn hàng.'
      : !validOrderId
        ? 'Mã đơn không hợp lệ.'
        : message;

  return <main lang="vi" className="mx-auto max-w-lg p-8">
    <h1 className="text-2xl font-bold">Trạng thái thanh toán PayOS</h1>
    <p className="my-4" role="status">{displayMessage}</p>
    {orderId && <p className="break-all text-sm">Mã đơn: {orderId}</p>}
    {result && <p className="font-semibold">Trạng thái đơn: {result.status}</p>}
    {!token && <Link href="/login" className="underline">Đăng nhập</Link>}
    <button type="button" onClick={() => { setResult(null); setMessage('Đang xác minh trạng thái từ backend…'); setNonce(n => n + 1); }} className="mt-5 rounded-lg bg-amber-900 p-3 text-white">Kiểm tra lại trạng thái</button>
    <div className="mt-5"><Link href="/orders" className="underline">Lịch sử đơn hàng</Link></div>
    <div className="mt-3"><Link href="/menu" className="underline">Quay lại menu</Link></div>
  </main>;
}
