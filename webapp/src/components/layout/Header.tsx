import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';

function deriveTitle(pathname: string): string {
  const mapping: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/portfolio': 'Portfolio',
    '/portfolio/list': 'Portfolio',
    '/trading-view': 'Trading View',
    '/backtesting': 'Backtesting',
    '/backtesting/result': 'Backtesting Result',
    '/master-data': 'Master Data Management',
    '/user': 'User Management',
    '/backtesting-tradingview': 'Backtesting Trading View'
  };
  const exactMatch = mapping[pathname];
  if (exactMatch) return exactMatch;
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return 'Dashboard';
  return segments.map((segment) => segment.replace(/-/g, ' ')).join(' › ');
}

export const AppHeader: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const title = deriveTitle(location.pathname);

  return (
    <header className="app-header">
      <div>
        <h1>{title}</h1>
        <p className="app-header__subtitle">Strategic Analysis Platform</p>
      </div>
      <div className="app-header__user">
        <div className="app-header__user-meta">
          <span className="app-header__user-name">{user?.displayName ?? 'Guest'}</span>
          <small className="app-header__user-role">{user?.username}</small>
        </div>
        <button type="button" onClick={logout} className="app-header__logout">
          Logout
        </button>
      </div>
    </header>
  );
};
