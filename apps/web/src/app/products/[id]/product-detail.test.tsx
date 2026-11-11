import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { ProductDetail } from './product-detail';
import { useCartStore } from '@/stores/cart-store';
import { getProductDetail, parseProductDetail, type ProductDetail as Product } from '@/lib/products/detail';

const product: Product = { id: 'drink-1', slug: 'cappuccino', name: 'Cappuccino', price: 45000,
  imageUrl: '/images/products/cappuccino.jpg', sizes: [{ id: 's', name: 'S', price: 0 }, { id: 'l', name: 'L', price: 10000 }],
  toppings: [{ id: 'cream', name: 'Kem', price: 10000 }] };
beforeEach(() => { useCartStore.setState({ items: [] }); localStorage.clear(); });

it('loading, chọn tùy chọn và thêm đúng cấu hình vào store TV1', async () => {
  const user = userEvent.setup();
  let resolve!: (p: Product) => void;
  const loader = vi.fn(() => new Promise<Product>(r => { resolve = r; }));
  render(<ProductDetail productId={product.id} loader={loader} />);
  expect(screen.getByRole('status')).toHaveTextContent('Đang tải');
  expect(screen.queryByRole('button', { name: 'Thêm vào giỏ' })).not.toBeInTheDocument();
  resolve(product);
  await screen.findByRole('heading', { name: 'Cappuccino' });
  await user.click(screen.getByRole('radio', { name: /^L/ }));
  await user.click(screen.getByRole('checkbox', { name: /^Kem/ }));
  const input = screen.getByRole('spinbutton', { name: 'Số lượng' });
  await user.clear(input); await user.type(input, '2');
  expect(screen.getByLabelText('Tổng tạm tính')).toHaveTextContent(/130.000/);
  await user.click(screen.getByRole('button', { name: 'Thêm vào giỏ' }));
  expect(useCartStore.getState().items).toEqual([expect.objectContaining({ productId: 'drink-1', productName: 'Cappuccino',
    basePrice: 45000, size: product.sizes[1], toppings: product.toppings, quantity: 2 })]);
  expect(screen.getByRole('status', { name: 'Thông báo giỏ hàng' })).toHaveTextContent('Đã thêm 2 Cappuccino');
  expect(loader).toHaveBeenCalledTimes(1);
});

it('lỗi tải có thể thử lại, không tự thêm món', async () => {
  const user = userEvent.setup();
  const loader = vi.fn().mockRejectedValueOnce(new Error('Không tìm thấy đồ uống.')).mockResolvedValueOnce(product);
  render(<ProductDetail productId={product.id} loader={loader} />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Không tìm thấy');
  expect(useCartStore.getState().items).toHaveLength(0);
  await user.click(screen.getByRole('button', { name: 'Thử lại' }));
  await screen.findByRole('heading', { name: 'Cappuccino' });
});

it('chặn số lượng không hợp lệ và bỏ topping trước khi thêm', async () => {
  const user = userEvent.setup();
  const loader = vi.fn().mockResolvedValue(product);
  render(<ProductDetail productId={product.id} loader={loader} />);
  await screen.findByRole('heading', { name: 'Cappuccino' });
  const input = screen.getByRole('spinbutton');
  await user.clear(input); await user.type(input, '100');
  expect(screen.getByRole('button', { name: 'Thêm vào giỏ' })).toBeDisabled();
  await user.clear(input); await user.type(input, '1');
  const cream = screen.getByRole('checkbox');
  await user.click(cream); await user.click(cream);
  await user.click(screen.getByRole('button', { name: 'Thêm vào giỏ' }));
  expect(useCartStore.getState().items[0].toppings).toEqual([]);
});

it('hủy request khi rời trang để phản hồi cũ không cập nhật', async () => {
  let signal!: AbortSignal;
  const loader = vi.fn((_id: string, s: AbortSignal) => { signal = s; return new Promise<Product>(() => {}); });
  const view = render(<ProductDetail productId={product.id} loader={loader} />);
  view.unmount(); expect(signal.aborted).toBe(true);
});

it('API URL chỉ có một /api, kiểm tra dữ liệu và không nhận sai ID', async () => {
  vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://localhost:4000/api/');
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => product });
  vi.stubGlobal('fetch', fetchMock);
  const controller = new AbortController();
  await getProductDetail(product.id, controller.signal);
  expect(fetchMock).toHaveBeenCalledWith('http://localhost:4000/api/products/drink-1', expect.objectContaining({ signal: controller.signal }));
  await expect(getProductDetail('other', controller.signal)).rejects.toThrow('sai sản phẩm');
  vi.unstubAllGlobals(); vi.unstubAllEnvs();
});

it('không chấp nhận giá hoặc option sai định dạng từ API', () => {
  expect(() => parseProductDetail({ ...product, price: -1 })).toThrow();
  expect(() => parseProductDetail({ ...product, sizes: [product.sizes[0], product.sizes[0]] })).toThrow();
  expect(() => parseProductDetail({ ...product, toppings: null })).toThrow();
});

it('hiển thị cấu hình không có option mà không bịa size/topping', async () => {
  const loader = vi.fn().mockResolvedValue({ ...product, sizes: [], toppings: [] });
  render(<ProductDetail productId={product.id} loader={loader} />);
  await screen.findByText('Không có topping bổ sung.');
  expect(screen.queryAllByRole('radio')).toHaveLength(0);
  expect(screen.getByRole('button', { name: 'Thêm vào giỏ' })).toBeEnabled();
  await waitFor(() => expect(screen.getByLabelText('Tổng tạm tính')).toHaveTextContent(/45.000/));
});
