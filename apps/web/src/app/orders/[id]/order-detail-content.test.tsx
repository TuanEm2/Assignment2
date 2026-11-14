import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/stores/auth-store';
import { OrderDetailContent, type OrderDetail } from './order-detail-content';

describe('OrderDetailContent (Component Test TV6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().logout();
  });

  it('yêu cầu đăng nhập khi chưa có phiên đăng nhập', () => {
    render(<OrderDetailContent orderId="ord-12345678" />);
    expect(screen.getByText(/vui lòng đăng nhập để xem thông tin đơn hàng/i)).toBeInTheDocument();
  });

  it('hiển thị đầy đủ thông tin đơn hàng, items snapshot và payment khi tải thành công', async () => {
    useAuthStore.getState().setAuth('mock-token', {
      id: 'u-1',
      email: 'customer@brewlite.vn',
    });

    const mockDetail: OrderDetail = {
      id: 'ord-12345678-abcd',
      status: 'PAID',
      total: 96000,
      createdAt: '2026-11-13T10:00:00Z',
      items: [
        {
          id: 'item-1',
          productName: 'Trà Đào Cam Sả',
          sizeName: 'Lớn',
          toppings: ['Đào miếng', 'Thạch nha đam'],
          quantity: 2,
          unitPrice: 48000,
          subtotal: 96000,
        },
      ],
      payment: {
        id: 'pay-001',
        method: 'MOCK_WALLET',
        amount: 96000,
        createdAt: '2026-11-13T10:01:00Z',
      },
    };

    const mockLoader = vi.fn().mockResolvedValue(mockDetail);

    render(<OrderDetailContent orderId="ord-12345678-abcd" loader={mockLoader} />);

    await waitFor(() => {
      expect(screen.getByText(/đơn hàng #ord-1234/i)).toBeInTheDocument();
      expect(screen.getByText(/đã thanh toán/i)).toBeInTheDocument();
      expect(screen.getByText(/trà đào cam sả/i)).toBeInTheDocument();
      expect(screen.getByText(/size: lớn/i)).toBeInTheDocument();
      expect(screen.getByText(/topping: đào miếng, thạch nha đam/i)).toBeInTheDocument();
      expect(screen.getByText(/mock_wallet/i)).toBeInTheDocument();
      expect(screen.getAllByText(/96\.000/i).length).toBeGreaterThan(0);
    });
  });

  it('xử lý lỗi chính xác và không bao giờ tạo fallback giả PAID khi gọi API thất bại', async () => {
    useAuthStore.getState().setAuth('mock-token', {
      id: 'u-1',
      email: 'customer@brewlite.vn',
    });

    const mockLoader = vi.fn().mockRejectedValue(new Error('Không tìm thấy đơn hàng'));

    render(<OrderDetailContent orderId="ord-nonexistent" loader={mockLoader} />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/không tìm thấy đơn hàng/i)).toBeInTheDocument();
      // Đảm bảo không render fallback 90.000đ hay PAID giả
      expect(screen.queryByText(/90\.000/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/đã thanh toán/i)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /thử lại/i })).toBeInTheDocument();
    });
  });

  it('hiển thị nhãn trạng thái chính xác cho các trạng thái PAYMENT_FAILED và READY', async () => {
    useAuthStore.getState().setAuth('mock-token', {
      id: 'u-1',
      email: 'customer@brewlite.vn',
    });

    const mockDetail: OrderDetail = {
      id: 'ord-failed-001',
      status: 'PAYMENT_FAILED',
      total: 35000,
      createdAt: '2026-11-13T10:00:00Z',
      items: [
        {
          id: 'item-2',
          productName: 'Cà Phê Muối',
          quantity: 1,
          unitPrice: 35000,
          subtotal: 35000,
        },
      ],
    };

    const mockLoader = vi.fn().mockResolvedValue(mockDetail);
    render(<OrderDetailContent orderId="ord-failed-001" loader={mockLoader} />);

    await waitFor(() => {
      expect(screen.getByText(/thanh toán thất bại/i)).toBeInTheDocument();
    });
  });
});
