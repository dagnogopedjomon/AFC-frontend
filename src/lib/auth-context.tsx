'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, authApi, type AuthUser } from './api';

type AuthContextType = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  logout: (opts?: { redirectTo?: string }) => void;
  clearSession: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

function getCachedUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('afc_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('afc_token') : null;
    if (!t) {
      setUser(null);
      setToken(null);
      setLoading(false);
      return;
    }
    try {
      const u = await authApi.me();
      setUser(u);
      setToken(t);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        localStorage.removeItem('afc_token');
        localStorage.removeItem('afc_user');
        setUser(null);
        setToken(null);
      } else {
        setUser(getCachedUser());
        setToken(t);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('afc_token') : null;
    if (!t) {
      setLoading(false);
      return;
    }
    setToken(t);
    authApi.me()
      .then((u) => setUser(u))
      .catch((error) => {
        if (error instanceof ApiError && error.status === 401) {
          localStorage.removeItem('afc_token');
          localStorage.removeItem('afc_user');
          setToken(null);
          setUser(null);
        } else {
          setUser(getCachedUser());
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(
    async (phone: string, password: string) => {
      const { access_token, user: u } = await authApi.login(phone, password);
      localStorage.setItem('afc_token', access_token);
      localStorage.setItem('afc_user', JSON.stringify(u));
      setToken(access_token);
      setUser(u);
      if (u.isSuspended) {
        router.push('/dashboard/regulariser');
      } else if (u.role === 'ADMIN' || u.profileCompleted) {
        router.push('/dashboard');
      } else {
        router.push('/complete-profile');
      }
    },
    [router],
  );

  const logout = useCallback((opts?: { redirectTo?: string }) => {
    localStorage.removeItem('afc_token');
    localStorage.removeItem('afc_user');
    setToken(null);
    setUser(null);
    router.push(opts?.redirectTo ?? '/login');
  }, [router]);

  const clearSession = useCallback(() => {
    localStorage.removeItem('afc_token');
    localStorage.removeItem('afc_user');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, clearSession, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
