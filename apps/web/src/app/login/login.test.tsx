import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/stores/auth-store';
import { LoginForm } from './login-form';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({
    get: (key: string) => (key === 'redirect' ? '/checkout' : null),
  }),
}));

describe('LoginForm (Component Test TV6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().logout();
  });

  it('hiển thị đầy đủ form đăng nhập', () => {
    render(<LoginForm />);
    expect(screen.getByRole('heading', { name: /đăng nhập brewlite/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mật khẩu/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /đăng nhập/i })).toBeInTheDocument();
  });

  it('báo lỗi khi để trống email hoặc mật khẩu', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const submitBtn = screen.getByRole('button', { name: /đăng nhập/i });
    await user.click(submitBtn);

    expect(screen.getByRole('alert')).toHaveTextContent(/vui lòng nhập đầy đủ/i);
  });

  it('đăng nhập thành công, lưu token vào store và chuyển hướng', async () => {
    const user = userEvent.setup();
    const mockLogin = vi.fn().mockResolvedValue({
      accessToken: 'test-jwt-token-123',
      tokenType: 'Bearer',
      user: { id: 'u1', email: 'test@brewlite.vn', name: 'Tester' },
    });

    render(<LoginForm onLogin={mockLogin} />);

    await user.type(screen.getByLabelText(/email/i), 'test@brewlite.vn');
    await user.type(screen.getByLabelText(/mật khẩu/i), 'password123');
    await user.click(screen.getByRole('button', { name: /đăng nhập/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@brewlite.vn',
        password: 'password123',
      });
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().token).toBe('test-jwt-token-123');
      expect(mockPush).toHaveBeenCalledWith('/checkout');
    });
  });

  it('xử lý và hiển thị thông báo lỗi khi API đăng nhập thất bại', async () => {
    const user = userEvent.setup();
    const mockLogin = vi.fn().mockRejectedValue(new Error('Sai mật khẩu hoặc tài khoản không tồn tại'));

    render(<LoginForm onLogin={mockLogin} />);

    await user.type(screen.getByLabelText(/email/i), 'wrong@brewlite.vn');
    await user.type(screen.getByLabelText(/mật khẩu/i), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /đăng nhập/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/sai mật khẩu/i);
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });
});
