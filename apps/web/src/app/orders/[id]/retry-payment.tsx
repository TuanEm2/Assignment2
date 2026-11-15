'use client';

import { useRef, useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';

type Phase = 'idle' | 'processing' | 'failed' | 'unknown';

function apiBase(): string {
  const configured = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000');
  const base = configured.endsWith('/') ? configured.slice(0, -1) : configured;
  return base.endsWith('/api') ? base : `${base}/api`;

function newPaymentKey(): string {
  return `retry-${crypto.randomUUID()}`;
}

/**
 * Keep one order id; never create a new Order while retrying a payment.
 * Mock mode is only a simulation. A real PayOS payment is acknowledged
 * exclusively after the backend validates the signed provider webhook.
 */
export function RetryPayment({ orderId, token, onPaid }: {
  orderId: string;
  token: string;
  onPaid: () => void;
}) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState('');
  const activeKey = useRef<string | null>(null);
  const payosEnabled = process.env.NEXT_PUBLIC_PAYOS_ENABLED === 'true';

  async function checkStatus() {
    setPhase('processing');
    setMessage('');
    try {
      const route = payosEnabled
        ? 'payments/payos/status'
        : 'payments/mock/status';
      const response = await fetch(`${apiBase()}/${route}/${encodeURIComponent(orderId)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('Không thể kiểm tra trạng thái thanh toán.');
      const result: unknown = await response.json();
      if (!result || typeof result !== 'object' ||
          !('success' in result) || typeof result.success !== 'boolean') {
        throw new Error('Phản hồi trạng thái không hợp lệ.');
      }
      if (result.success) {
        activeKey.current = null;
        onPaid();
        return;
      }
      if (!('status' in result) || (result.status !== 'PENDING' && result.status !== 'PAYMENT_FAILED')) {
        setPhase('unknown');
        setMessage('Trạng thái chưa rõ. Không thực hiện thêm một thanh toán mới.');
        return;
      }
      activeKey.current = null;
      setPhase('failed');
      setMessage('Đơn chưa thanh toán. Có thể thử thanh toán lại.');
    } catch (cause) {
      setPhase('unknown');
      setMessage(cause instanceof Error ? cause.message : 'Chưa kiểm tra được trạng thái.');
    }
  }

  async function payAgain() {
    if (phase === 'processing' || phase === 'unknown') return;
    setPhase('processing');
    setMessage('');
    try {
      if (payosEnabled) {
        const response = await fetch(`${apiBase()}/payments/payos/checkout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ orderId }),
        });
        if (!response.ok) throw new Error('Chưa tạo được liên kết PayOS. Kiểm tra trạng thái đơn trước khi thử lại.');
        const data: unknown = await response.json();
        if (!data || typeof data !== 'object' || !('checkoutUrl' in data) ||
            typeof data.checkoutUrl !== 'string') {
          throw new Error('Phản hồi PayOS không hợp lệ.');
        }
        const url = new URL(data.checkoutUrl);
        if (url.protocol !== 'https:' || url.hostname !== 'pay.payos.vn') {
          throw new Error('Liên kết PayOS không hợp lệ.');
        }
        window.location.assign(url.toString());
        return;
      }

      activeKey.current ||= newPaymentKey();
      const response = await fetch(`${apiBase()}/payments/mock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId,
          method: 'MOCK_WALLET',
          outcome: 'SUCCESS',
          idempotencyKey: activeKey.current,
        }),
      });
      if (response.status === 401) {
        useAuthStore.getState().logout();
        throw new Error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
      }
      if (response.status === 409 || response.status >= 500) {
        setPhase('unknown');
        setMessage('Kết quả thanh toán chưa rõ. Hãy kiểm tra trạng thái trước khi thử lại.');
        return;
      }
      if (!response.ok) throw new Error('Thanh toán mô phỏng bị từ chối.');
      const data: unknown = await response.json();
      if (!data || typeof data !== 'object' || !('success' in data) ||
          typeof data.success !== 'boolean') throw new Error('Phản hồi thanh toán không hợp lệ.');
      if (data.success) {
        activeKey.current = null;
        onPaid();
      } else {
        activeKey.current = null; // Completed FAILURE -> next attempt gets a fresh key.
        setPhase('failed');
        setMessage('Thanh toán mô phỏng thất bại. Có thể thử lại.');
      }
    } catch (cause) {
      setPhase('unknown');
      setMessage(cause instanceof Error ? cause.message : 'Không thể xác minh kết quả thanh toán.');
    }
  }

  return (
    <section aria-label="Thanh toán lại đơn hàng" className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <h2 className="font-semibold text-amber-950">Đơn chưa thanh toán</h2>
      <p className="mt-1 text-sm text-amber-900">Thanh toán lại trên cùng mã đơn. Không tạo đơn mới.</p>
      {message && <p role="alert" className="mt-2 text-sm text-amber-950">{message}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => void payAgain()}
          disabled={phase === 'processing' || phase === 'unknown'}
          className="rounded-md bg-amber-900 px-4 py-2 font-semibold text-white disabled:opacity-50">
          {phase === 'processing' ? 'Đang xử lý…' : payosEnabled ? 'Tiếp tục thanh toán PayOS' : 'Thanh toán lại (mô phỏng)'}
        </button>
        <button type="button" onClick={() => void checkStatus()} disabled={phase === 'processing'}
          className="rounded-md border border-amber-900 px-4 py-2 font-semibold text-amber-900 disabled:opacity-50">
          Kiểm tra trạng thái
        </button>
      </div>
    </section>
  );
}
