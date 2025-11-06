import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
const AuthContext = createContext(undefined);
const TOKEN_KEY = 'AuthToken';
const USER_KEY = 'UserData';
function readToken() {
    try {
        const raw = localStorage.getItem(TOKEN_KEY);
        return raw ? JSON.parse(raw) : null;
    }
    catch (error) {
        console.warn('Failed to read auth token from storage', error);
        return null;
    }
}
function readUser() {
    try {
        const raw = localStorage.getItem(USER_KEY);
        return raw ? JSON.parse(raw) : null;
    }
    catch (error) {
        console.warn('Failed to read user from storage', error);
        return null;
    }
}
function persist(key, value) {
    if (value === null || value === undefined) {
        localStorage.removeItem(key);
        return;
    }
    localStorage.setItem(key, JSON.stringify(value));
}
export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(() => readToken());
    const [user, setUser] = useState(() => readUser());
    useEffect(() => {
        persist(TOKEN_KEY, token);
    }, [token]);
    useEffect(() => {
        persist(USER_KEY, user);
    }, [user]);
    const login = useCallback((data) => {
        setUser(data);
        setToken(data.authToken);
    }, []);
    const logout = useCallback(() => {
        setUser(null);
        setToken(null);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    }, []);
    const updateUser = useCallback((updater) => {
        setUser((current) => updater(current));
    }, []);
    const value = useMemo(() => ({
        user,
        token,
        isAuthenticated: Boolean(token),
        login,
        logout,
        updateUser
    }), [login, logout, token, updateUser, user]);
    return _jsx(AuthContext.Provider, { value: value, children: children });
};
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
export function useLoggedUser() {
    const { user } = useAuth();
    return user;
}
