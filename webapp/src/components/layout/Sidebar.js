import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { NavLink } from 'react-router-dom';
const NAV_ITEMS = [
    { to: '/dashboard', label: 'Dashboard', icon: '📊' },
    { to: '/portfolio/list', label: 'Portfolio', icon: '🧺' },
    { to: '/backtesting/list', label: 'Backtesting', icon: '📈' },
    { to: '/backtesting/configure', label: 'Configure BT', icon: '⚙️' },
    { to: '/trading-view/list', label: 'Trading View', icon: '🧭' },
    { to: '/backtesting-tradingview/list', label: 'TV Backtesting', icon: '🛰️' },
    { to: '/master-data', label: 'Master Data', icon: '🗂️' },
    { to: '/user', label: 'Users', icon: '👤' }
];
export const Sidebar = () => (_jsxs("aside", { className: "app-sidebar", children: [_jsxs("div", { className: "app-sidebar__brand", children: [_jsx("span", { className: "app-sidebar__logo", children: "\u2699\uFE0F" }), _jsx("span", { className: "app-sidebar__title", children: "Strategy Suite" })] }), _jsx("nav", { className: "app-sidebar__nav", children: NAV_ITEMS.map((item) => (_jsxs(NavLink, { to: item.to, className: ({ isActive }) => `app-sidebar__link ${isActive ? 'is-active' : ''}`, children: [_jsx("span", { className: "app-sidebar__icon", "aria-hidden": true, children: item.icon }), _jsx("span", { children: item.label })] }, item.to))) })] }));
