import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';
import { useAlert } from '@context/AlertContext';
import { useLoading } from '@context/LoadingContext';
import { useApiClient } from '@hooks/useApiClient';
import type { LoginCredentials, ApiResponse, LoginResponseData } from '@app-types/api';

import './LoginPage.css';

const INITIAL_STATE: LoginCredentials = {
  username: '',
  password: ''
};

const LoginPage: React.FC = () => {
  const apiClient = useApiClient();
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { show, hide } = useAlert();
  const { withLoader } = useLoading();
  const [credentials, setCredentials] = useState<LoginCredentials>(INITIAL_STATE);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
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
        login(response.data as LoginResponseData);
        show('success', 'Welcome back!');
        const target = (location.state as { from?: string } | null)?.from ?? '/portfolio/list';
        navigate(target, { replace: true });
      } else {
        const message = response.errorMessage ?? response.localizedMessage ?? 'Unable to login';
        setError(message);
        show('danger', message);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected authentication error';
      setError(message);
      show('danger', message);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <header>
          <h1>Strategic Analysis</h1>
          <p>Sign in to customise, backtest, and manage your trading strategies.</p>
        </header>
        <form onSubmit={handleSubmit} className="login-form">
          <label>
            <span>Username</span>
            <input
              type="text"
              name="username"
              value={credentials.username}
              onChange={handleChange}
              autoComplete="username"
            />
          </label>
          <label>
            <span>Password</span>
            <input
              type="password"
              name="password"
              value={credentials.password}
              onChange={handleChange}
              autoComplete="current-password"
            />
          </label>
          {error && <p className="login-error">{error}</p>}
          <button type="submit" className="login-submit">
            Sign In
          </button>
        </form>
        <footer>
          <small>© {new Date().getFullYear()} Strategic Analysis Platform</small>
        </footer>
      </div>
      <div className="login-hero">
        <h2>Bring discipline to your strategies</h2>
        <ul>
          <li>Blueprint portfolios with multi-leg strategies.</li>
          <li>Run fast backtests with VWAP, ORB, and indicator filters.</li>
          <li>Share runs with teammates and export ready-to-trade playbooks.</li>
        </ul>
      </div>
    </div>
  );
};

export default LoginPage;
