import { render, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/stores/auth-store';
import { useCartStore } from '@/stores/cart-store';
import { CheckoutScreen } from './checkout-screen';
import PayosCheckoutPage from './payos/page';

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
const router = { replace };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

beforeEach(() => {
  useAuthStore.getState().logout();
  useCartStore.getState().clearCart();
});

it.each([
  [CheckoutScreen, '/login?redirect=/checkout'],
  [PayosCheckoutPage, '/login?redirect=/checkout/payos'],
] as const)('chuyển khách chưa đăng nhập và giữ trang quay lại', async (Screen, destination) => {
  render(<Screen />);
  await waitFor(() => expect(replace).toHaveBeenCalledWith(destination));
});

it.each([CheckoutScreen, PayosCheckoutPage])('giữ người đã đăng nhập ở trang thanh toán', (Screen) => {
  useAuthStore.getState().setAuth('test-token', { id: 'customer-1', email: 'customer@example.test' });
  render(<Screen />);
  expect(replace).not.toHaveBeenCalled();
});
