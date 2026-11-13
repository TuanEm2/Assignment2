import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/stores/auth-store';
import { RegisterForm } from './register-form';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({
    get: (key: string) => (key === 'redirect' ? '/cart' : null),
  }),
}));

describe('RegisterForm (Component Test TV6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().logout();
  });

  it('hiển thị đầy đủ form đăng ký', () => {
    render(<RegisterForm />);
    expect(screen.getByRole('heading', { name: /đăng ký tài khoản/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/họ và tên/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^mật khẩu/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/xác nhận mật khẩu/i)).toBeInTheDocument();
  });

  it('báo lỗi khi mật khẩu xác nhận không khớp', async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);

    await user.type(screen.getByLabelText(/email/i), 'new@brewlite.vn');
    await user.type(screen.getByLabelText(/^mật khẩu/i), 'BrewLitePassword123');
    await user.type(screen.getByLabelText(/xác nhận mật khẩu/i), 'BrewLitePassword999');
    await user.click(screen.getByRole('button', { name: /đăng ký ngay/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/không khớp/i);
  });

  it('đăng ký thành công, tự động lưu auth và chuyển hướng', async () => {
    const user = userEvent.setup();
    const mockRegister = vi.fn().mockResolvedValue({
      accessToken: 'reg-jwt-token-xyz',
      user: { id: 'u-reg', email: 'reg@brewlite.vn', name: 'Le Thi B' },
    });

    render(<RegisterForm onRegister={mockRegister} />);

    await user.type(screen.getByLabelText(/họ và tên/i), 'Le Thi B');
    await user.type(screen.getByLabelText(/email/i), 'reg@brewlite.vn');
    await user.type(screen.getByLabelText(/^mật khẩu/i), 'BrewLite@2026Secure');
    await user.type(screen.getByLabelText(/xác nhận mật khẩu/i), 'BrewLite@2026Secure');
    await user.click(screen.getByRole('button', { name: /đăng ký ngay/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        name: 'Le Thi B',
        email: 'reg@brewlite.vn',
        password: 'BrewLite@2026Secure',
      });
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(mockPush).toHaveBeenCalledWith('/cart');
    });
  });
});
