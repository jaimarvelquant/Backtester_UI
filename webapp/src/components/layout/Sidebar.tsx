import React from 'react';
import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/portfolio/list', label: 'Portfolio', icon: '🧺' },
  { to: '/backtesting/list', label: 'Backtesting', icon: '📈' },
  { to: '/backtesting/configure', label: 'Configure BT', icon: '⚙️' },
  { to: '/trading-view/list', label: 'Trading View', icon: '🧭' },
  { to: '/backtesting-tradingview/list', label: 'TV Backtesting', icon: '🛰️' },
  { to: '/master-data', label: 'Master Data', icon: '🗂️' },
  { to: '/user', label: 'Users', icon: '👤' }
];

export const Sidebar: React.FC = () => (
  <aside className="app-sidebar">
    <div className="app-sidebar__brand">
      <span className="app-sidebar__logo">⚙️</span>
      <span className="app-sidebar__title">Strategy Suite</span>
    </div>
    <nav className="app-sidebar__nav">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `app-sidebar__link ${isActive ? 'is-active' : ''}`}
        >
          <span className="app-sidebar__icon" aria-hidden>{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  </aside>
);
