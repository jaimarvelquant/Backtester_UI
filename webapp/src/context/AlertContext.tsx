import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type AlertTone = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark';

type AlertState = {
  visible: boolean;
  color: AlertTone;
  message: string;
};

type AlertContextValue = {
  alert: AlertState;
  show: (color: AlertTone, message: string) => void;
  hide: () => void;
};

const DEFAULT_STATE: AlertState = {
  visible: false,
  color: 'info',
  message: ''
};

const AlertContext = createContext<AlertContextValue | undefined>(undefined);

export const AlertProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [alert, setAlert] = useState<AlertState>(DEFAULT_STATE);

  const show = useCallback((color: AlertTone, message: string) => {
    setAlert({ visible: true, color, message });
  }, []);

  const hide = useCallback(() => {
    setAlert((current) => ({ ...current, visible: false }));
  }, []);

  const value = useMemo<AlertContextValue>(() => ({ alert, show, hide }), [alert, hide, show]);

  return <AlertContext.Provider value={value}>{children}</AlertContext.Provider>;
};

export function useAlert(): AlertContextValue {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
}
