import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/stores/auth-store';
import { useCartStore } from '@/stores/cart-store';
import { PaymentStatusUnknownError, useCheckoutOrchestrator } from './use-checkout-orchestrator';

describe('useCheckoutOrchestrator (Checkout Orchestration TV6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().logout();
    useCartStore.getState().clearCart();
  });

  const mockItem = {
    id: 'line-1',
    productId: 'prod-01',
    productName: 'Cà phê sữa',
    basePrice: 35000,
    size: { id: 'M', name: 'M', price: 5000 },
    toppings: [{ id: 'top-1', name: 'Trân châu', price: 5000 }],
    quantity: 2,
  };

  it('khởi tạo ở phase review', () => {
    const { result } = renderHook(() => useCheckoutOrchestrator());
    expect(result.current.state.phase).toBe('review');
  });

  it('điều phối thành công: tạo đơn -> thanh toán -> xóa giỏ hàng -> phase paid', async () => {
    useAuthStore.getState().setAuth('mock-token-xyz', {
      id: 'u-01',
      email: 'customer@brewlite.vn',
    });
    useCartStore.getState().addItem(mockItem);

    const mockOrderSubmitter = vi.fn().mockResolvedValue({
      id: 'ord-12345',
      total: 90000,
      status: 'PENDING',
    });
    const mockPaymentProcessor = vi.fn().mockResolvedValue({
      success: true,
      transactionId: 'txn-789',
    });

    const { result } = renderHook(() =>
      useCheckoutOrchestrator({
        orderSubmitter: mockOrderSubmitter,
        paymentProcessor: mockPaymentProcessor,
      }),
    );

    await act(async () => {
      await result.current.handlePay([mockItem], 90000, 'MOCK_WALLET');
    });

    expect(mockOrderSubmitter).toHaveBeenCalled();
    expect(mockPaymentProcessor).toHaveBeenCalledWith(
      'ord-12345',
      90000,
      'MOCK_WALLET',
      expect.stringContaining('pay-idem-'),
      'SUCCESS',
    );
    expect(result.current.state.phase).toBe('paid');
    if (result.current.state.phase === 'paid') {
      expect(result.current.state.orderId).toBe('ord-12345');
      expect(result.current.state.orderTotal).toBe(90000);
    }
    expect(useCartStore.getState().items.length).toBe(0);
  });

  it('xử lý khi tạo đơn hoặc thanh toán thất bại: giữ giỏ hàng và chuyển phase failed', async () => {
    useAuthStore.getState().setAuth('mock-token-xyz', {
      id: 'u-01',
      email: 'customer@brewlite.vn',
    });
    useCartStore.getState().addItem(mockItem);

    const mockOrderSubmitter = vi.fn().mockRejectedValue(new Error('Hết hàng'));
    const { result } = renderHook(() =>
      useCheckoutOrchestrator({
        orderSubmitter: mockOrderSubmitter,
      }),
    );

    await act(async () => {
      await result.current.handlePay([mockItem], 90000, 'MOCK_CARD');
    });

    expect(result.current.state.phase).toBe('failed');
    expect(useCartStore.getState().items.length).toBe(1);
  });
  it('retry after failed order request reuses the same order idempotency key', async () => {
    useAuthStore.getState().setAuth('mock-token-xyz', { id: 'u-01', email: 'customer@brewlite.vn' });
    const create = vi.fn().mockRejectedValueOnce(new Error('Temporary error')).mockResolvedValueOnce({
      id: 'ord-12345', total: 90000, status: 'PENDING',
    });
    const payment = vi.fn().mockResolvedValue({ success: true });
    const { result } = renderHook(() => useCheckoutOrchestrator({
      orderSubmitter: create, paymentProcessor: payment,
    }));

    await act(async () => { await result.current.handlePay([mockItem], 90000, 'MOCK_WALLET'); });
    await act(async () => { await result.current.handlePay([mockItem], 90000, 'MOCK_WALLET'); });

    expect(create).toHaveBeenCalledTimes(2);
    expect(create.mock.calls[0][2]).toBe(create.mock.calls[1][2]);
    expect(result.current.state.phase).toBe('paid');
  });

  it('uncertain payment does not mark PAID without checking backend status', async () => {
    useAuthStore.getState().setAuth('mock-token-xyz', { id: 'u-01', email: 'customer@brewlite.vn' });
    const create = vi.fn().mockResolvedValue({ id: 'ord-12345', total: 90000, status: 'PENDING' });
    const payment = vi.fn().mockRejectedValue(new PaymentStatusUnknownError('Network timeout'));
    const status = vi.fn().mockResolvedValue({ success: true, status: 'PAID', amount: 90000 });
    const { result } = renderHook(() => useCheckoutOrchestrator({
      orderSubmitter: create, paymentProcessor: payment, statusChecker: status,
    }));

    await act(async () => { await result.current.handlePay([mockItem], 90000, 'MOCK_WALLET'); });
    expect(result.current.state.phase).toBe('unknown');

    await act(async () => { await result.current.handleCheckStatus(); });
    expect(status).toHaveBeenCalledWith('ord-12345', 'mock-token-xyz');
    expect(result.current.state.phase).toBe('paid');
  });

  it('confirmed FAILURE retries the same Order with a fresh payment key', async () => {
    useAuthStore.getState().setAuth('mock-token-xyz', { id: 'u-01', email: 'customer@brewlite.vn' });
    const create = vi.fn().mockResolvedValue({ id: 'ord-12345', total: 90000, status: 'PENDING' });
    const payment = vi.fn().mockResolvedValueOnce({ success: false }).mockResolvedValueOnce({ success: true });
    const { result } = renderHook(() => useCheckoutOrchestrator({
      orderSubmitter: create, paymentProcessor: payment,
    }));

    await act(async () => { await result.current.handlePay([mockItem], 90000, 'MOCK_WALLET', 'FAILURE'); });
    expect(result.current.state.phase).toBe('failed');
    await act(async () => { await result.current.handlePay([mockItem], 90000, 'MOCK_WALLET', 'SUCCESS'); });
    expect(create.mock.calls[0][2]).toBe(create.mock.calls[1][2]);
    expect(payment.mock.calls[0][3]).not.toBe(payment.mock.calls[1][3]);
    expect(payment.mock.calls[0][4]).toBe('FAILURE');
    expect(payment.mock.calls[1][4]).toBe('SUCCESS');
    expect(result.current.state.phase).toBe('paid');
  });

});
