'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useClientReady } from '@/lib/client-ready';
import { selectIsAuthenticated, useAuthStore } from '@/stores/auth-store';
import './orders.css';

export type OrderStatus =
  | 'PENDING'
  | 'PAYMENT_FAILED'
  | 'PAID'
  | 'PREPARING'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED';

export interface OrderSummary {
  id: string;
  total: number;
  status: OrderStatus;
  createdAt: string;
  itemCount?: number;
}

const vnd = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

const statusConfig: Record<OrderStatus, { label: string; className: string }> = {
  PENDING: { label: 'Chờ thanh toán', className: 'status-pending' },
  PAYMENT_FAILED: { label: 'Thanh toán thất bại', className: 'status-payment-failed' },
  PAID: { label: 'Đã thanh toán', className: 'status-paid' },
  PREPARING: { label: 'Đang pha chế', className: 'status-preparing' },
  READY: { label: 'Sẵn sàng phục vụ', className: 'status-ready' },
  COMPLETED: { label: 'Hoàn thành', className: 'status-completed' },
  CANCELLED: { label: 'Đã hủy', className: 'status-cancelled' },
};

export function OrdersView({
  loader,
}: {
  loader?: (
    token: string,
    cursor?: string | null,
  ) => Promise<OrderSummary[] | { data: OrderSummary[]; nextCursor?: string | null }>;
}) {
  const ready = useClientReady();
  const signedIn = useAuthStore(selectIsAuthenticated);
  const token = useAuthStore((s) => s.token);

  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!ready || !signedIn || !token) {
      return;
    }

    const controller = new AbortController();

    void Promise.resolve()
      .then(async () => {
        if (loader) {
          return loader(token, null);
        }

        const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
        const base = (configured || 'http://localhost:4000').replace(/\/+$/, '');
        const prefix = base.endsWith('/api') ? base : `${base}/api`;

        const url = new URL(`${prefix}/orders/me`);
        url.searchParams.set('limit', '20');

        const res = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        if (!res.ok) {
          const err = new Error();
          (err as unknown as { status: number }).status = res.status;
          throw err;
        }

        const rawData = await res.json();
        const data: OrderSummary[] = Array.isArray(rawData) ? rawData : [];
        const cursorHeader = res.headers.get('x-next-cursor');
        return { data, nextCursor: cursorHeader?.trim() || null };
      })
      .then((res) => {
        if (!controller.signal.aborted) {
          const data = Array.isArray(res) ? res : res.data;
          const next = Array.isArray(res) ? null : res.nextCursor;
          setOrders(data);
          setNextCursor(next || null);
          setError('');
          setStatusCode(200);
        }
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setOrders([]);
          setNextCursor(null);
          const status = (err as unknown as { status?: number })?.status;
          setStatusCode(status || 500);
          if (status === 401) {
            setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
          } else if (status && status >= 500) {
            setError('Máy chủ gặp sự cố khi xử lý dữ liệu. Vui lòng thử lại sau.');
          } else {
            setError(err instanceof Error && err.message ? err.message : 'Không thể tải danh sách đơn hàng.');
          }
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [ready, signedIn, token, loader, attempt]);

  const handleLoadMore = async () => {
    if (!token || !nextCursor) return;
    setLoadingMore(true);
    try {
      if (loader) {
        const res = await loader(token, nextCursor);
        const data = Array.isArray(res) ? res : res.data;
        const next = Array.isArray(res) ? null : res.nextCursor;
        setOrders((prev) => [...prev, ...data]);
        setNextCursor(next || null);
      } else {
        const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
        const base = (configured || 'http://localhost:4000').replace(/\/+$/, '');
        const prefix = base.endsWith('/api') ? base : `${base}/api`;

        const url = new URL(`${prefix}/orders/me`);
        url.searchParams.set('limit', '20');
        url.searchParams.set('cursor', nextCursor);

        const res = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const rawData = await res.json();
          const data: OrderSummary[] = Array.isArray(rawData) ? rawData : [];
          setOrders((prev) => [...prev, ...data]);
          const cursorHeader = res.headers.get('x-next-cursor');
          setNextCursor(cursorHeader?.trim() || null);
        }
      }
    } finally {
      setLoadingMore(false);
    }
  };

  if (!ready) {
    return <div className="orders-container">Đang tải…</div>;
  }

  if (!signedIn) {
    return (
      <main className="orders-container">
        <h1 className="orders-title">Lịch sử đơn hàng</h1>
        <div className="order-card text-center p-8">
          <p className="text-stone-700">Vui lòng đăng nhập để xem lịch sử đơn hàng của bạn.</p>
          <Link href="/login?redirect=/orders" className="mt-4 inline-block font-semibold text-amber-900 underline">
            Đăng nhập ngay
          </Link>
        </div>
      </main>
    );
  }

  const getStatusBadge = (status: OrderStatus) => {
    const config = statusConfig[status] || {
      label: status,
      className: 'status-pending',
    };
    return <span className={`status-badge ${config.className}`}>{config.label}</span>;
  };

  return (
    <main className="orders-container">
      <div className="flex justify-between items-center mb-6">
        <h1 className="orders-title mb-0">Lịch sử đơn hàng</h1>
        <Link href="/menu" className="text-sm font-semibold text-amber-900 underline">
          Đặt món mới
        </Link>
      </div>

      {loading ? (
        <p role="status">Đang tải danh sách đơn hàng…</p>
      ) : error ? (
        <div role="alert" className="order-card border-red-200 p-6 bg-red-50/50">
          <p className="text-red-700 font-semibold">{error}</p>
          <div className="mt-4">
            {statusCode === 401 ? (
              <Link href="/login?redirect=/orders" className="btn-retry text-center no-underline">
                Đăng nhập lại
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  setAttempt((a) => a + 1);
                }}
                className="btn-retry"
              >
                Thử lại
              </button>
            )}
          </div>
        </div>
      ) : orders.length === 0 ? (
        <div className="order-card text-center p-8">
          <p className="text-stone-700">Bạn chưa có đơn hàng nào.</p>
          <Link href="/menu" className="mt-4 inline-block font-semibold text-amber-900 underline">
            Khám phá thực đơn
          </Link>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((ord) => (
            <Link key={ord.id} href={`/orders/${ord.id}`} className="order-card block text-inherit no-underline">
              <div className="order-card-header">
                <span className="order-id">{`Mã đơn: #${ord.id.slice(0, 8)}`}</span>
                {getStatusBadge(ord.status)}
              </div>
              <div className="order-card-body">
                <p>Thời gian: {new Date(ord.createdAt).toLocaleString('vi-VN')}</p>
                {typeof ord.itemCount === 'number' && (
                  <p className="text-xs text-stone-500">Số lượng món: {ord.itemCount}</p>
                )}
                <p className="order-total">Tổng tiền: {vnd.format(ord.total)}</p>
              </div>
            </Link>
          ))}

          {nextCursor && (
            <button
              type="button"
              disabled={loadingMore}
              onClick={handleLoadMore}
              className="btn-load-more"
            >
              {loadingMore ? 'Đang tải thêm…' : 'Xem các đơn cũ hơn'}
            </button>
          )}
        </div>
      )}
    </main>
  );
}
