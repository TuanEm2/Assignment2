import type { CartOption } from '@/lib/cart/types';

export interface ProductDetail {
  id: string;
  slug: string;
  name: string;
  price: number;
  imageUrl: string;
  sizes: CartOption[];
  toppings: CartOption[];
}

const isMoney = (n: unknown): n is number =>
  typeof n === 'number' && Number.isSafeInteger(n) && n >= 0;

function options(value: unknown): CartOption[] {
  if (!Array.isArray(value)) throw new Error('Danh sách tùy chọn không hợp lệ.');
  const seen = new Set<string>();
  return value.map((row: unknown) => {
    if (!row || typeof row !== 'object') throw new Error('Tùy chọn không hợp lệ.');
    const r = row as Record<string, unknown>;
    if (typeof r.id !== 'string' || !r.id || seen.has(r.id) ||
        typeof r.name !== 'string' || !r.name.trim() || !isMoney(r.price)) {
      throw new Error('Tùy chọn không hợp lệ.');
    }
    seen.add(r.id);
    return { id: r.id, name: r.name, price: r.price };
  });
}

export function parseProductDetail(value: unknown): ProductDetail {
  if (!value || typeof value !== 'object') throw new Error('Dữ liệu sản phẩm không hợp lệ.');
  const r = value as Record<string, unknown>;
  if (typeof r.id !== 'string' || !r.id || typeof r.slug !== 'string' ||
      typeof r.name !== 'string' || !r.name.trim() || !isMoney(r.price) ||
      typeof r.imageUrl !== 'string') throw new Error('Dữ liệu sản phẩm không hợp lệ.');
  // Chỉ dùng đường dẫn ảnh cùng ứng dụng, theo contract Product API.
  if (!r.imageUrl.startsWith('/') || r.imageUrl.startsWith('//')) {
    throw new Error('Đường dẫn ảnh sản phẩm không hợp lệ.');
  }
  return { id: r.id, slug: r.slug, name: r.name, price: r.price,
    imageUrl: r.imageUrl, sizes: options(r.sizes), toppings: options(r.toppings) };
}

export async function getProductDetail(id: string, signal: AbortSignal): Promise<ProductDetail> {
  const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/+$/, '');
  const api = base.endsWith('/api') ? base : `${base}/api`;
  const response = await fetch(`${api}/products/${encodeURIComponent(id)}`, { signal, cache: 'no-store' });
  if (response.status === 404) throw new Error('Không tìm thấy đồ uống.');
  if (response.status === 400) throw new Error('Mã đồ uống không hợp lệ.');
  if (!response.ok) throw new Error('Không tải được đồ uống. Vui lòng thử lại.');
  const product = parseProductDetail(await response.json());
  if (product.id !== id) throw new Error('API trả về sai sản phẩm.');
  return product;
}
