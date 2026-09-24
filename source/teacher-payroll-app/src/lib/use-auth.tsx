'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AuthUser, LoginResult, Permission, userCan } from './auth';

type AuthContextValue = {
  user: AuthUser | null;
  ready: boolean;
  login: (username: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<boolean>;
  can: (permission: Permission) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const authEpoch = useRef(0);

  // Khôi phục phiên từ cookie HttpOnly do máy chủ xác thực.
  useEffect(() => {
    let active = true;
    const requestEpoch = authEpoch.current;
    fetch('/api/auth/session', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) return null;
        const body = (await response.json()) as { user?: AuthUser };
        return body.user ?? null;
      })
      .catch(() => null)
      .then((sessionUser) => {
        if (active && authEpoch.current === requestEpoch) {
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
      const result = (await response.json()) as LoginResult | null;
      if (!result || typeof result !== 'object') {
        return { ok: false, error: 'Phản hồi đăng nhập không hợp lệ.' };
      }
      if (!response.ok) {
        return { ok: false, error: result.ok === false && typeof result.error === 'string'
          ? result.error : 'Đăng nhập không thành công. Vui lòng thử lại.' };
      }
      if (result.ok !== true && (result.ok !== false || typeof result.error !== 'string')) {
        return { ok: false, error: 'Phản hồi đăng nhập không hợp lệ.' };
      }
      if (result.ok && (
        !result.user || typeof result.user.username !== 'string' ||
        typeof result.user.displayName !== 'string' ||
        !['admin', 'tester'].includes(result.user.role)
      )) {
        return { ok: false, error: 'Phản hồi đăng nhập không hợp lệ.' };
      }
      if (result.ok) {
        authEpoch.current += 1;
        setUser(result.user);
        setReady(true);
      }
      return result;
    } catch {
      return { ok: false, error: 'Không thể kết nối máy chủ đăng nhập. Vui lòng thử lại.' };
    }
  }, []);

  const logout = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok || (await response.json() as { ok?: unknown })?.ok !== true) return false;
    } catch {
      return false;
    }
    authEpoch.current += 1;
    setUser(null);
    setReady(true);
    return true;
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
