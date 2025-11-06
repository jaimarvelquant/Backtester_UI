import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@hooks/useApiClient';
import { useAlert } from '@context/AlertContext';
import { useLoading } from '@context/LoadingContext';
import { normalizePortfolio, normalizePortfolioRunResponse } from '@utils/portfolio';
import { downloadBlob } from '@utils/download';
import { roundTo } from '@utils/number';
import './PortfolioDetail.css';
const PortfolioDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const apiClient = useApiClient();
    const { show } = useAlert();
    const { withLoader } = useLoading();
    const queryClient = useQueryClient();
    const portfolioId = Number(id);
    const { data, isLoading, refetch } = useQuery({
        queryKey: ['portfolio-detail', portfolioId],
        enabled: Number.isFinite(portfolioId),
        queryFn: async () => {
            const portfolioResponse = await apiClient.getPortfolio(portfolioId);
            const portfolio = normalizePortfolio(portfolioResponse.data);
            let runResponse = null;
            if (portfolio.ran) {
                const runResult = await apiClient.getPortfolioTransaction(portfolioId);
                runResponse = normalizePortfolioRunResponse(runResult.data);
            }
            return { portfolio, runResponse };
        }
    });
    const portfolio = data?.portfolio;
    const runResponse = data?.runResponse;
    const handleRun = async () => {
        if (!portfolio?.portfolioID)
            return;
        try {
            await withLoader(() => apiClient.runPortfolio(portfolio.portfolioID));
            show('success', 'Portfolio execution started');
            await refetch();
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to run portfolio';
            show('danger', message);
        }
    };
    const handleDownload = async (fileType) => {
        if (!portfolio?.portfolioID)
            return;
        try {
            const blob = await withLoader(() => apiClient.downloadPortfolio([portfolio.portfolioID], fileType));
            const filename = `${portfolio.portfolioName ?? 'portfolio'}.${fileType.toLowerCase()}`;
            downloadBlob(blob, filename);
            show('success', 'Download ready');
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to download';
            show('danger', message);
        }
    };
    const handleDownloadTxn = async () => {
        if (!portfolio?.portfolioID)
            return;
        try {
            const blob = await withLoader(() => apiClient.downloadPortfolioTransactions([portfolio.portfolioID]));
            const filename = `Txn_${portfolio.portfolioName ?? 'portfolio'}.xlsx`;
            downloadBlob(blob, filename);
            show('success', 'Transaction export is ready');
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to download transactions';
            show('danger', message);
        }
    };
    if (isLoading) {
        return _jsx("div", { className: "card", children: "Loading portfolio\u2026" });
    }
    if (!portfolio) {
        return (_jsxs("div", { className: "card", children: [_jsx("p", { children: "Portfolio not found." }), _jsx("button", { type: "button", className: "btn", onClick: () => navigate(-1), children: "Go back" })] }));
    }
    return (_jsxs("div", { className: "portfolio-detail", children: [_jsxs("header", { className: "card portfolio-detail__header", children: [_jsxs("div", { children: [_jsx("h2", { children: portfolio.portfolioName }), _jsxs("p", { children: ["Strategy Type: ", portfolio.strategyType ?? 'N/A'] })] }), _jsxs("div", { className: "portfolio-detail__actions", children: [_jsx("button", { type: "button", className: "btn", onClick: () => navigate(-1), children: "Back" }), _jsx("button", { type: "button", className: "btn btn-primary", onClick: handleRun, children: "Run Portfolio" }), _jsx("button", { type: "button", className: "btn", onClick: handleDownloadTxn, children: "Export Transactions" }), _jsx("button", { type: "button", className: "btn", onClick: () => handleDownload('XLSX'), children: "Download XLSX" }), _jsx("button", { type: "button", className: "btn", onClick: () => handleDownload('JSON'), children: "Download JSON" })] })] }), _jsxs("section", { className: "card portfolio-detail__grid", children: [_jsxs("div", { children: [_jsx("span", { className: "label", children: "Start Date" }), _jsx("strong", { children: portfolio.startDate ?? '—' })] }), _jsxs("div", { children: [_jsx("span", { className: "label", children: "End Date" }), _jsx("strong", { children: portfolio.endDate ?? '—' })] }), _jsxs("div", { children: [_jsx("span", { className: "label", children: "Target" }), _jsx("strong", { children: roundTo(Number(portfolio.portfolioTarget)) })] }), _jsxs("div", { children: [_jsx("span", { className: "label", children: "Stop Loss" }), _jsx("strong", { children: roundTo(Number(portfolio.portfolioStoploss)) })] }), _jsxs("div", { children: [_jsx("span", { className: "label", children: "Trailing Type" }), _jsx("strong", { children: portfolio.portfolioTrailingType ?? '—' })] }), _jsxs("div", { children: [_jsx("span", { className: "label", children: "Profit Reaches" }), _jsx("strong", { children: roundTo(Number(portfolio.profitReaches)) })] }), _jsxs("div", { children: [_jsx("span", { className: "label", children: "Created By" }), _jsx("strong", { children: portfolio.createdBy?.displayName ?? portfolio.createdBy?.username ?? '—' })] })] }), Array.isArray(portfolio.strategiesSetting) && portfolio.strategiesSetting.length > 0 && (_jsxs("section", { className: "card", children: [_jsx("h3", { children: "Strategies" }), _jsx("div", { className: "strategy-list", children: portfolio.strategiesSetting.map((strategy) => (_jsxs("article", { className: "strategy-card", children: [_jsxs("header", { children: [_jsx("h4", { children: strategy.strategyName ?? 'Unnamed strategy' }), _jsxs("span", { children: ["ID: ", strategy.strategyID ?? '—'] })] }), Array.isArray(strategy.legsSettings) && strategy.legsSettings.length > 0 ? (_jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Leg" }), _jsx("th", { children: "Type" }), _jsx("th", { children: "Entry" }), _jsx("th", { children: "Exit" }), _jsx("th", { children: "Symbol" })] }) }), _jsx("tbody", { children: strategy.legsSettings.map((leg, index) => (_jsxs("tr", { children: [_jsx("td", { children: leg.legID ?? index + 1 }), _jsx("td", { children: leg.orderType ?? leg.tradertype ?? '—' }), _jsxs("td", { children: [leg.entryDateDisplay, " ", leg.entryTimeDisplay] }), _jsxs("td", { children: [leg.exitDateDisplay, " ", leg.exitTimeDisplay] }), _jsx("td", { children: leg.symbol ?? '—' })] }, `${strategy.strategyID}-${index}`))) })] })) : (_jsx("p", { children: "No legs configured." }))] }, strategy.strategyID))) })] })), runResponse && (_jsxs("section", { className: "card", children: [_jsx("h3", { children: "Performance Metrics" }), _jsx("div", { className: "metrics-grid", children: runResponse.metrics?.map((metric) => (_jsxs("article", { children: [_jsxs("header", { children: [_jsx("h4", { children: metric.strategy }), _jsx("small", { children: metric.instrument ?? 'Portfolio Aggregate' })] }), _jsxs("dl", { children: [_jsxs("div", { children: [_jsx("dt", { children: "Total PnL" }), _jsx("dd", { children: metric.totalpnlFormat ?? metric.totalpnl })] }), _jsxs("div", { children: [_jsx("dt", { children: "Max Drawdown %" }), _jsx("dd", { children: metric.maxdrawdownpercentageFormat ?? metric.maxdrawdownpercentage })] }), _jsxs("div", { children: [_jsx("dt", { children: "Win Rate" }), _jsx("dd", { children: metric.winrateFormat ?? metric.winrate })] }), _jsxs("div", { children: [_jsx("dt", { children: "Expectancy" }), _jsx("dd", { children: metric.expectancyFormat ?? metric.expectancy })] }), _jsxs("div", { children: [_jsx("dt", { children: "Sharpe Ratio" }), _jsx("dd", { children: metric.sharperatioFormat ?? metric.sharperatio })] })] })] }, metric.strategy))) })] })), runResponse?.transactions && runResponse.transactions.length > 0 && (_jsxs("section", { className: "card", children: [_jsx("h3", { children: "Transactions" }), _jsx("div", { className: "table-wrapper", children: _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "#" }), _jsx("th", { children: "Strategy" }), _jsx("th", { children: "Leg" }), _jsx("th", { children: "Entry" }), _jsx("th", { children: "Exit" }), _jsx("th", { children: "Symbol" }), _jsx("th", { children: "Entry Price" }), _jsx("th", { children: "Exit Price" }), _jsx("th", { children: "PNL" })] }) }), _jsx("tbody", { children: runResponse.transactions.map((txn, index) => (_jsxs("tr", { children: [_jsx("td", { children: index + 1 }), _jsx("td", { children: txn.strategy }), _jsx("td", { children: txn.leg_id }), _jsxs("td", { children: [txn.entry_date, " ", txn.entry_time] }), _jsxs("td", { children: [txn.exit_date, " ", txn.exit_time] }), _jsx("td", { children: txn.symbol }), _jsx("td", { children: txn.entry_priceFormat ?? txn.entry_price }), _jsx("td", { children: txn.exit_priceFormat ?? txn.exit_price }), _jsx("td", { className: Number(txn.pnl) >= 0 ? 'text-success' : 'text-danger', children: txn.pnlFormat ?? txn.pnl })] }, `${txn.strategy}-${txn.leg_id}-${index}`))) })] }) })] }))] }));
};
export default PortfolioDetailPage;
