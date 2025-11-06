import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useAlert } from '@context/AlertContext';
import './AlertBanner.css';
const toneToClass = {
    primary: 'alert-primary',
    secondary: 'alert-secondary',
    success: 'alert-success',
    danger: 'alert-danger',
    warning: 'alert-warning',
    info: 'alert-info',
    light: 'alert-light',
    dark: 'alert-dark'
};
export const AlertBanner = () => {
    const { alert, hide } = useAlert();
    if (!alert.visible) {
        return null;
    }
    const className = `alert-banner ${toneToClass[alert.color] ?? toneToClass.info}`;
    return (_jsxs("div", { className: className, role: "alert", children: [_jsx("span", { children: alert.message }), _jsx("button", { type: "button", className: "alert-close", onClick: hide, "aria-label": "Close alert", children: "\u00D7" })] }));
};
