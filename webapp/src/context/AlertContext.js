import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
const DEFAULT_STATE = {
    visible: false,
    color: 'info',
    message: ''
};
const AlertContext = createContext(undefined);
export const AlertProvider = ({ children }) => {
    const [alert, setAlert] = useState(DEFAULT_STATE);
    const show = useCallback((color, message) => {
        setAlert({ visible: true, color, message });
    }, []);
    const hide = useCallback(() => {
        setAlert((current) => ({ ...current, visible: false }));
    }, []);
    const value = useMemo(() => ({ alert, show, hide }), [alert, hide, show]);
    return _jsx(AlertContext.Provider, { value: value, children: children });
};
export function useAlert() {
    const context = useContext(AlertContext);
    if (!context) {
        throw new Error('useAlert must be used within an AlertProvider');
    }
    return context;
}
