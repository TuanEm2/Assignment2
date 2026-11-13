'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useClientReady } from '@/lib/client-ready';
import { selectIsAuthenticated, useAuthStore } from '@/stores/auth-store';
import './orders.css';

export interface OrderSummary {
  id: string;
  total: number;
  status: 'PENDING' | 'PAID' | 'PREPARING' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  itemCount?: number;
}

const vnd = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

export function OrdersView({
  loader,
}: {
  loader?: (token: string) => Promise<OrderSummary[]>;
}) {
  const ready = useClientReady();
  const signedIn = useAuthStore(selectIsAuthenticated);
  const token = useAuthStore((s) => s.token);

  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ready || !signedIn || !token) {
      return;
    }

    let ignore = false;
    const fetchOrders = async () => {
      setLoading(true);
      setError('');
      try {
        if (loader) {
          const data = await loader(token);
          if (!ignore) setOrders(data);
        } else {
          // Gọi API GET /api/orders/me
          const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
          const base = (configured || 'http://localhost:4000').replace(/\/+$/, '');
          const prefix = base.endsWith('/api') ? base : `${base}/api`;
          const res = await fetch(`${prefix}/orders/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!res.ok) {
            if (!ignore) setOrders([]);
            return;
          }
          const data = await res.json();
          if (!ignore) setOrders(Array.isArray(data) ? data : []);
        }
      } catch (err: unknown) {
        if (!ignore) setError(err instanceof Error ? err.message : 'Không thể tải lịch sử đơn hàng');
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchOrders();
    return () => {
      ignore = true;
    };
  }, [ready, signedIn, token, loader]);

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

  const getStatusBadge = (status: OrderSummary['status']) => {
    const map = {
      PENDING: { label: 'Chờ thanh toán', class: 'status-pending' },
      PAID: { label: 'Đã thanh toán', class: 'status-paid' },
      PREPARING: { label: 'Đang pha chế', class: 'status-preparing' },
      COMPLETED: { label: 'Hoàn thành', class: 'status-completed' },
      CANCELLED: { label: 'Đã hủy', class: 'status-cancelled' },
    };
    const current = map[status] || { label: status, class: 'status-pending' };
    return <span className={`status-badge ${current.class}`}>{current.label}</span>;
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
        <p role="alert" className="text-red-700">{error}</p>
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
                <span className="order-id">Mã đơn: #{ord.id.slice(0, 8)}</span>
                {getStatusBadge(ord.status)}
              </div>
              <div className="order-card-body">
                <p>Thời gian: {new Date(ord.createdAt).toLocaleString('vi-VN')}</p>
                <p className="order-total">Tổng tiền: {vnd.format(ord.total)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
