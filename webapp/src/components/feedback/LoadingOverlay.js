import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useLoading } from '@context/LoadingContext';
import './LoadingOverlay.css';
export const LoadingOverlay = () => {
    const { loading } = useLoading();
    if (!loading) {
        return null;
    }
    return (_jsxs("div", { className: "loading-overlay", role: "status", "aria-live": "polite", children: [_jsx("div", { className: "loading-spinner" }), _jsx("span", { className: "loading-text", children: "Loading\u2026" })] }));
};
