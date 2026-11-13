import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/stores/auth-store';
import { useCartStore } from '@/stores/cart-store';
import { useCheckoutOrchestrator } from './use-checkout-orchestrator';

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
});
