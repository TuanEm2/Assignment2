import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/stores/auth-store';
import { OrdersView, type OrderSummary } from './orders-view';

describe('OrdersView (Component Test TV6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().logout();
  });

  it('yêu cầu đăng nhập khi chưa đăng nhập', () => {
    render(<OrdersView />);
    expect(screen.getByText(/vui lòng đăng nhập để xem lịch sử/i)).toBeInTheDocument();
  });

  it('hiển thị danh sách đơn khi đã đăng nhập', async () => {
    useAuthStore.getState().setAuth('mock-token', {
      id: 'u-1',
      email: 'customer@brewlite.vn',
    });

    const mockOrders: OrderSummary[] = [
      {
        id: 'ord-1111-2222',
        total: 95000,
        status: 'PAID',
        createdAt: '2026-11-13T10:00:00Z',
      },
    ];

    const mockLoader = vi.fn().mockResolvedValue(mockOrders);

    render(<OrdersView loader={mockLoader} />);

    await waitFor(() => {
      expect(screen.getByText(/mã đơn: #ord-1111/i)).toBeInTheDocument();
      expect(screen.getByText(/đã thanh toán/i)).toBeInTheDocument();
      expect(screen.getByText(/95\.000/i)).toBeInTheDocument();
    });
  });

  it('hiển thị thông báo khi chưa có đơn nào', async () => {
    useAuthStore.getState().setAuth('mock-token', {
      id: 'u-1',
      email: 'customer@brewlite.vn',
    });

    const mockLoader = vi.fn().mockResolvedValue([]);
    render(<OrdersView loader={mockLoader} />);

    await waitFor(() => {
      expect(screen.getByText(/bạn chưa có đơn hàng nào/i)).toBeInTheDocument();
    });
  });
});
