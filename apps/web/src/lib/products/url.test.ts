import { expect, it, vi } from 'vitest';
import { getProductsUrl } from './url';

it.each([
  'http://localhost:4000',
  'http://localhost:4000/',
  'http://localhost:4000/api',
  'http://localhost:4000/api/',
  '  http://localhost:4000/api/  ',
])('chuẩn hóa %s thành URL Products API', (base) => {
  vi.stubEnv('NEXT_PUBLIC_API_URL', base);

  expect(getProductsUrl()).toBe(
    'http://localhost:4000/api/products',
  );
});

it('dùng API local mặc định khi cấu hình rỗng', () => {
  vi.stubEnv('NEXT_PUBLIC_API_URL', '');

  expect(getProductsUrl()).toBe(
    'http://localhost:4000/api/products',
  );
});

it('mã hóa ID thành một thành phần đường dẫn', () => {
  vi.stubEnv(
    'NEXT_PUBLIC_API_URL',
    'https://example.test/api/',
  );

  expect(getProductsUrl('a/b ?')).toBe(
    'https://example.test/api/products/a%2Fb%20%3F',
  );
});