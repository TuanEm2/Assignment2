import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from './auth-store';

describe('useAuthStore (Zustand Auth Store TV6)', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
  });

  it('khởi tạo với trạng thái chưa đăng nhập', () => {
    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('lưu token và user khi setAuth thành công', () => {
    const mockUser = {
      id: 'u-01',
      email: 'customer@brewlite.vn',
      name: 'Nguyen Van A',
      role: 'CUSTOMER',
    };
    useAuthStore.getState().setAuth('mock-jwt-token-xyz', mockUser);

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.token).toBe('mock-jwt-token-xyz');
    expect(state.user?.email).toBe('customer@brewlite.vn');
  });

  it('xóa sạch token và trạng thái khi logout', () => {
    useAuthStore.getState().setAuth('mock-token', {
      id: 'u-02',
      email: 'test@brewlite.vn',
    });
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    useAuthStore.getState().logout();
    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('chặn token hoặc user không hợp lệ', () => {
    expect(() => {
      (useAuthStore.getState().setAuth as unknown as (t: string, u: unknown) => void)('', { id: '1', email: 'a@b.com' });
    }).toThrow('Token xác thực không hợp lệ');

    expect(() => {
      (useAuthStore.getState().setAuth as unknown as (t: string, u: unknown) => void)('token', { id: '' });
    }).toThrow('Thông tin người dùng không đầy đủ');
  });
});
