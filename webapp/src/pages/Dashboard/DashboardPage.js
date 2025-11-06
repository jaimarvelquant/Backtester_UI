import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@hooks/useApiClient';
import { roundTo } from '@utils/number';
import './DashboardPage.css';
const DashboardPage = () => {
    const apiClient = useApiClient();
    const { data: portfolioData } = useQuery({
        queryKey: ['dashboard', 'portfolios'],
        queryFn: async () => {
            const response = await apiClient.searchPortfolio({ page: 0, size: 5, ran: true });
            return response.data.data;
        }
    });
    const { data: tradingViewData } = useQuery({
        queryKey: ['dashboard', 'trading-view'],
        queryFn: async () => {
            const response = await apiClient.searchTradingView({ page: 0, size: 5 });
            return response.data.data;
        }
    });
    return (_jsxs("div", { className: "dashboard", children: [_jsxs("section", { className: "dashboard__hero", children: [_jsxs("div", { children: [_jsx("h2", { children: "Run smarter strategies." }), _jsx("p", { children: "Consolidate your portfolios, align with master data, and evaluate trade performance in minutes." }), _jsxs("div", { className: "dashboard__actions", children: [_jsx("a", { href: "/portfolio/list", className: "dashboard__pill", children: "Manage Portfolio" }), _jsx("a", { href: "/backtesting/list", className: "dashboard__pill dashboard__pill--secondary", children: "Backtesting" }), _jsx("a", { href: "/trading-view/list", className: "dashboard__pill dashboard__pill--ghost", children: "Trading View" })] })] }), _jsxs("div", { className: "dashboard__highlights", children: [_jsxs("article", { children: [_jsx("h3", { children: "Portfolio coverage" }), _jsx("p", { children: "Track multi-leg strategies, lock profits, and view VWAP conditions." })] }), _jsxs("article", { children: [_jsx("h3", { children: "Trading view signals" }), _jsx("p", { children: "Upload, version, and share signal libraries with your desk." })] }), _jsxs("article", { children: [_jsx("h3", { children: "Backtesting insights" }), _jsx("p", { children: "Compare P&L, drawdowns, and win-rate outliers in one sheet." })] })] })] }), _jsxs("section", { className: "dashboard__panel", children: [_jsxs("header", { children: [_jsx("h3", { children: "Recently backtested portfolios" }), _jsx("a", { href: "/portfolio/list", children: "View all \u2192" })] }), _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Name" }), _jsx("th", { children: "Strategy Type" }), _jsx("th", { children: "Start" }), _jsx("th", { children: "End" }), _jsx("th", { children: "Target" }), _jsx("th", { children: "Stop Loss" })] }) }), _jsx("tbody", { children: portfolioData?.map((item) => (_jsxs("tr", { children: [_jsx("td", { children: item.portfolioName }), _jsx("td", { children: item.strategyType }), _jsx("td", { children: item.startDate }), _jsx("td", { children: item.endDate }), _jsx("td", { children: roundTo(Number(item.portfolioTarget)) }), _jsx("td", { children: roundTo(Number(item.portfolioStoploss)) })] }, item.portfolioID))) ?? (_jsx("tr", { children: _jsx("td", { colSpan: 6, children: "No portfolios found. Run your first backtest." }) })) })] })] }), _jsxs("section", { className: "dashboard__panel", children: [_jsxs("header", { children: [_jsx("h3", { children: "Latest trading view setups" }), _jsx("a", { href: "/trading-view/list", children: "Explore library \u2192" })] }), _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Name" }), _jsx("th", { children: "Start" }), _jsx("th", { children: "End" }), _jsx("th", { children: "Exit Applicable" }), _jsx("th", { children: "Owner" })] }) }), _jsx("tbody", { children: tradingViewData?.map((item) => (_jsxs("tr", { children: [_jsx("td", { children: item.name }), _jsx("td", { children: item.startdate }), _jsx("td", { children: item.enddate }), _jsx("td", { children: item.tvexitapplicable }), _jsx("td", { children: item.createdBy?.displayName ?? item.createdBy?.username })] }, item.id))) ?? (_jsx("tr", { children: _jsx("td", { colSpan: 5, children: "Upload your trading view signals to begin." }) })) })] })] })] }));
};
export default DashboardPage;
