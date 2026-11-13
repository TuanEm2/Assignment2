import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/stores/auth-store';
import { useCartStore } from '@/stores/cart-store';
import { CheckoutScreen } from './checkout-screen';
import { CheckoutView } from './checkout-view';

const item = {
  id: 'americano-s',
  productId: 'americano',
  productName: 'Americano',
  basePrice: 40000,
  size: { id: 'small', name: 'S', price: 0 },
  toppings: [],
  quantity: 1,
};

describe('Checkout UI', () => {
  afterEach(() => {
    useAuthStore.getState().logout();
    useCartStore.getState().clearCart();
    vi.unstubAllGlobals();
  });

  it('đưa khách chưa đăng nhập đến trang đăng nhập có đường quay lại', () => {
    useCartStore.getState().addItem(item);
    render(<CheckoutScreen />);

    expect(screen.getByRole('link', { name: 'Đăng nhập' }))
      .toHaveAttribute('href', '/login?redirect=/checkout');
    expect(screen.queryByRole('button', { name: /xác nhận thanh toán/i })).not.toBeInTheDocument();
  });

  it('gửi lựa chọn thẻ cho luồng điều phối', async () => {
    const user = userEvent.setup();
    const onPay = vi.fn();
    render(<CheckoutView items={[item]} subtotal={40000} state={{ phase: 'review' }} onPay={onPay} />);

    await user.click(screen.getByRole('radio', { name: 'Thẻ mô phỏng' }));
    await user.click(screen.getByRole('button', { name: 'Xác nhận thanh toán' }));

    expect(onPay).toHaveBeenCalledExactlyOnceWith('MOCK_CARD');
  });

  it('khóa thao tác khi đang xử lý và ưu tiên tổng của đơn', () => {
    render(<CheckoutView items={[item]} subtotal={40000} state={{ phase: 'processing', orderTotal: 45000 }} onPay={vi.fn()} />);

    expect(screen.getByRole('button', { name: /đang xử lý/i })).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'Ví điện tử mô phỏng' })).toBeDisabled();
    expect(screen.getByText(/tổng tiền đơn 45\.000/i)).toBeInTheDocument();
  });

  it('cho thử lại sau thất bại đã xác định và vẫn hiển thị món', async () => {
    const user = userEvent.setup();
    const onPay = vi.fn();
    render(<CheckoutView items={[item]} subtotal={40000} state={{ phase: 'failed' }} onPay={onPay} />);

    expect(screen.getByRole('alert')).toHaveTextContent(/thanh toán thất bại/i);
    expect(screen.getByText(/americano · size s/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(onPay).toHaveBeenCalledExactlyOnceWith('MOCK_WALLET');
  });

  it('chỉ cho kiểm tra trạng thái khi chưa biết kết quả', async () => {
    const user = userEvent.setup();
    const onPay = vi.fn();
    const onCheckStatus = vi.fn();
    render(
      <CheckoutView items={[item]} subtotal={40000} state={{ phase: 'unknown' }} onPay={onPay} onCheckStatus={onCheckStatus} />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(/chưa xác nhận được kết quả/i);
    expect(screen.getByRole('radio', { name: 'Thẻ mô phỏng' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Kiểm tra trạng thái' }));
    expect(onCheckStatus).toHaveBeenCalledOnce();
    expect(onPay).not.toHaveBeenCalled();
  });

  it('hiển thị mã đơn và số tiền đã xác nhận sau khi giỏ được xóa', () => {
    render(<CheckoutView items={[]} subtotal={0} state={{ phase: 'paid', orderId: 'order-123', orderTotal: 40000 }} />);

    expect(screen.getByRole('heading', { name: 'Thanh toán thành công' })).toBeInTheDocument();
    expect(screen.getByText('Mã đơn order-123')).toBeInTheDocument();
    expect(screen.getByText(/đã thanh toán 40\.000/i)).toBeInTheDocument();
  });

  it('khóa gửi đơn và kiểm tra trạng thái trong lúc chờ, sau đó hiển thị số tiền API xác nhận', async () => {
    const user = userEvent.setup();
    let completeOrder!: (response: Response) => void;
    let completeStatus!: (response: Response) => void;
    const orderResponse = new Promise<Response>((resolve) => { completeOrder = resolve; });
    const statusResponse = new Promise<Response>((resolve) => { completeStatus = resolve; });
    const fetchMock = vi.fn()
      .mockReturnValueOnce(orderResponse)
      .mockResolvedValueOnce(new Response(null, { status: 502 }))
      .mockReturnValueOnce(statusResponse);
    vi.stubGlobal('fetch', fetchMock);
    useAuthStore.getState().setAuth('test-token', { id: 'customer-1', email: 'customer@example.invalid' });
    useCartStore.getState().addItem(item);
    render(<CheckoutScreen />);

    expect(screen.getByText(/tạm tính 40\.000/i)).toBeInTheDocument();
    const form = screen.getByRole('button', { name: 'Xác nhận thanh toán' }).closest('form')!;
    act(() => {
      fireEvent.submit(form);
      fireEvent.submit(form);
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Đang xử lý…' })).toBeDisabled();

    completeOrder(Response.json({ id: 'order-123', total: 45000, status: 'PENDING' }));
    const check = await screen.findByRole('button', { name: 'Kiểm tra trạng thái' });
    expect(useCartStore.getState().items).toHaveLength(1);
    // The order already exists even if the local cart is cleared.
    act(() => useCartStore.getState().clearCart());
    expect(check).toBeInTheDocument();
    await user.click(check);
    const checking = screen.getByRole('button', { name: 'Đang kiểm tra…' });
    expect(checking).toBeDisabled();
    await user.click(checking);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    completeStatus(Response.json({ success: true, status: 'PAID', amount: 45000 }));
    expect(await screen.findByRole('heading', { name: 'Thanh toán thành công' })).toBeInTheDocument();
    expect(screen.getByText(/đã thanh toán 45\.000/i)).toBeInTheDocument();
    expect(useCartStore.getState().items).toHaveLength(0);
  });
});
