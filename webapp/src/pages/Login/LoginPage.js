import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';
import { useAlert } from '@context/AlertContext';
import { useLoading } from '@context/LoadingContext';
import { useApiClient } from '@hooks/useApiClient';
import './LoginPage.css';
const INITIAL_STATE = {
    username: '',
    password: ''
};
const LoginPage = () => {
    const apiClient = useApiClient();
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();
    const { show, hide } = useAlert();
    const { withLoader } = useLoading();
    const [credentials, setCredentials] = useState(INITIAL_STATE);
    const [error, setError] = useState(null);
    const handleChange = (event) => {
        const { name, value } = event.target;
        setCredentials((prev) => ({ ...prev, [name]: value }));
    };
    const handleSubmit = async (event) => {
        event.preventDefault();
        hide();
        setError(null);
        if (!credentials.username) {
            setError('Username is required');
            return;
        }
        if (!credentials.password) {
            setError('Password is required');
            return;
        }
        try {
            const response = await withLoader(() => apiClient.login(credentials));
            if (response.status && response.data) {
                login(response.data);
                show('success', 'Welcome back!');
                const target = location.state?.from ?? '/portfolio/list';
                navigate(target, { replace: true });
            }
            else {
                const message = response.errorMessage ?? response.localizedMessage ?? 'Unable to login';
                setError(message);
                show('danger', message);
            }
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Unexpected authentication error';
            setError(message);
            show('danger', message);
        }
    };
    return (_jsxs("div", { className: "login-page", children: [_jsxs("div", { className: "login-card", children: [_jsxs("header", { children: [_jsx("h1", { children: "Strategic Analysis" }), _jsx("p", { children: "Sign in to customise, backtest, and manage your trading strategies." })] }), _jsxs("form", { onSubmit: handleSubmit, className: "login-form", children: [_jsxs("label", { children: [_jsx("span", { children: "Username" }), _jsx("input", { type: "text", name: "username", value: credentials.username, onChange: handleChange, autoComplete: "username" })] }), _jsxs("label", { children: [_jsx("span", { children: "Password" }), _jsx("input", { type: "password", name: "password", value: credentials.password, onChange: handleChange, autoComplete: "current-password" })] }), error && _jsx("p", { className: "login-error", children: error }), _jsx("button", { type: "submit", className: "login-submit", children: "Sign In" })] }), _jsx("footer", { children: _jsxs("small", { children: ["\u00A9 ", new Date().getFullYear(), " Strategic Analysis Platform"] }) })] }), _jsxs("div", { className: "login-hero", children: [_jsx("h2", { children: "Bring discipline to your strategies" }), _jsxs("ul", { children: [_jsx("li", { children: "Blueprint portfolios with multi-leg strategies." }), _jsx("li", { children: "Run fast backtests with VWAP, ORB, and indicator filters." }), _jsx("li", { children: "Share runs with teammates and export ready-to-trade playbooks." })] })] })] }));
};
export default LoginPage;
