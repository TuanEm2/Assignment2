import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useCartStore } from '@/stores/cart-store';
import { CartView } from './cart-view';

describe('CartView', () => {
  beforeEach(() => useCartStore.getState().clearCart());

  it('hiển thị giỏ trống và liên kết về menu', () => {
    render(<CartView />);

    expect(screen.getByText(/giỏ hàng của bạn đang trống/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /tiếp tục chọn món/i })).toHaveAttribute('href', '/menu');
    expect(screen.queryByRole('link', { name: 'Thanh toán' })).not.toBeInTheDocument();
  });

  it('đổi số lượng, cập nhật tạm tính và xóa món bằng store TV1', async () => {
    const user = userEvent.setup();
    useCartStore.getState().addItem({
      productId: 'americano',
      productName: 'Americano',
      basePrice: 40000,
      size: { id: 'medium', name: 'M', price: 5000 },
      toppings: [{ id: 'pearls', name: 'Trân châu', price: 5000 }],
    });
    render(<CartView />);

    expect(screen.getByText(/size m · trân châu/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Thanh toán' })).toHaveAttribute('href', '/checkout');

    await user.click(screen.getByRole('button', { name: /tăng số lượng americano/i }));
    expect(screen.getByRole('status', { name: 'Số lượng hiện tại' })).toHaveTextContent('2');
    expect(screen.getAllByText(/100\.000/)).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: /giảm số lượng americano/i }));
    expect(screen.getByRole('status', { name: 'Số lượng hiện tại' })).toHaveTextContent('1');

    await user.click(screen.getByRole('button', { name: /xóa americano khỏi giỏ/i }));
    expect(screen.getByText(/giỏ hàng của bạn đang trống/i)).toBeInTheDocument();
  });
});
