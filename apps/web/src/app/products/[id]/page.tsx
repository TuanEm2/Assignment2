import { Suspense } from 'react';
import { ProductDetail } from './product-detail';

async function DetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProductDetail key={id} productId={id} />;
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={<p role="status">Đang mở đồ uống...</p>}><DetailRoute params={params} /></Suspense>;
}
