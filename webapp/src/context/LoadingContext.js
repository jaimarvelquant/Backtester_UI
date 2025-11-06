import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
const LoadingContext = createContext(undefined);
export const LoadingProvider = ({ children }) => {
    const [loading, setLoading] = useState(false);
    const show = useCallback(() => setLoading(true), []);
    const hide = useCallback(() => setLoading(false), []);
    const withLoader = useCallback(async (task) => {
        show();
        try {
            return await task();
        }
        finally {
            hide();
        }
    }, [hide, show]);
    const value = useMemo(() => ({ loading, show, hide, withLoader }), [hide, loading, show, withLoader]);
    return _jsx(LoadingContext.Provider, { value: value, children: children });
};
export function useLoading() {
    const context = useContext(LoadingContext);
    if (!context) {
        throw new Error('useLoading must be used within a LoadingProvider');
    }
    return context;
}
