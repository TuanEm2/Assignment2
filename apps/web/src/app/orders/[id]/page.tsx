import { Suspense } from 'react';
import { OrderDetailContent } from './order-detail-content';

async function OrderDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrderDetailContent orderId={id} />;
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="orders-container">Đang tải chi tiết đơn hàng…</div>}>
      <OrderDetailRoute params={params} />
    </Suspense>
  );
}
