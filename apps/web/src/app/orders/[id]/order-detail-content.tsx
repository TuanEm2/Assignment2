'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useClientReady } from '@/lib/client-ready';
import { selectIsAuthenticated, useAuthStore } from '@/stores/auth-store';
import '../orders.css';

export type OrderStatus =
  | 'PENDING'
  | 'PAYMENT_FAILED'
  | 'PAID'
  | 'PREPARING'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED';

export interface OrderItemDetail {
  id: string;
  productId?: string;
  productName: string;
  sizeName?: string | null;
  toppings?: string[];
  quantity: number;
  unitPrice: number;
  subtotal: number;
  lineTotal?: number;
}

export interface PaymentDetail {
  id: string;
  method: string;
  amount: number;
  createdAt: string;
}

export interface OrderDetail {
  id: string;
  status: OrderStatus;
  total: number;
  createdAt: string;
  updatedAt?: string;
  items?: OrderItemDetail[];
  payment?: PaymentDetail | null;
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

export function OrderDetailContent({
  orderId,
  loader,
}: {
  orderId: string;
  loader?: (id: string, token: string) => Promise<OrderDetail>;
}) {
  const ready = useClientReady();
  const signedIn = useAuthStore(selectIsAuthenticated);
  const token = useAuthStore((s) => s.token);

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!ready || !signedIn || !token) {
      return;
    }

    const controller = new AbortController();

    void Promise.resolve()
      .then(async () => {
        if (loader) {
          return loader(orderId, token);
        }

        const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
        const base = (configured || 'http://localhost:4000').replace(/\/+$/, '');
        const prefix = base.endsWith('/api') ? base : `${base}/api`;

        const res = await fetch(`${prefix}/orders/${encodeURIComponent(orderId)}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        if (!res.ok) {
          const err = new Error();
          (err as unknown as { status: number }).status = res.status;
          throw err;
        }

        return (await res.json()) as OrderDetail;
      })
      .then((data) => {
        if (!controller.signal.aborted) {
          setOrder(data);
          setError('');
          setStatusCode(200);
        }
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setOrder(null);
          const status = (err as unknown as { status?: number })?.status;
          setStatusCode(status || 500);
          if (status === 401) {
            setError('Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.');
          } else if (status === 404) {
            setError('Không tìm thấy đơn hàng hoặc bạn không có quyền truy cập đơn này.');
          } else if (status === 400) {
            setError('Mã đơn hàng không hợp lệ.');
          } else if (status && status >= 500) {
            setError('Máy chủ gặp sự cố khi xử lý dữ liệu. Vui lòng thử lại sau.');
          } else {
            setError(err instanceof Error && err.message ? err.message : 'Không thể tải chi tiết đơn hàng.');
          }
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [orderId, ready, signedIn, token, loader, attempt]);

  if (!ready || (signedIn && loading)) {
    return (
      <main className="orders-container">
        <p role="status">Đang tải chi tiết đơn hàng…</p>
      </main>
    );
  }

  if (!signedIn) {
    return (
      <main className="orders-container">
        <h1 className="orders-title">Chi tiết đơn hàng</h1>
        <div className="order-card text-center p-8">
          <p className="text-stone-700">Vui lòng đăng nhập để xem thông tin đơn hàng.</p>
          <Link
            href={`/login?redirect=/orders/${orderId}`}
            className="mt-4 inline-block font-semibold text-amber-900 underline"
          >
            Đăng nhập ngay
          </Link>
        </div>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="orders-container">
        <Link href="/orders" className="text-sm font-semibold text-amber-900 underline">
          ← Quay lại danh sách đơn
        </Link>
        <div role="alert" className="order-card mt-4 border-red-200 p-6 bg-red-50/50">
          <h2 className="text-lg font-bold text-red-800">Thông báo</h2>
          <p className="text-red-700 mt-2">{error || 'Không tìm thấy dữ liệu đơn hàng.'}</p>
          <div className="mt-4 flex gap-4 items-center">
            {statusCode === 401 ? (
              <Link
                href={`/login?redirect=/orders/${orderId}`}
                className="btn-retry text-center no-underline"
              >
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
            <Link href="/orders" className="text-sm font-semibold text-stone-700 underline">
              Về danh sách đơn
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const badge = statusConfig[order.status] || {
    label: order.status,
    className: 'status-pending',
  };

  return (
    <main className="orders-container">
      <Link href="/orders" className="text-sm font-semibold text-amber-900 underline">
        ← Quay lại danh sách đơn
      </Link>

      <div className="order-card mt-4">
        <div className="order-card-header">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {`Đơn hàng #${order.id.slice(0, 8)}`}
            </h1>
            <p className="text-xs text-stone-500 mt-1 font-mono break-all">{`ID: ${order.id}`}</p>
          </div>
          <span className={`status-badge ${badge.className}`}>{badge.label}</span>
        </div>

        <div className="order-card-body">
          <p>
            <strong>Thời gian đặt:</strong> {new Date(order.createdAt).toLocaleString('vi-VN')}
          </p>

          {order.items && order.items.length > 0 && (
            <div className="mt-4">
              <h2 className="text-base font-semibold text-slate-800 mb-2">Chi tiết món đã đặt</h2>
              <table className="order-items-table">
                <thead>
                  <tr>
                    <th>Sản phẩm</th>
                    <th>Số lượng</th>
                    <th>Đơn giá</th>
                    <th>Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="font-semibold text-slate-900">{item.productName}</div>
                        {item.sizeName && (
                          <div className="text-xs text-stone-600">Size: {item.sizeName}</div>
                        )}
                        {item.toppings && item.toppings.length > 0 && (
                          <div className="text-xs text-stone-500">
                            Topping: {item.toppings.join(', ')}
                          </div>
                        )}
                      </td>
                      <td>{item.quantity}</td>
                      <td>{vnd.format(item.unitPrice)}</td>
                      <td>{vnd.format(item.subtotal ?? item.lineTotal ?? item.unitPrice * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {order.payment && (
            <div className="order-payment-info">
              <h3 className="font-semibold text-slate-800">Thông tin thanh toán</h3>
              <p className="text-xs text-stone-600 mt-1">
                Phương thức: <strong>{order.payment.method}</strong> · Số tiền:{' '}
                <strong>{vnd.format(order.payment.amount)}</strong>
              </p>
              <p className="text-xs text-stone-500">
                Thời gian: {new Date(order.payment.createdAt).toLocaleString('vi-VN')}
              </p>
            </div>
          )}

          <div className="border-t border-slate-100 pt-4 mt-3 flex justify-between items-center">
            <span className="text-base font-bold text-slate-900">Tổng thanh toán:</span>
            <span className="order-total text-xl text-amber-900">{vnd.format(order.total)}</span>
          </div>
        </div>
      </div>
    </main>
  );
}
