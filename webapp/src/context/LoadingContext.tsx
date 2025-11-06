import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type LoadingContextValue = {
  loading: boolean;
  show: () => void;
  hide: () => void;
  withLoader: <T>(task: () => Promise<T>) => Promise<T>;
};

const LoadingContext = createContext<LoadingContextValue | undefined>(undefined);

export const LoadingProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [loading, setLoading] = useState(false);

  const show = useCallback(() => setLoading(true), []);
  const hide = useCallback(() => setLoading(false), []);

  const withLoader = useCallback(async <T,>(task: () => Promise<T>): Promise<T> => {
    show();
    try {
      return await task();
    } finally {
      hide();
    }
  }, [hide, show]);

  const value = useMemo<LoadingContextValue>(() => ({ loading, show, hide, withLoader }), [hide, loading, show, withLoader]);

  return <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>;
};

export function useLoading(): LoadingContextValue {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}
