import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { AppHeader } from './Header';
import { AppFooter } from './Footer';

import './layout.css';

export const AppLayout: React.FC = () => {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-shell__main">
        <AppHeader />
        <main className="app-shell__content">
          <Outlet />
        </main>
        <AppFooter />
      </div>
    </div>
  );
};
