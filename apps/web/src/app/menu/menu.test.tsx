import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';

import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { getProducts, Menu, parseProducts, type Product } from './menu';

const products: Product[] = [
  {
    id: '1',
    name: 'Cà phê sữa đá',
    price: 29000,
    category: 'Cà phê',
    imageUrl: '/broken.jpg',
  },
  {
    id: '2',
    name: 'Trà đào',
    price: 39000,
    category: 'Trà',
  },
];

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_MENU_DATA_SOURCE', 'demo');
  vi.stubEnv('NEXT_PUBLIC_PRODUCT_DETAIL_ENABLED', 'false');
});

it('hiển thị loading rồi hiển thị sản phẩm', async () => {
  let finish!: (value: Product[]) => void;

  const pending = new Promise<Product[]>((resolve) => {
    finish = resolve;
  });

  render(<Menu loader={() => pending} />);

  expect(
    screen.getByRole('status', { name: 'Đang tải menu' }),
  ).toBeInTheDocument();

  finish(products);

  expect(
    await screen.findByRole('heading', { name: 'Cà phê sữa đá' }),
  ).toBeInTheDocument();

  expect(screen.getByText(/29.000/)).toBeInTheDocument();

  expect(
    screen.queryByRole('status', { name: 'Đang tải menu' }),
  ).not.toBeInTheDocument();
});

it('phân biệt menu trống và API lỗi', async () => {
  render(<Menu loader={async () => []} />);

  expect(
    await screen.findByRole('heading', {
      name: 'Menu đang được cập nhật',
    }),
  ).toBeInTheDocument();

  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('thử lại sau lỗi mà không reload toàn trang', async () => {
  const user = userEvent.setup();

  const loader = vi
    .fn()
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce(products);

  render(<Menu loader={loader} />);

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Chưa thể tải menu',
  );

  await user.click(screen.getByRole('button', { name: 'Thử lại' }));

  expect(
    await screen.findByRole('heading', { name: 'Trà đào' }),
  ).toBeInTheDocument();

  expect(loader).toHaveBeenCalledTimes(2);
});

it('tìm không dấu, lọc danh mục và xóa bộ lọc', async () => {
  const user = userEvent.setup();

  render(<Menu loader={async () => products} />);

  await screen.findByRole('heading', { name: 'Trà đào' });

  await user.type(screen.getByRole('searchbox'), 'ca phe');

  expect(
    screen.queryByRole('heading', { name: 'Trà đào' }),
  ).not.toBeInTheDocument();

  await user.clear(screen.getByRole('searchbox'));

  await user.click(screen.getByRole('button', { name: 'Trà' }));

  expect(
    screen.queryByRole('heading', { name: 'Cà phê sữa đá' }),
  ).not.toBeInTheDocument();

  await user.type(screen.getByRole('searchbox'), 'khong co');

  expect(
    screen.getByRole('heading', {
      name: 'Chưa tìm thấy món phù hợp',
    }),
  ).toBeInTheDocument();

  await user.click(
    screen.getByRole('button', { name: 'Xóa bộ lọc' }),
  );

  expect(
    screen.getByRole('heading', { name: 'Cà phê sữa đá' }),
  ).toBeInTheDocument();
});

it('thay ảnh lỗi bằng minh họa', async () => {
  render(<Menu loader={async () => products} />);

  fireEvent.error(
    await screen.findByRole('img', { name: 'Cà phê sữa đá' }),
  );

  expect(
    screen.queryByRole('img', { name: 'Cà phê sữa đá' }),
  ).not.toBeInTheDocument();
});

it('chỉ bật link chi tiết khi dùng API thật và cờ chi tiết được bật', async () => {
  vi.stubEnv('NEXT_PUBLIC_MENU_DATA_SOURCE', 'api');
  vi.stubEnv('NEXT_PUBLIC_PRODUCT_DETAIL_ENABLED', 'true');

  render(<Menu loader={async () => products} />);

  expect(
    await screen.findByRole('link', {
      name: 'Chọn món Cà phê sữa đá',
    }),
  ).toHaveAttribute('href', '/products/1');

  expect(screen.queryByText('BẢN DEMO')).not.toBeInTheDocument();
});

it('không mở link sản phẩm demo', async () => {
  vi.stubEnv('NEXT_PUBLIC_PRODUCT_DETAIL_ENABLED', 'true');

  render(<Menu loader={async () => products} />);

  await screen.findByRole('heading', { name: 'Trà đào' });

  expect(
    screen.queryByRole('link', { name: 'Chọn món Trà đào' }),
  ).not.toBeInTheDocument();

  expect(
    screen.getAllByRole('button', { name: 'Chi tiết sắp có' })[0],
  ).toBeDisabled();
});

it('hủy request khi rời trang', async () => {
  let signal: AbortSignal | undefined;

  const { unmount } = render(
    <Menu
      loader={(value) => {
        signal = value;
        return new Promise(() => {});
      }}
    />,
  );

  await waitFor(() => expect(signal).toBeDefined());

  unmount();

  expect(signal?.aborted).toBe(true);
});

it('chuẩn hóa ID số thành chuỗi', () => {
  expect(
    parseProducts([{ id: 7, name: ' Trà ', price: 0 }]),
  ).toEqual([{ id: '7', name: 'Trà', price: 0 }]);
});

it.each([
  { value: { data: [] } },
  { value: [{ id: 1, name: 'A', price: '29000' }] },
  { value: [{ id: 1, name: 'A', price: -1 }] },
  { value: [{ id: 1, name: 'A', price: 1.5 }] },
  {
    value: [
      { id: 'a', name: 'A', price: 1 },
      { id: 'a', name: 'B', price: 2 },
    ],
  },
])('từ chối response sai contract %#', ({ value }) => {
  expect(() => parseProducts(value)).toThrow();
});

it('API lỗi không được tự đổi sang dữ liệu demo', async () => {
  vi.stubEnv('NEXT_PUBLIC_MENU_DATA_SOURCE', 'api');
  vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://localhost:4000/api/');

  const fetchSpy = vi.fn().mockResolvedValue({
    ok: false,
    status: 503,
  });

  vi.stubGlobal('fetch', fetchSpy);

  const signal = new AbortController().signal;

  await expect(getProducts(signal)).rejects.toThrow('503');

  expect(fetchSpy).toHaveBeenCalledWith(
    'http://localhost:4000/api/products',
    { signal, cache: 'no-store' },
  );
});

it('demo không gọi backend', async () => {
  const fetchSpy = vi.fn();

  vi.stubGlobal('fetch', fetchSpy);

  await expect(
    getProducts(new AbortController().signal),
  ).resolves.toHaveLength(4);

  expect(fetchSpy).not.toHaveBeenCalled();
});