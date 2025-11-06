import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { LoginResponseData, User } from '@types/api';

type AuthContextValue = {
  user: LoginResponseData | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (data: LoginResponseData) => void;
  logout: () => void;
  updateUser: (updater: (current: LoginResponseData | null) => LoginResponseData | null) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = 'AuthToken';
const USER_KEY = 'UserData';

function readToken(): string | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('Failed to read auth token from storage', error);
    return null;
  }
}

function readUser(): LoginResponseData | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as LoginResponseData) : null;
  } catch (error) {
    console.warn('Failed to read user from storage', error);
    return null;
  }
}

function persist(key: string, value: unknown) {
  if (value === null || value === undefined) {
    localStorage.removeItem(key);
    return;
  }
  localStorage.setItem(key, JSON.stringify(value));
}

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => readToken());
  const [user, setUser] = useState<LoginResponseData | null>(() => readUser());

  useEffect(() => {
    persist(TOKEN_KEY, token);
  }, [token]);

  useEffect(() => {
    persist(USER_KEY, user);
  }, [user]);

  const login = useCallback((data: LoginResponseData) => {
    setUser(data);
    setToken(data.authToken);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }, []);

  const updateUser = useCallback((updater: (current: LoginResponseData | null) => LoginResponseData | null) => {
    setUser((current) => updater(current));
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    isAuthenticated: Boolean(token),
    login,
    logout,
    updateUser
  }), [login, logout, token, updateUser, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useLoggedUser(): User | null {
  const { user } = useAuth();
  return user;
}
