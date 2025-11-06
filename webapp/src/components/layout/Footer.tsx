import React from 'react';

export const AppFooter: React.FC = () => (
  <footer className="app-footer">
    <span>© {new Date().getFullYear()} Strategic Analysis Platform</span>
    <span className="app-footer__links">
      <a href="https://coreui.io/angular/" target="_blank" rel="noreferrer">
        Inspired by CoreUI Angular
      </a>
    </span>
  </footer>
);
