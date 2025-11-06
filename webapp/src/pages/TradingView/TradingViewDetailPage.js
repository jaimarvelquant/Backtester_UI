import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@hooks/useApiClient';
import { normalizeTradingView, normalizePortfolioRunResponse } from '@utils/portfolio';
import '../Portfolio/PortfolioDetail.css';
const TradingViewDetailPage = () => {
    const { id } = useParams();
    const apiClient = useApiClient();
    const tradingViewId = Number(id);
    const { data, isLoading } = useQuery({
        queryKey: ['trading-view-detail', tradingViewId],
        enabled: Number.isFinite(tradingViewId),
        queryFn: async () => {
            const [detail, run] = await Promise.all([
                apiClient.getTradingView(tradingViewId),
                apiClient.getTradingViewTransaction(tradingViewId)
            ]);
            return {
                tradingView: normalizeTradingView(detail.data),
                analysis: normalizePortfolioRunResponse(run.data)
            };
        }
    });
    if (isLoading) {
        return _jsx("div", { className: "card", children: "Loading trading view\u2026" });
    }
    if (!data?.tradingView) {
        return _jsx("div", { className: "card", children: "Trading view not found." });
    }
    const { tradingView, analysis } = data;
    return (_jsxs("div", { className: "portfolio-detail", children: [_jsxs("section", { className: "card portfolio-detail__grid", children: [_jsxs("div", { children: [_jsx("span", { className: "label", children: "Name" }), _jsx("strong", { children: tradingView.name ?? '—' })] }), _jsxs("div", { children: [_jsx("span", { className: "label", children: "Start Date" }), _jsx("strong", { children: tradingView.startdate ?? '—' })] }), _jsxs("div", { children: [_jsx("span", { className: "label", children: "End Date" }), _jsx("strong", { children: tradingView.enddate ?? '—' })] }), _jsxs("div", { children: [_jsx("span", { className: "label", children: "Exit Applicable" }), _jsx("strong", { children: tradingView.tvexitapplicable ?? '—' })] }), _jsxs("div", { children: [_jsx("span", { className: "label", children: "Roll Over" }), _jsx("strong", { children: tradingView.dorollover ?? '—' })] }), _jsxs("div", { children: [_jsx("span", { className: "label", children: "Owner" }), _jsx("strong", { children: tradingView.createdBy?.displayName ?? tradingView.createdBy?.username ?? '—' })] })] }), Array.isArray(tradingView.tvsignals) && tradingView.tvsignals.length > 0 && (_jsxs("section", { className: "card", children: [_jsx("h3", { children: "Signals" }), _jsx("div", { className: "table-wrapper", children: _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "#" }), _jsx("th", { children: "Datetime" }), _jsx("th", { children: "Symbol" }), _jsx("th", { children: "Side" }), _jsx("th", { children: "Comments" })] }) }), _jsx("tbody", { children: tradingView.tvsignals.map((signal, index) => (_jsxs("tr", { children: [_jsx("td", { children: index + 1 }), _jsx("td", { children: signal.datetime }), _jsx("td", { children: signal.symbol ?? '—' }), _jsx("td", { children: signal.side ?? '—' }), _jsx("td", { children: signal.comments ?? '—' })] }, signal.id ?? index))) })] }) })] })), analysis && (_jsxs("section", { className: "card", children: [_jsx("h3", { children: "Run Metrics" }), _jsx("div", { className: "metrics-grid", children: analysis.metrics?.map((metric) => (_jsxs("article", { children: [_jsxs("header", { children: [_jsx("h4", { children: metric.strategy }), _jsx("small", { children: metric.instrument ?? 'Combined' })] }), _jsxs("dl", { children: [_jsxs("div", { children: [_jsx("dt", { children: "Total PnL" }), _jsx("dd", { children: metric.totalpnlFormat ?? metric.totalpnl })] }), _jsxs("div", { children: [_jsx("dt", { children: "Win Rate" }), _jsx("dd", { children: metric.winrateFormat ?? metric.winrate })] }), _jsxs("div", { children: [_jsx("dt", { children: "Expectancy" }), _jsx("dd", { children: metric.expectancyFormat ?? metric.expectancy })] }), _jsxs("div", { children: [_jsx("dt", { children: "Avg Day PnL" }), _jsx("dd", { children: metric.avgDayStrategyPnlFormat ?? metric.avgDayStrategyPnl })] })] })] }, metric.strategy))) })] })), analysis?.transactions && (_jsxs("section", { className: "card", children: [_jsx("h3", { children: "Transactions" }), _jsx("div", { className: "table-wrapper", children: _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "#" }), _jsx("th", { children: "Entry" }), _jsx("th", { children: "Exit" }), _jsx("th", { children: "Symbol" }), _jsx("th", { children: "PNL" })] }) }), _jsx("tbody", { children: analysis.transactions.map((txn, index) => (_jsxs("tr", { children: [_jsx("td", { children: index + 1 }), _jsxs("td", { children: [txn.entry_date, " ", txn.entry_time] }), _jsxs("td", { children: [txn.exit_date, " ", txn.exit_time] }), _jsx("td", { children: txn.symbol }), _jsx("td", { className: Number(txn.pnl) >= 0 ? 'text-success' : 'text-danger', children: txn.pnlFormat ?? txn.pnl })] }, `${txn.strategy}-${txn.leg_id}-${index}`))) })] }) })] }))] }));
};
export default TradingViewDetailPage;
