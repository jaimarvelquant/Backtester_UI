import React from 'react';
import { useAlert } from '@context/AlertContext';

import './AlertBanner.css';

const toneToClass: Record<string, string> = {
  primary: 'alert-primary',
  secondary: 'alert-secondary',
  success: 'alert-success',
  danger: 'alert-danger',
  warning: 'alert-warning',
  info: 'alert-info',
  light: 'alert-light',
  dark: 'alert-dark'
};

export const AlertBanner: React.FC = () => {
  const { alert, hide } = useAlert();

  if (!alert.visible) {
    return null;
  }

  const className = `alert-banner ${toneToClass[alert.color] ?? toneToClass.info}`;

  return (
    <div className={className} role="alert">
      <span>{alert.message}</span>
      <button type="button" className="alert-close" onClick={hide} aria-label="Close alert">
        ×
      </button>
    </div>
  );
};
