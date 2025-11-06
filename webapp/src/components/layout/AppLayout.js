import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { AppHeader } from './Header';
import { AppFooter } from './Footer';
import './layout.css';
export const AppLayout = () => {
    return (_jsxs("div", { className: "app-shell", children: [_jsx(Sidebar, {}), _jsxs("div", { className: "app-shell__main", children: [_jsx(AppHeader, {}), _jsx("main", { className: "app-shell__content", children: _jsx(Outlet, {}) }), _jsx(AppFooter, {})] })] }));
};
