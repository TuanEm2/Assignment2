'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import './login.css';

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn?: number;
  user: {
    id: string;
    email: string;
    name?: string;
    role?: string;
  };
}

export type LoginHandler = (credentials: { email: string; password: string }) => Promise<LoginResponse>;

async function defaultLoginHandler(credentials: { email: string; password: string }): Promise<LoginResponse> {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  const base = (configured || 'http://localhost:4000').replace(/\/+$/, '');
  const prefix = base.endsWith('/api') ? base : `${base}/api`;

  const res = await fetch(`${prefix}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    let msg = 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.';
    if (res.status === 401) {
      msg = 'Email hoặc mật khẩu không chính xác.';
    } else if (Array.isArray(errorData.message)) {
      msg = errorData.message.join(', ');
    } else if (typeof errorData.message === 'string') {
      msg = errorData.message;
    }
    throw new Error(msg);
  }

  return res.json();
}

export function LoginForm({ onLogin = defaultLoginHandler }: { onLogin?: LoginHandler }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/menu';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    setLoading(true);
    try {
      const data = await onLogin({ email: email.trim(), password });
      setAuth(data.accessToken, data.user);
      router.push(redirectPath);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi hệ thống khi đăng nhập.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1 className="auth-title">Đăng nhập BrewLite</h1>
        <p className="auth-subtitle">Thưởng thức đồ uống yêu thích của bạn</p>

        {error && <div role="alert" className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ban@example.com"
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Mật khẩu</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              required
            />
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Đang xác thực...' : 'Đăng nhập'}
          </button>
        </form>

        <div className="auth-footer">
          Chưa có tài khoản?{' '}
          <Link href={`/register${redirectPath !== '/menu' ? `?redirect=${encodeURIComponent(redirectPath)}` : ''}`} className="auth-link">
            Đăng ký ngay
          </Link>
        </div>
      </div>
    </div>
  );
}
