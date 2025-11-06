import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useApiClient } from '@hooks/useApiClient';
import { useAlert } from '@context/AlertContext';
import { useLoading } from '@context/LoadingContext';
import '../Portfolio/PortfolioPages.css';
const BacktestConfigurationPage = () => {
    const apiClient = useApiClient();
    const { show } = useAlert();
    const { withLoader } = useLoading();
    const [activeTab, setActiveTab] = useState('simple');
    // Simple backtest parameters
    const [simpleParams, setSimpleParams] = useState({
        name: '',
        strategy: 'moving_average',
        symbol: 'NIFTY',
        startDate: '2023-01-01',
        endDate: '2023-12-31',
        capital: 100000,
        quantity: 1,
        target: 2,
        stoploss: 1,
        trailing: 0,
        slippage: 0.1,
        timeframe: 'DAILY'
    });
    // TradingView backtest parameters
    const [tvParams, setTvParams] = useState({
        name: '',
        symbol: 'NIFTY',
        startDate: '2023-01-01',
        endDate: '2023-12-31',
        capital: 100000,
        quantity: 1,
        target: 2,
        stoploss: 1,
        trailing: 0,
        slippage: 0.1,
        doRollover: false,
        intradaySqOffApplicable: true,
        tvExitApplicable: true,
        firstTradeEntryTime: '09:15',
        manualTradeEntryTime: '00:00'
    });
    const [results, setResults] = useState(null);
    const [isRunning, setIsRunning] = useState(false);
    const runSimpleBacktest = async () => {
        try {
            setIsRunning(true);
            const response = await withLoader(async () => {
                return await apiClient.runDirectBacktest(simpleParams);
            });
            if (response.data.status === 'success') {
                setResults(response.data);
                show('success', 'Backtest completed successfully!');
            }
            else {
                show('danger', response.data.message || 'Backtest failed');
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Backtest execution failed';
            show('danger', message);
        }
        finally {
            setIsRunning(false);
        }
    };
    const runTradingViewBacktest = async () => {
        try {
            setIsRunning(true);
            const response = await withLoader(async () => {
                return await apiClient.runDirectTradingViewBacktest(tvParams);
            });
            if (response.data.status === 'success') {
                setResults(response.data);
                show('success', 'TradingView backtest completed successfully!');
            }
            else {
                show('danger', response.data.message || 'TradingView backtest failed');
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'TradingView backtest execution failed';
            show('danger', message);
        }
        finally {
            setIsRunning(false);
        }
    };
    const renderResults = () => {
        if (!results)
            return null;
        return (_jsxs("section", { className: "card", children: [_jsx("div", { className: "card__header", children: _jsx("h3", { children: "Backtest Results" }) }), _jsx("div", { className: "results-container", children: _jsx("pre", { className: "results-json", children: JSON.stringify(results, null, 2) }) })] }));
    };
    return (_jsxs("div", { className: "portfolio-page", children: [_jsx("header", { className: "portfolio-page__header", children: _jsxs("div", { children: [_jsx("h2", { children: "Backtest Configuration" }), _jsx("p", { children: "Configure and run backtests using the Python backend services." })] }) }), _jsxs("div", { className: "tabs", children: [_jsx("button", { className: `tab ${activeTab === 'simple' ? 'active' : ''}`, onClick: () => setActiveTab('simple'), children: "Simple Backtest" }), _jsx("button", { className: `tab ${activeTab === 'tradingview' ? 'active' : ''}`, onClick: () => setActiveTab('tradingview'), children: "TradingView Backtest" })] }), activeTab === 'simple' && (_jsxs("section", { className: "card", children: [_jsx("div", { className: "card__header", children: _jsx("h3", { children: "Simple Backtest Configuration" }) }), _jsxs("form", { className: "backtest-form", children: [_jsxs("div", { className: "form-grid", children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Strategy Name" }), _jsx("input", { type: "text", value: simpleParams.name, onChange: (e) => setSimpleParams({ ...simpleParams, name: e.target.value }), placeholder: "Enter strategy name" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Strategy Type" }), _jsxs("select", { value: simpleParams.strategy, onChange: (e) => setSimpleParams({ ...simpleParams, strategy: e.target.value }), children: [_jsx("option", { value: "moving_average", children: "Moving Average" }), _jsx("option", { value: "rsi", children: "RSI" }), _jsx("option", { value: "macd", children: "MACD" }), _jsx("option", { value: "bollinger", children: "Bollinger Bands" })] })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Symbol" }), _jsx("input", { type: "text", value: simpleParams.symbol, onChange: (e) => setSimpleParams({ ...simpleParams, symbol: e.target.value }), placeholder: "NIFTY, BANKNIFTY, etc." })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Timeframe" }), _jsxs("select", { value: simpleParams.timeframe, onChange: (e) => setSimpleParams({ ...simpleParams, timeframe: e.target.value }), children: [_jsx("option", { value: "DAILY", children: "Daily" }), _jsx("option", { value: "WEEKLY", children: "Weekly" }), _jsx("option", { value: "MONTHLY", children: "Monthly" })] })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Start Date" }), _jsx("input", { type: "date", value: simpleParams.startDate, onChange: (e) => setSimpleParams({ ...simpleParams, startDate: e.target.value }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "End Date" }), _jsx("input", { type: "date", value: simpleParams.endDate, onChange: (e) => setSimpleParams({ ...simpleParams, endDate: e.target.value }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Initial Capital" }), _jsx("input", { type: "number", value: simpleParams.capital, onChange: (e) => setSimpleParams({ ...simpleParams, capital: Number(e.target.value) }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Quantity" }), _jsx("input", { type: "number", value: simpleParams.quantity, onChange: (e) => setSimpleParams({ ...simpleParams, quantity: Number(e.target.value) }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Target (%)" }), _jsx("input", { type: "number", step: "0.1", value: simpleParams.target, onChange: (e) => setSimpleParams({ ...simpleParams, target: Number(e.target.value) }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Stop Loss (%)" }), _jsx("input", { type: "number", step: "0.1", value: simpleParams.stoploss, onChange: (e) => setSimpleParams({ ...simpleParams, stoploss: Number(e.target.value) }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Trailing (%)" }), _jsx("input", { type: "number", step: "0.1", value: simpleParams.trailing, onChange: (e) => setSimpleParams({ ...simpleParams, trailing: Number(e.target.value) }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Slippage (%)" }), _jsx("input", { type: "number", step: "0.01", value: simpleParams.slippage, onChange: (e) => setSimpleParams({ ...simpleParams, slippage: Number(e.target.value) }) })] })] }), _jsx("div", { className: "form-actions", children: _jsx("button", { type: "button", className: "btn btn-primary", onClick: runSimpleBacktest, disabled: isRunning, children: isRunning ? 'Running Backtest...' : 'Run Backtest' }) })] })] })), activeTab === 'tradingview' && (_jsxs("section", { className: "card", children: [_jsx("div", { className: "card__header", children: _jsx("h3", { children: "TradingView Backtest Configuration" }) }), _jsxs("form", { className: "backtest-form", children: [_jsxs("div", { className: "form-grid", children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Strategy Name" }), _jsx("input", { type: "text", value: tvParams.name, onChange: (e) => setTvParams({ ...tvParams, name: e.target.value }), placeholder: "Enter strategy name" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Symbol" }), _jsx("input", { type: "text", value: tvParams.symbol, onChange: (e) => setTvParams({ ...tvParams, symbol: e.target.value }), placeholder: "NIFTY, BANKNIFTY, etc." })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Start Date" }), _jsx("input", { type: "date", value: tvParams.startDate, onChange: (e) => setTvParams({ ...tvParams, startDate: e.target.value }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "End Date" }), _jsx("input", { type: "date", value: tvParams.endDate, onChange: (e) => setTvParams({ ...tvParams, endDate: e.target.value }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Initial Capital" }), _jsx("input", { type: "number", value: tvParams.capital, onChange: (e) => setTvParams({ ...tvParams, capital: Number(e.target.value) }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Quantity" }), _jsx("input", { type: "number", value: tvParams.quantity, onChange: (e) => setTvParams({ ...tvParams, quantity: Number(e.target.value) }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Target (%)" }), _jsx("input", { type: "number", step: "0.1", value: tvParams.target, onChange: (e) => setTvParams({ ...tvParams, target: Number(e.target.value) }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Stop Loss (%)" }), _jsx("input", { type: "number", step: "0.1", value: tvParams.stoploss, onChange: (e) => setTvParams({ ...tvParams, stoploss: Number(e.target.value) }) })] }), _jsx("div", { className: "form-group", children: _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: tvParams.doRollover, onChange: (e) => setTvParams({ ...tvParams, doRollover: e.target.checked }) }), "Do Rollover"] }) }), _jsx("div", { className: "form-group", children: _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: tvParams.intradaySqOffApplicable, onChange: (e) => setTvParams({ ...tvParams, intradaySqOffApplicable: e.target.checked }) }), "Intraday Square Off"] }) }), _jsx("div", { className: "form-group", children: _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: tvParams.tvExitApplicable, onChange: (e) => setTvParams({ ...tvParams, tvExitApplicable: e.target.checked }) }), "TradingView Exit"] }) }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "First Trade Entry Time" }), _jsx("input", { type: "time", value: tvParams.firstTradeEntryTime, onChange: (e) => setTvParams({ ...tvParams, firstTradeEntryTime: e.target.value }) })] })] }), _jsx("div", { className: "form-actions", children: _jsx("button", { type: "button", className: "btn btn-primary", onClick: runTradingViewBacktest, disabled: isRunning, children: isRunning ? 'Running TradingView Backtest...' : 'Run TradingView Backtest' }) })] })] })), renderResults()] }));
};
export default BacktestConfigurationPage;
