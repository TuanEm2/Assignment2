import { render, screen, within } from '@testing-library/react';
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

  it('khóa nút tăng ở 99 và mở lại khi giảm số lượng', async () => {
    const user = userEvent.setup();
    useCartStore.getState().addItem({
      productId: 'americano', productName: 'Americano', basePrice: 40000, quantity: 98,
    });
    render(<CartView />);
    const increase = screen.getByRole('button', { name: 'Tăng số lượng Americano' });
    const decrease = screen.getByRole('button', { name: 'Giảm số lượng Americano' });

    await user.click(increase);
    expect(increase).toBeDisabled();
    await user.click(increase);
    expect(screen.getByRole('status', { name: 'Số lượng hiện tại' })).toHaveTextContent(/^99$/);
    expect(within(screen.getByRole('complementary')).getByText(/3\.960\.000/)).toBeInTheDocument();
    await user.click(decrease);
    expect(increase).toBeEnabled();
    expect(screen.getByRole('status', { name: 'Số lượng hiện tại' })).toHaveTextContent(/^98$/);
  });

  it('cộng tiền nhiều món và nhiều topping, chỉ cập nhật dòng được tăng', async () => {
    const user = userEvent.setup();
    const add = useCartStore.getState().addItem;
    add({ productId: 'americano', productName: 'Americano', basePrice: 40000 });
    add({
      productId: 'tra-dao',
      productName: 'Trà đào',
      basePrice: 39000,
      size: { id: 'large', name: 'L', price: 10000 },
      toppings: [
        { id: 'pearls', name: 'Trân châu', price: 5000 },
        { id: 'cream', name: 'Kem', price: 10000 },
      ],
    });
    render(<CartView />);
    const [americano, tea] = screen.getAllByRole('listitem');
    const summary = within(screen.getByRole('complementary'));

    expect(within(tea).getByText(/size l · kem, trân châu/i)).toBeInTheDocument();
    expect(summary.getByText(/104\.000/)).toBeInTheDocument();

    await user.click(within(tea).getByRole('button', { name: 'Tăng số lượng Trà đào' }));

    expect(within(americano).getByRole('status', { name: 'Số lượng hiện tại' })).toHaveTextContent(/^1$/);
    expect(within(tea).getByRole('status', { name: 'Số lượng hiện tại' })).toHaveTextContent(/^2$/);
    expect(summary.getByText('3 ly')).toBeInTheDocument();
    expect(summary.getByText(/168\.000/)).toBeInTheDocument();
  });

  it('tách các dòng cùng món theo size và topping, tính lại tổng khi xóa một dòng', async () => {
    const user = userEvent.setup();
    const add = useCartStore.getState().addItem;
    const americano = { productId: 'americano', productName: 'Americano', basePrice: 40000 };
    const small = { id: 'small', name: 'S', price: 0 };
    add({ ...americano, size: small });
    add({ ...americano, size: small, toppings: [{ id: 'pearls', name: 'Trân châu', price: 5000 }] });
    add({ ...americano, size: { id: 'medium', name: 'M', price: 5000 }, quantity: 2 });
    render(<CartView />);
    const list = within(screen.getByRole('list', { name: 'Đồ uống trong giỏ' }));
    const summary = within(screen.getByRole('complementary'));
    const lines = list.getAllByRole('listitem');

    expect(lines).toHaveLength(3);
    expect(within(lines[0]).getByText(/size s · không topping/i)).toBeInTheDocument();
    expect(within(lines[1]).getByText(/size s · trân châu/i)).toBeInTheDocument();
    expect(within(lines[2]).getByText(/size m · không topping/i)).toBeInTheDocument();
    expect(within(lines[0]).getByRole('button', { name: 'Giảm số lượng Americano' })).toBeDisabled();
    expect(summary.getByText('4 ly')).toBeInTheDocument();
    expect(summary.getByText(/175\.000/)).toBeInTheDocument();

    await user.click(within(lines[1]).getByRole('button', { name: 'Xóa Americano khỏi giỏ' }));
    expect(list.getAllByRole('listitem')).toHaveLength(2);
    expect(list.queryByText(/trân châu/i)).not.toBeInTheDocument();
    expect(summary.getByText('3 ly')).toBeInTheDocument();
    expect(summary.getByText(/130\.000/)).toBeInTheDocument();
  });
});
