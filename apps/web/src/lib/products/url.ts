/** Chấp nhận URL gốc server hoặc URL đã có hậu tố /api. */
export function getProductsUrl(productId?: string): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();

  const base = (
    configured || 'http://localhost:4000'
  ).replace(/\/+$/, '');

  const api = base.endsWith('/api') ? base : `${base}/api`;
  const products = `${api}/products`;

  return productId === undefined
    ? products
    : `${products}/${encodeURIComponent(productId)}`;
}