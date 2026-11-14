'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import '../login/login.css';

export interface RegisterResponse {
  accessToken?: string;
  user: {
    id: string;
    email: string;
    name?: string;
    role?: string;
  };
}

export type RegisterHandler = (payload: { email: string; password: string; name?: string }) => Promise<RegisterResponse>;

async function defaultRegisterHandler(payload: { email: string; password: string; name?: string }): Promise<RegisterResponse> {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  const base = (configured || 'http://localhost:4000').replace(/\/+$/, '');
  const prefix = base.endsWith('/api') ? base : `${base}/api`;

  const res = await fetch(`${prefix}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    let msg = 'Đăng ký không thành công. Vui lòng kiểm tra lại thông tin.';
    if (res.status === 409) {
      msg = 'Email này đã được sử dụng. Vui lòng dùng email khác hoặc đăng nhập.';
    } else if (Array.isArray(errorData.message)) {
      msg = errorData.message.join(', ');
    } else if (typeof errorData.message === 'string') {
      msg = errorData.message;
    }
    throw new Error(msg);
  }

  return res.json();
}

export function RegisterForm({ onRegister = defaultRegisterHandler }: { onRegister?: RegisterHandler }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/menu';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password || !confirmPassword) {
      setError('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }

    if (password.length < 12) {
      setError('Mật khẩu phải có tối thiểu 12 ký tự theo chính sách bảo mật.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);
    try {
      const data = await onRegister({ email: email.trim(), password, name: name.trim() || undefined });
      if (data.accessToken && data.user) {
        setAuth(data.accessToken, data.user);
        router.push(redirectPath);
      } else {
        router.push(`/login?registered=1${redirectPath !== '/menu' ? `&redirect=${encodeURIComponent(redirectPath)}` : ''}`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi hệ thống khi đăng ký tài khoản.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1 className="auth-title">Đăng ký tài khoản</h1>
        <p className="auth-subtitle">Trở thành thành viên BrewLite để nhận nhiều ưu đãi</p>

        {error && <div role="alert" className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="form-group">
            <label htmlFor="name">Họ và tên</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nguyễn Văn A"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="reg-email">Email</label>
            <input
              id="reg-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ban@example.com"
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="reg-password">Mật khẩu</label>
            <input
              id="reg-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tối thiểu 12 ký tự"
              maxLength={128}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Xác nhận mật khẩu</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu"
              disabled={loading}
              required
            />
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Đang tạo tài khoản...' : 'Đăng ký ngay'}
          </button>
        </form>

        <div className="auth-footer">
          Đã có tài khoản?{' '}
          <Link href={`/login${redirectPath !== '/menu' ? `?redirect=${encodeURIComponent(redirectPath)}` : ''}`} className="auth-link">
            Đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}
