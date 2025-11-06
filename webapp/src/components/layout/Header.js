import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useLocation } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';
function deriveTitle(pathname) {
    const mapping = {
        '/dashboard': 'Dashboard',
        '/portfolio': 'Portfolio',
        '/portfolio/list': 'Portfolio',
        '/trading-view': 'Trading View',
        '/backtesting': 'Backtesting',
        '/backtesting/result': 'Backtesting Result',
        '/master-data': 'Master Data Management',
        '/user': 'User Management',
        '/backtesting-tradingview': 'Backtesting Trading View'
    };
    const exactMatch = mapping[pathname];
    if (exactMatch)
        return exactMatch;
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0)
        return 'Dashboard';
    return segments.map((segment) => segment.replace(/-/g, ' ')).join(' › ');
}
export const AppHeader = () => {
    const location = useLocation();
    const { user, logout } = useAuth();
    const title = deriveTitle(location.pathname);
    return (_jsxs("header", { className: "app-header", children: [_jsxs("div", { children: [_jsx("h1", { children: title }), _jsx("p", { className: "app-header__subtitle", children: "Strategic Analysis Platform" })] }), _jsxs("div", { className: "app-header__user", children: [_jsxs("div", { className: "app-header__user-meta", children: [_jsx("span", { className: "app-header__user-name", children: user?.displayName ?? 'Guest' }), _jsx("small", { className: "app-header__user-role", children: user?.username })] }), _jsx("button", { type: "button", onClick: logout, className: "app-header__logout", children: "Logout" })] })] }));
};
