import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from 'react-router-dom';
const NotFoundPage = () => (_jsxs("div", { className: "page", children: [_jsx("h2", { children: "404 - Page not found" }), _jsx("p", { children: "The page you are looking for does not exist." }), _jsx(Link, { to: "/dashboard", children: "Return to dashboard" })] }));
export default NotFoundPage;
