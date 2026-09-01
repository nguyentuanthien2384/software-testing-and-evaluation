'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AuthUser, LoginResult, Permission, userCan } from './auth';

type AuthContextValue = {
  user: AuthUser | null;
  ready: boolean;
  login: (username: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  can: (permission: Permission) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  // Khôi phục phiên từ cookie HttpOnly do máy chủ xác thực.
  useEffect(() => {
    let active = true;
    fetch('/api/auth/session', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) return null;
        const body = (await response.json()) as { user?: AuthUser };
        return body.user ?? null;
      })
      .catch(() => null)
      .then((sessionUser) => {
        if (active) {
          setUser(sessionUser);
          setReady(true);
        }
      });
    return () => { active = false; };
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<LoginResult> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const result = (await response.json()) as LoginResult;
      if (result.ok) setUser(result.user);
      return result;
    } catch {
      return { ok: false, error: 'Không thể kết nối máy chủ đăng nhập. Vui lòng thử lại.' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      /* vẫn xoá trạng thái cục bộ nếu mạng có lỗi */
    }
    setUser(null);
  }, []);

  const can = useCallback((permission: Permission) => userCan(user, permission), [user]);

  const value = useMemo<AuthContextValue>(() => ({ user, ready, login, logout, can }), [user, ready, login, logout, can]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải được dùng bên trong <AuthProvider>.');
  return ctx;
}
