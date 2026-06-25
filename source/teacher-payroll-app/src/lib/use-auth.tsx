'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authenticate, AuthUser, LoginResult, Permission, userCan } from './auth';

const SESSION_KEY = 'n01-g11-auth-session-v1';

type AuthContextValue = {
  user: AuthUser | null;
  ready: boolean;
  login: (username: string, password: string) => LoginResult;
  logout: () => void;
  can: (permission: Permission) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  // Khôi phục phiên đăng nhập đã lưu khi tải lại trang.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SESSION_KEY);
      if (stored) setUser(JSON.parse(stored) as AuthUser);
    } catch {
      /* bỏ qua phiên hỏng */
    } finally {
      setReady(true);
    }
  }, []);

  const login = useCallback((username: string, password: string): LoginResult => {
    const result = authenticate(username, password);
    if (result.ok) {
      setUser(result.user);
      try {
        window.localStorage.setItem(SESSION_KEY, JSON.stringify(result.user));
      } catch {
        /* bỏ qua lỗi lưu cache */
      }
    }
    return result;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    try {
      window.localStorage.removeItem(SESSION_KEY);
    } catch {
      /* bỏ qua */
    }
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
