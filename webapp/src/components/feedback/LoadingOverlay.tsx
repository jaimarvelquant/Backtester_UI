import React from 'react';
import { useLoading } from '@context/LoadingContext';

import './LoadingOverlay.css';

export const LoadingOverlay: React.FC = () => {
  const { loading } = useLoading();

  if (!loading) {
    return null;
  }

  return (
    <div className="loading-overlay" role="status" aria-live="polite">
      <div className="loading-spinner" />
      <span className="loading-text">Loading…</span>
    </div>
  );
};
