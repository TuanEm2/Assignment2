import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

  it('hiển thị danh sách đơn khi đã đăng nhập với đủ các trạng thái và nhãn tương ứng', async () => {
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
        itemCount: 2,
      },
      {
        id: 'ord-3333-4444',
        total: 45000,
        status: 'PAYMENT_FAILED',
        createdAt: '2026-11-13T11:00:00Z',
        itemCount: 1,
      },
      {
        id: 'ord-5555-6666',
        total: 50000,
        status: 'READY',
        createdAt: '2026-11-13T12:00:00Z',
        itemCount: 1,
      },
    ];

    const mockLoader = vi.fn().mockResolvedValue(mockOrders);

    render(<OrdersView loader={mockLoader} />);

    await waitFor(() => {
      expect(screen.getByText(/mã đơn: #ord-1111/i)).toBeInTheDocument();
      expect(screen.getByText(/đã thanh toán/i)).toBeInTheDocument();
      expect(screen.getByText(/95\.000/i)).toBeInTheDocument();
      expect(screen.getByText(/mã đơn: #ord-3333/i)).toBeInTheDocument();
      expect(screen.getByText(/thanh toán thất bại/i)).toBeInTheDocument();
      expect(screen.getByText(/mã đơn: #ord-5555/i)).toBeInTheDocument();
      expect(screen.getByText(/sẵn sàng phục vụ/i)).toBeInTheDocument();
    });
  });

  it('hiển thị thông báo khi chưa có đơn nào chỉ khi API trả về rỗng thật', async () => {
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

  it('hiển thị lỗi và nút thử lại khi loader thất bại, không nhầm lẫn thành đơn rỗng', async () => {
    useAuthStore.getState().setAuth('mock-token', {
      id: 'u-1',
      email: 'customer@brewlite.vn',
    });

    const mockLoader = vi.fn().mockRejectedValue(new Error('Máy chủ gián đoạn'));
    render(<OrdersView loader={mockLoader} />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/máy chủ gián đoạn/i)).toBeInTheDocument();
      expect(screen.queryByText(/bạn chưa có đơn hàng nào/i)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /thử lại/i })).toBeInTheDocument();
    });
  });

  it('xóa danh sách đơn hàng khi đăng xuất để chống rò rỉ dữ liệu giữa các tài khoản', async () => {
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
    const { rerender } = render(<OrdersView loader={mockLoader} />);

    await waitFor(() => {
      expect(screen.getByText(/mã đơn: #ord-1111/i)).toBeInTheDocument();
    });

    // Đăng xuất
    useAuthStore.getState().logout();
    rerender(<OrdersView loader={mockLoader} />);

    await waitFor(() => {
      expect(screen.getByText(/vui lòng đăng nhập để xem lịch sử/i)).toBeInTheDocument();
      expect(screen.queryByText(/mã đơn: #ord-1111/i)).not.toBeInTheDocument();
    });
  });

  it('hỗ trợ xem thêm đơn hàng qua cursor pagination', async () => {
    useAuthStore.getState().setAuth('mock-token', {
      id: 'u-1',
      email: 'customer@brewlite.vn',
    });

    const firstPage: OrderSummary[] = [
      { id: 'page1-01', total: 50000, status: 'PAID', createdAt: '2026-11-13T10:00:00Z' },
    ];
    const secondPage: OrderSummary[] = [
      { id: 'page2-02', total: 60000, status: 'COMPLETED', createdAt: '2026-11-12T10:00:00Z' },
    ];

    const mockLoader = vi.fn().mockImplementation((_token, cursor) => {
      if (!cursor) {
        return Promise.resolve({ data: firstPage, nextCursor: 'cursor-123' });
      }
      return Promise.resolve({ data: secondPage, nextCursor: null });
    });

    render(<OrdersView loader={mockLoader} />);

    await waitFor(() => {
      expect(screen.getByText(/mã đơn: #page1-01/i)).toBeInTheDocument();
    });

    const loadMoreBtn = screen.getByRole('button', { name: /xem các đơn cũ hơn/i });
    expect(loadMoreBtn).toBeInTheDocument();

    fireEvent.click(loadMoreBtn);

    await waitFor(() => {
      expect(screen.getByText(/mã đơn: #page2-02/i)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /xem các đơn cũ hơn/i })).not.toBeInTheDocument();
    });
  });
});
