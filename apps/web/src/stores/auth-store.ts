'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

export interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: AuthUser) => void;
  logout: () => void;
}

/** Quản lý trạng thái xác thực và JWT token phía Client (Mobile-first PWA) */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      setAuth: (token, user) => {
        if (!token || typeof token !== 'string') {
          throw new Error('Token xác thực không hợp lệ');
        }
        if (!user || !user.id || !user.email) {
          throw new Error('Thông tin người dùng không đầy đủ');
        }
        set({
          token,
          user,
          isAuthenticated: true,
        });
      },
      logout: () => {
        set({
          token: null,
          user: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: 'brewlite-auth-v1',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

export const selectAuthToken = (state: AuthState) => state.token;
export const selectCurrentUser = (state: AuthState) => state.user;
export const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated;
