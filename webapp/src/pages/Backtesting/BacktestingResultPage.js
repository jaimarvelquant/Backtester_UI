import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@hooks/useApiClient';
import { normalizePortfolio, normalizePortfolioRunResponse } from '@utils/portfolio';
import '../Portfolio/PortfolioDetail.css';
const TABS = ['metrics', 'daywise', 'monthwise', 'margin', 'transactions'];
const BacktestingResultPage = () => {
    const { id } = useParams();
    const apiClient = useApiClient();
    const [activeTab, setActiveTab] = useState('metrics');
    const portfolioId = Number(id);
    const { data, isLoading } = useQuery({
        queryKey: ['backtesting-detail', portfolioId],
        enabled: Number.isFinite(portfolioId),
        queryFn: async () => {
            const [portfolioResponse, runResponse] = await Promise.all([
                apiClient.getPortfolio(portfolioId),
                apiClient.getPortfolioTransaction(portfolioId)
            ]);
            return {
                portfolio: normalizePortfolio(portfolioResponse.data),
                runResponse: normalizePortfolioRunResponse(runResponse.data)
            };
        }
    });
    if (isLoading) {
        return _jsx("div", { className: "card", children: "Loading backtesting result\u2026" });
    }
    if (!data?.portfolio || !data?.runResponse) {
        return _jsx("div", { className: "card", children: "No backtesting result available." });
    }
    const { portfolio, runResponse } = data;
    return (_jsxs("div", { className: "portfolio-detail", children: [_jsxs("section", { className: "card portfolio-detail__grid", children: [_jsxs("div", { children: [_jsx("span", { className: "label", children: "Portfolio" }), _jsx("strong", { children: portfolio.portfolioName ?? '—' })] }), _jsxs("div", { children: [_jsx("span", { className: "label", children: "Strategy Type" }), _jsx("strong", { children: portfolio.strategyType ?? '—' })] }), _jsxs("div", { children: [_jsx("span", { className: "label", children: "Start Date" }), _jsx("strong", { children: portfolio.startDate ?? '—' })] }), _jsxs("div", { children: [_jsx("span", { className: "label", children: "End Date" }), _jsx("strong", { children: portfolio.endDate ?? '—' })] }), _jsxs("div", { children: [_jsx("span", { className: "label", children: "Target" }), _jsx("strong", { children: portfolio.portfolioTarget ?? '—' })] }), _jsxs("div", { children: [_jsx("span", { className: "label", children: "Stop Loss" }), _jsx("strong", { children: portfolio.portfolioStoploss ?? '—' })] }), _jsxs("div", { children: [_jsx("span", { className: "label", children: "Trailing Type" }), _jsx("strong", { children: portfolio.portfolioTrailingType ?? '—' })] })] }), _jsxs("section", { className: "card", children: [_jsx("nav", { className: "backtesting-tabs", children: TABS.map((tab) => (_jsxs("button", { type: "button", className: tab === activeTab ? 'is-active' : '', onClick: () => setActiveTab(tab), children: [tab === 'metrics' && 'Metrics', tab === 'daywise' && 'Day-wise', tab === 'monthwise' && 'Month-wise', tab === 'margin' && 'Margin %', tab === 'transactions' && 'Transactions'] }, tab))) }), activeTab === 'metrics' && (_jsx("div", { className: "metrics-grid", children: runResponse.metrics?.map((metric) => (_jsxs("article", { children: [_jsxs("header", { children: [_jsx("h4", { children: metric.strategy }), _jsx("small", { children: metric.instrument ?? 'Combined' })] }), _jsxs("dl", { children: [_jsxs("div", { children: [_jsx("dt", { children: "Total PnL" }), _jsx("dd", { children: metric.totalpnlFormat ?? metric.totalpnl })] }), _jsxs("div", { children: [_jsx("dt", { children: "Pos Days %" }), _jsx("dd", { children: metric.posDayPercentageFormat ?? metric.posDayPercentage })] }), _jsxs("div", { children: [_jsx("dt", { children: "Neg Days %" }), _jsx("dd", { children: metric.negDayPercentageFormat ?? metric.negDayPercentage })] }), _jsxs("div", { children: [_jsx("dt", { children: "Max Drawdown" }), _jsx("dd", { children: metric.maxdrawdownFormat ?? metric.maxdrawdown })] }), _jsxs("div", { children: [_jsx("dt", { children: "Profit Factor" }), _jsx("dd", { children: metric.profitfactorFormat ?? metric.profitfactor })] })] })] }, metric.strategy))) })), activeTab === 'daywise' && (_jsx("div", { className: "table-wrapper", children: _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Strategy" }), _jsx("th", { children: "Day" }), _jsx("th", { children: "Win %" }), _jsx("th", { children: "Loss %" }), _jsx("th", { children: "Avg PnL" })] }) }), _jsx("tbody", { children: runResponse.daywisestats?.map((row, index) => (_jsxs("tr", { children: [_jsx("td", { children: row.strategy }), _jsx("td", { children: row.day }), _jsx("td", { children: row.winPercentageFormat ?? row.winPercentage }), _jsx("td", { children: row.lossPercentageFormat ?? row.lossPercentage }), _jsx("td", { children: row.avgDayStrategyPnlFormat ?? row.avgDayStrategyPnl })] }, `${row.strategy}-${index}`))) })] }) })), activeTab === 'monthwise' && (_jsx("div", { className: "table-wrapper", children: _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Strategy" }), _jsx("th", { children: "Month" }), _jsx("th", { children: "Year" }), _jsx("th", { children: "PnL" })] }) }), _jsx("tbody", { children: runResponse.monthwisestats?.map((row, index) => (_jsxs("tr", { children: [_jsx("td", { children: row.strategy }), _jsx("td", { children: row.month }), _jsx("td", { children: row.year }), _jsx("td", { children: row.pnlFormat ?? row.pnl })] }, `${row.strategy}-${index}`))) })] }) })), activeTab === 'margin' && (_jsx("div", { className: "table-wrapper", children: _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Strategy" }), _jsx("th", { children: "Margin %" }), _jsx("th", { children: "Total PnL" })] }) }), _jsx("tbody", { children: runResponse.marginpercentwisestats?.map((row, index) => (_jsxs("tr", { children: [_jsx("td", { children: row.strategy }), _jsx("td", { children: row.marginpercentageFormat ?? row.marginpercentage }), _jsx("td", { children: row.totalpnlFormat ?? row.totalpnl })] }, `${row.strategy}-${index}`))) })] }) })), activeTab === 'transactions' && (_jsx("div", { className: "table-wrapper", children: _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "#" }), _jsx("th", { children: "Strategy" }), _jsx("th", { children: "Leg" }), _jsx("th", { children: "Entry" }), _jsx("th", { children: "Exit" }), _jsx("th", { children: "Symbol" }), _jsx("th", { children: "PNL" })] }) }), _jsx("tbody", { children: runResponse.transactions?.map((txn, index) => (_jsxs("tr", { children: [_jsx("td", { children: index + 1 }), _jsx("td", { children: txn.strategy }), _jsx("td", { children: txn.leg_id }), _jsxs("td", { children: [txn.entry_date, " ", txn.entry_time] }), _jsxs("td", { children: [txn.exit_date, " ", txn.exit_time] }), _jsx("td", { children: txn.symbol }), _jsx("td", { className: Number(txn.pnl) >= 0 ? 'text-success' : 'text-danger', children: txn.pnlFormat ?? txn.pnl })] }, `${txn.strategy}-${txn.leg_id}-${index}`))) })] }) }))] })] }));
};
export default BacktestingResultPage;
