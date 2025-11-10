import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { useApiClient } from '@hooks/useApiClient';
import { useAlert } from '@context/AlertContext';
import { useLoading } from '@context/LoadingContext';
import { SIMPLE_LEG_OPTIONS, SIMPLE_STRATEGY_OPTIONS, getAllStrategyOptions, addCustomStrategy, getLegParameters, getStrategyParameters } from '@data/simpleBacktestData';
import '../Portfolio/PortfolioPages.css';
const STRATEGY_CHOICES = [
    { value: 'moving_average', label: 'Moving Average' },
    { value: 'rsi', label: 'RSI' },
    { value: 'macd', label: 'MACD' },
    { value: 'bollinger', label: 'Bollinger Bands' }
];
const DEFAULT_SIMPLE_FORM = {
    symbol: 'NIFTY',
    strategy: STRATEGY_CHOICES[0]?.value ?? 'moving_average',
    startDate: '2025-01-01',
    endDate: '2026-09-29',
    capital: '100000',
    quantity: '1',
    target: '2',
    stopLoss: '1',
    isTickBacktest: 'NO',
    enabled: 'YES',
    portfolioName: 'CRUDE',
    portfolioTarget: '0',
    portfolioStopLoss: '0',
    portfolioTrailingType: 'portfolio lock trail',
    pnlCalculationTime: '233000',
    lockPercent: '0',
    trailPercent: '0',
    squareOff1Time: '233000',
    squareOff1Percent: '0',
    squareOff2Time: '233000',
    squareOff2Percent: '0',
    profitReaches: '0',
    lockMinProfitAt: '0',
    increaseInProfit: '0',
    trailMinProfitBy: '0',
    multiplier: '1',
    slippagePercent: '0.5',
    strategyParameterKey: SIMPLE_STRATEGY_OPTIONS[0]?.value ?? 'N1',
    legParameterKey: SIMPLE_LEG_OPTIONS[0]?.value ?? 'EXP_NF_AD_STD15'
};
const toNumber = (value) => {
    if (value === '' || value === undefined || value === null) {
        return 0;
    }
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
};
const formatDateForBackend = (isoDate) => {
    if (!isoDate) {
        return '';
    }
    const [year, month, day] = isoDate.split('-');
    if (!year || !month || !day) {
        return isoDate.replace(/-/g, '_');
    }
    return `${day}_${month}_${year}`;
};
const interpretSuccess = (status) => {
    if (typeof status === 'string') {
        return status.toLowerCase() === 'success';
    }
    if (typeof status === 'boolean') {
        return status;
    }
    return Boolean(status);
};
const formatStatValue = (value, fractionDigits = 2) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value.toLocaleString(undefined, { maximumFractionDigits: fractionDigits });
    }
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
        return numeric.toLocaleString(undefined, { maximumFractionDigits: fractionDigits });
    }
    if (value === null || value === undefined || value === '') {
        return '-';
    }
    return String(value);
};
const buildStatisticItems = (statistics) => {
    if (!statistics) {
        return [];
    }
    const winRatePercent = typeof statistics.win_rate === 'number' && Number.isFinite(statistics.win_rate)
        ? statistics.win_rate * 100
        : undefined;
    const items = [
        { label: 'Total Trades', value: formatStatValue(statistics.total_trades, 0) },
        { label: 'Winning Trades', value: formatStatValue(statistics.winning_trades, 0) },
        { label: 'Losing Trades', value: formatStatValue(statistics.losing_trades, 0) },
        { label: 'Win Rate (%)', value: formatStatValue(winRatePercent, 2) },
        { label: 'Total P&L', value: formatStatValue(statistics.total_pnl) },
        { label: 'Net P&L', value: formatStatValue(statistics.net_pnl) },
        { label: 'Total Charges', value: formatStatValue(statistics.total_charges) },
        { label: 'Average Trade P&L', value: formatStatValue(statistics.average_trade_pnl) },
        { label: 'Max Profit', value: formatStatValue(statistics.max_profit) },
        { label: 'Max Loss', value: formatStatValue(statistics.max_loss) }
    ];
    return items.filter((item) => item.value !== '-');
};
const normalizeSimpleServiceResponse = (payload, fallbackMessage) => {
    if (!payload || typeof payload !== 'object') {
        return null;
    }
    const source = payload;
    const normalized = {
        success: typeof source.success === 'boolean' ? source.success : undefined,
        message: typeof source.message === 'string' ? source.message : fallbackMessage,
        output_file: typeof source.output_file === 'string' ? source.output_file : undefined
    };
    if (typeof source.statistics === 'object' && source.statistics !== null) {
        normalized.statistics = source.statistics;
    }
    if (typeof source.data === 'object' && source.data !== null) {
        const data = source.data;
        if (!normalized.statistics && typeof data.statistics === 'object' && data.statistics !== null) {
            normalized.statistics = data.statistics;
        }
        if (!normalized.output_file && typeof data.output_file === 'string') {
            normalized.output_file = data.output_file;
        }
        normalized.data = data;
    }
    for (const [key, value] of Object.entries(source)) {
        if (normalized[key] === undefined && !['statistics', 'data', 'message', 'success', 'output_file'].includes(key)) {
            normalized[key] = value;
        }
    }
    return normalized;
};
const buildSimpleBacktestPayload = (form, strategyParameters, legParameters) => ({
    symbol: form.symbol,
    strategy: form.strategy,
    startDate: form.startDate,
    endDate: form.endDate,
    StartDate: formatDateForBackend(form.startDate),
    EndDate: formatDateForBackend(form.endDate),
    capital: toNumber(form.capital),
    quantity: toNumber(form.quantity),
    target: toNumber(form.target),
    stoploss: toNumber(form.stopLoss),
    IsTickBT: form.isTickBacktest,
    Enabled: form.enabled,
    PortfolioName: form.portfolioName,
    PortfolioTarget: toNumber(form.portfolioTarget),
    PortfolioStoploss: toNumber(form.portfolioStopLoss),
    PortfolioTrailingType: form.portfolioTrailingType,
    PnLCalTime: toNumber(form.pnlCalculationTime),
    LockPercent: toNumber(form.lockPercent),
    TrailPercent: toNumber(form.trailPercent),
    SqOff1Time: toNumber(form.squareOff1Time),
    SqOff1Percent: toNumber(form.squareOff1Percent),
    SqOff2Time: toNumber(form.squareOff2Time),
    SqOff2Percent: toNumber(form.squareOff2Percent),
    ProfitReaches: toNumber(form.profitReaches),
    LockMinProfitAt: toNumber(form.lockMinProfitAt),
    IncreaseInProfit: toNumber(form.increaseInProfit),
    TrailMinProfitBy: toNumber(form.trailMinProfitBy),
    Multiplier: toNumber(form.multiplier),
    SlippagePercent: toNumber(form.slippagePercent),
    StrategyParameters: strategyParameters,
    LegParameters: legParameters
});
const BacktestConfigurationPage = () => {
    const apiClient = useApiClient();
    const { show } = useAlert();
    const { withLoader } = useLoading();
    const [activeTab, setActiveTab] = useState('simple');
    const [simpleForm, setSimpleForm] = useState(DEFAULT_SIMPLE_FORM);
    const [tvParams, setTvParams] = useState({
        name: 'TradingView Strategy',
        activeSection: 'input_tv',
        tbs_long: {},
        tbs_short: {},
        portfolio_short: {},
        portfolio_long: {},
        input_tv: {},
        tradingview_backtest: {}
    });
    const [results, setResults] = useState(null);
    const [simpleServiceInput, setSimpleServiceInput] = useState(null);
    const [simpleServiceResults, setSimpleServiceResults] = useState(null);
    const [serviceBanner, setServiceBanner] = useState({
        tone: 'success',
        message: 'All backend services are running! Ready to test backtest strategies.'
    });
    const [pendingServiceAction, setPendingServiceAction] = useState(null);
    const [isRunning, setIsRunning] = useState(false);
    const [uploadFile, setUploadFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadedData, setUploadedData] = useState(null);
    const [strategyOptions, setStrategyOptions] = useState(getAllStrategyOptions());
    const [customStrategyLoaded, setCustomStrategyLoaded] = useState(false);
    const serviceBusy = pendingServiceAction !== null;
    const selectedStrategyParameters = useMemo(() => getStrategyParameters(simpleForm.strategyParameterKey), [simpleForm.strategyParameterKey]);
    const selectedLegParameters = useMemo(() => getLegParameters(simpleForm.legParameterKey), [simpleForm.legParameterKey]);
    const selectedStrategyOption = useMemo(() => strategyOptions.find((item) => item.value === simpleForm.strategyParameterKey), [simpleForm.strategyParameterKey, strategyOptions]);
    const selectedLegOption = useMemo(() => SIMPLE_LEG_OPTIONS.find((item) => item.value === simpleForm.legParameterKey), [simpleForm.legParameterKey]);
    const simpleServiceStatItems = useMemo(() => buildStatisticItems(simpleServiceResults?.statistics), [simpleServiceResults]);
    const updateSimpleForm = (key, value) => {
        setSimpleForm((prev) => ({ ...prev, [key]: value }));
    };
    const runGatewayBacktest = async () => {
        if (selectedStrategyParameters.length === 0) {
            show('danger', 'No strategy parameter template found for the selected strategy.');
            return;
        }
        if (selectedLegParameters.length === 0) {
            show('danger', 'No leg configuration template found for the selected strategy.');
            return;
        }
        try {
            setIsRunning(true);
            const response = await withLoader(async () => {
                const payload = buildSimpleBacktestPayload(simpleForm, selectedStrategyParameters, selectedLegParameters);
                return await apiClient.runDirectBacktest(payload);
            });
            setResults({ label: 'API Gateway Backtest', payload: response });
            const responseStatus = response?.status;
            if (interpretSuccess(responseStatus)) {
                show('success', 'Simple backtest completed successfully!');
            }
            else {
                const errorMessage = response?.message ??
                    response?.error ??
                    response?.errorMessage ??
                    'Simple backtest failed';
                show('danger', String(errorMessage));
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Simple backtest execution failed';
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
                // Combine all configured parameters
                const combinedParams = {
                    name: tvParams.name,
                    tbs_long: tvParams.tbs_long,
                    tbs_short: tvParams.tbs_short,
                    portfolio_long: tvParams.portfolio_long,
                    portfolio_short: tvParams.portfolio_short,
                    input_tv: tvParams.input_tv,
                    tradingview_backtest: tvParams.tradingview_backtest
                };
                return await apiClient.runTradingViewBacktest(combinedParams);
            });
            if (response.data.status === 'success') {
                setResults({ label: 'TradingView Backtest', payload: response.data });
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
    const handleFileUpload = async () => {
        if (!uploadFile) {
            show('danger', 'Please select a file to upload');
            return;
        }
        try {
            setIsUploading(true);
            const formData = new FormData();
            formData.append('file', uploadFile);
            formData.append('config_type', tvParams.activeSection);
            const response = await fetch('/tradingview-backtest/upload-excel', {
                method: 'POST',
                body: formData,
            });
            const result = await response.json();
            if (result.status === 'success') {
                // Update the appropriate configuration section with the uploaded data
                const configType = result.data.config_type;
                const jsonData = result.data.json_data;
                setTvParams(prev => ({
                    ...prev,
                    [configType]: jsonData
                }));
                // Store uploaded data for display
                const uploadData = {
                    json_data: jsonData,
                    filename: result.data.original_filename
                };
                setUploadedData(uploadData);
                show('success', `File "${result.data.original_filename}" uploaded and converted successfully!`);
                setUploadFile(null);
                // Reset file input
                const fileInput = document.getElementById('file-upload');
                if (fileInput) {
                    fileInput.value = '';
                }
            }
            else {
                show('danger', result.message || 'File upload failed');
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'File upload failed';
            show('danger', message);
        }
        finally {
            setIsUploading(false);
        }
    };
    const loadCustomStrategy = async () => {
        try {
            const response = await fetch('/simple-backtest/load-strategy-parameters');
            const result = await response.json();
            if (result.status === 'success') {
                const { strategy_option, strategy_parameters } = result.data;
                // Add the custom strategy to the data structure
                addCustomStrategy(strategy_option, strategy_parameters);
                // Update the state to include the new option
                setStrategyOptions(getAllStrategyOptions());
                setCustomStrategyLoaded(true);
                // Auto-select the new custom strategy
                updateSimpleForm('strategyParameterKey', strategy_option.value);
                show('success', 'Custom strategy parameters loaded successfully!');
            }
            else {
                show('danger', result.message || 'Failed to load custom strategy parameters');
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to load custom strategy';
            show('danger', message);
        }
    };
    const updateServiceStatus = (tone, message) => {
        setServiceBanner({ tone, message });
    };
    const handleCreateTemplate = async () => {
        setPendingServiceAction('create-template');
        try {
            const response = await withLoader(async () => apiClient.createSimpleBacktestTemplate());
            const message = response?.message ?? 'Input template created successfully.';
            updateServiceStatus('success', String(message));
            show('success', String(message));
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to create input template.';
            updateServiceStatus('danger', message);
            show('danger', message);
        }
        finally {
            setPendingServiceAction(null);
        }
    };
    const handleLoadInput = async () => {
        setPendingServiceAction('load-input');
        try {
            const response = await withLoader(async () => apiClient.getSimpleBacktestInput());
            const success = interpretSuccess(response?.success);
            const message = response?.message ?? 'Loaded current input parameters.';
            if (success) {
                const data = response?.data ?? response;
                setSimpleServiceInput(data);
                updateServiceStatus('info', String(message));
                show('success', 'Fetched current simple backtest input.');
            }
            else {
                updateServiceStatus('danger', String(message));
                show('danger', String(message));
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to load input parameters.';
            updateServiceStatus('danger', message);
            show('danger', message);
        }
        finally {
            setPendingServiceAction(null);
        }
    };
    const handleLoadSample = async () => {
        setPendingServiceAction('load-sample');
        try {
            const response = await withLoader(async () => apiClient.loadSimpleBacktestSample());
            const normalized = normalizeSimpleServiceResponse(response, 'Sample backtest completed successfully.');
            setSimpleServiceResults(normalized);
            setResults({ label: 'Simple Backtest Service · Sample Run', payload: response });
            const success = interpretSuccess(response?.success ?? normalized?.success);
            const message = response?.message ?? normalized?.message ?? 'Sample backtest completed successfully.';
            updateServiceStatus(success ? 'success' : 'danger', String(message));
            show(success ? 'success' : 'danger', String(message));
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to run sample backtest.';
            updateServiceStatus('danger', message);
            show('danger', message);
        }
        finally {
            setPendingServiceAction(null);
        }
    };
    const runSimpleServiceBacktest = async () => {
        if (selectedStrategyParameters.length === 0 || selectedLegParameters.length === 0) {
            show('danger', 'Select strategy and leg parameter templates before running the simple service.');
            return;
        }
        setPendingServiceAction('run-service');
        try {
            const payload = buildSimpleBacktestPayload(simpleForm, selectedStrategyParameters, selectedLegParameters);
            const response = await withLoader(async () => apiClient.runSimpleBacktestWithData(payload));
            const normalized = normalizeSimpleServiceResponse(response, 'Backtest completed via Simple Backtest service.');
            setSimpleServiceResults(normalized);
            setResults({ label: 'Simple Backtest Service · Run With Data', payload: response });
            const success = interpretSuccess(response?.success ?? normalized?.success);
            const message = response?.message ?? normalized?.message ?? 'Backtest completed via Simple Backtest service.';
            updateServiceStatus(success ? 'success' : 'danger', String(message));
            show(success ? 'success' : 'danger', String(message));
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to run simple backtest service.';
            updateServiceStatus('danger', message);
            show('danger', message);
        }
        finally {
            setPendingServiceAction(null);
        }
    };
    const handleFetchResults = async () => {
        setPendingServiceAction('fetch-results');
        try {
            const response = await withLoader(async () => apiClient.getSimpleBacktestResults());
            const normalized = normalizeSimpleServiceResponse(response, 'Fetched latest simple backtest results.');
            setSimpleServiceResults(normalized);
            setResults({ label: 'Simple Backtest Service · Latest Results', payload: response });
            const success = interpretSuccess(response?.success ?? normalized?.success);
            const message = response?.message ?? normalized?.message ?? 'Fetched latest simple backtest results.';
            updateServiceStatus(success ? 'info' : 'danger', String(message));
            show(success ? 'success' : 'danger', String(message));
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to fetch simple backtest results.';
            updateServiceStatus('danger', message);
            show('danger', message);
        }
        finally {
            setPendingServiceAction(null);
        }
    };
    const handleClearServicePanels = () => {
        setSimpleServiceInput(null);
        setSimpleServiceResults(null);
        updateServiceStatus('info', 'Cleared Simple Backtest service panels.');
    };
    const renderResults = () => {
        if (!results)
            return null;
        return (_jsxs("section", { className: "card", children: [_jsx("div", { className: "card__header", children: _jsx("h3", { children: results.label }) }), _jsx("div", { className: "results-container", children: _jsx("pre", { className: "results-json", children: JSON.stringify(results.payload, null, 2) }) })] }));
    };
    return (_jsxs("div", { className: "portfolio-page", children: [_jsx("header", { className: "portfolio-page__header", children: _jsxs("div", { children: [_jsx("h2", { children: "Backtest Configuration" }), _jsx("p", { children: "Configure and run backtests using the Python backend services." })] }) }), _jsxs("div", { className: "tabs", children: [_jsx("button", { className: `tab ${activeTab === 'simple' ? 'active' : ''}`, onClick: () => setActiveTab('simple'), children: "Simple Backtest" }), _jsx("button", { className: `tab ${activeTab === 'tradingview' ? 'active' : ''}`, onClick: () => setActiveTab('tradingview'), children: "TradingView Backtest" })] }), activeTab === 'simple' && (_jsxs("section", { className: "card", children: [_jsxs("div", { className: "card__header", children: [_jsx("h3", { children: "Simple Backtest Configuration" }), _jsx("p", { children: "Configure and trigger the Python backtest service with the same controls as the standalone tool." })] }), _jsx("div", { className: `status-banner ${serviceBanner.tone}`, children: serviceBanner.message }), _jsxs("div", { className: "service-actions", children: [_jsx("button", { type: "button", className: "btn btn-secondary", onClick: () => {
                                    if (!serviceBusy)
                                        void handleCreateTemplate();
                                }, disabled: serviceBusy, children: "Create Template" }), _jsx("button", { type: "button", className: "btn btn-secondary", onClick: () => {
                                    if (!serviceBusy)
                                        void handleLoadInput();
                                }, disabled: serviceBusy, children: "Load Input" }), _jsx("button", { type: "button", className: "btn btn-secondary", onClick: () => {
                                    if (!serviceBusy)
                                        void handleLoadSample();
                                }, disabled: serviceBusy, children: "Run Sample" }), _jsx("button", { type: "button", className: "btn btn-secondary", onClick: () => {
                                    if (!serviceBusy)
                                        void runSimpleServiceBacktest();
                                }, disabled: serviceBusy, children: "Run Simple Service" }), _jsx("button", { type: "button", className: "btn btn-secondary", onClick: () => {
                                    if (!serviceBusy)
                                        void handleFetchResults();
                                }, disabled: serviceBusy, children: "Fetch Results" }), _jsx("button", { type: "button", className: "btn btn-secondary", onClick: handleClearServicePanels, disabled: serviceBusy, children: "Clear Panels" })] }), simpleServiceInput && (_jsxs("div", { className: "info-box", children: [_jsx("h4", { children: "Current Simple Backtest Input" }), _jsxs("details", { children: [_jsx("summary", { children: "View JSON" }), _jsx("pre", { className: "results-json", children: JSON.stringify(simpleServiceInput, null, 2) })] })] })), simpleServiceResults && (_jsxs("div", { className: "info-box", children: [_jsx("h4", { children: "Simple Backtest Service Summary" }), typeof simpleServiceResults.message === 'string' && (_jsxs("p", { children: [_jsx("strong", { children: "Status:" }), " ", simpleServiceResults.message] })), simpleServiceResults.output_file && (_jsxs("p", { children: [_jsx("strong", { children: "Output File:" }), " ", simpleServiceResults.output_file] })), simpleServiceStatItems.length > 0 ? (_jsx("div", { className: "stats-grid", children: simpleServiceStatItems.map((item) => (_jsxs("div", { className: "stat-card", children: [_jsx("div", { className: "stat-value", children: item.value }), _jsx("div", { className: "stat-label", children: item.label })] }, item.label))) })) : (_jsx("p", { children: "No statistics available yet." })), _jsxs("details", { children: [_jsx("summary", { children: "View service response" }), _jsx("pre", { className: "results-json", children: JSON.stringify(simpleServiceResults, null, 2) })] })] })), _jsxs("form", { className: "backtest-form", onSubmit: (event) => {
                            event.preventDefault();
                            if (!isRunning) {
                                void runGatewayBacktest();
                            }
                        }, children: [_jsxs("div", { className: "form-grid", children: [_jsx("div", { className: "form-group full-width", children: _jsx("h4", { children: "Strategy Overview" }) }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Symbol" }), _jsx("input", { type: "text", value: simpleForm.symbol, onChange: (event) => updateSimpleForm('symbol', event.target.value), placeholder: "NIFTY", required: true })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Strategy" }), _jsx("select", { value: simpleForm.strategy, onChange: (event) => updateSimpleForm('strategy', event.target.value), children: STRATEGY_CHOICES.map((option) => (_jsx("option", { value: option.value, children: option.label }, option.value))) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Start Date" }), _jsx("input", { type: "date", value: simpleForm.startDate, onChange: (event) => updateSimpleForm('startDate', event.target.value), required: true })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "End Date" }), _jsx("input", { type: "date", value: simpleForm.endDate, onChange: (event) => updateSimpleForm('endDate', event.target.value), required: true })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Initial Capital" }), _jsx("input", { type: "number", value: simpleForm.capital, onChange: (event) => updateSimpleForm('capital', event.target.value), min: "0", step: "1", required: true })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Quantity" }), _jsx("input", { type: "number", value: simpleForm.quantity, onChange: (event) => updateSimpleForm('quantity', event.target.value), min: "1", step: "1", required: true })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Target (%)" }), _jsx("input", { type: "number", value: simpleForm.target, onChange: (event) => updateSimpleForm('target', event.target.value), step: "0.1" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Stop Loss (%)" }), _jsx("input", { type: "number", value: simpleForm.stopLoss, onChange: (event) => updateSimpleForm('stopLoss', event.target.value), step: "0.1" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Is Tick Backtest" }), _jsxs("select", { value: simpleForm.isTickBacktest, onChange: (event) => updateSimpleForm('isTickBacktest', event.target.value), children: [_jsx("option", { value: "NO", children: "NO" }), _jsx("option", { value: "YES", children: "YES" })] })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Enabled" }), _jsxs("select", { value: simpleForm.enabled, onChange: (event) => updateSimpleForm('enabled', event.target.value), children: [_jsx("option", { value: "YES", children: "YES" }), _jsx("option", { value: "NO", children: "NO" })] })] }), _jsx("div", { className: "form-group full-width", children: _jsx("h4", { children: "Portfolio Controls" }) }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Portfolio Name" }), _jsx("input", { type: "text", value: simpleForm.portfolioName, onChange: (event) => updateSimpleForm('portfolioName', event.target.value), placeholder: "CRUDE" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Portfolio Target (%)" }), _jsx("input", { type: "number", value: simpleForm.portfolioTarget, onChange: (event) => updateSimpleForm('portfolioTarget', event.target.value), step: "0.1" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Portfolio Stop Loss (%)" }), _jsx("input", { type: "number", value: simpleForm.portfolioStopLoss, onChange: (event) => updateSimpleForm('portfolioStopLoss', event.target.value), step: "0.1" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Portfolio Trailing Type" }), _jsx("input", { type: "text", value: simpleForm.portfolioTrailingType, onChange: (event) => updateSimpleForm('portfolioTrailingType', event.target.value), placeholder: "portfolio lock trail" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "PnL Calculation Time" }), _jsx("input", { type: "number", value: simpleForm.pnlCalculationTime, onChange: (event) => updateSimpleForm('pnlCalculationTime', event.target.value) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Lock Percent (%)" }), _jsx("input", { type: "number", value: simpleForm.lockPercent, onChange: (event) => updateSimpleForm('lockPercent', event.target.value), step: "0.1" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Trail Percent (%)" }), _jsx("input", { type: "number", value: simpleForm.trailPercent, onChange: (event) => updateSimpleForm('trailPercent', event.target.value), step: "0.1" })] }), _jsx("div", { className: "form-group full-width", children: _jsx("h4", { children: "Square Off & Profit Management" }) }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Square Off 1 Time" }), _jsx("input", { type: "number", value: simpleForm.squareOff1Time, onChange: (event) => updateSimpleForm('squareOff1Time', event.target.value) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Square Off 1 Percent (%)" }), _jsx("input", { type: "number", value: simpleForm.squareOff1Percent, onChange: (event) => updateSimpleForm('squareOff1Percent', event.target.value), step: "0.1" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Square Off 2 Time" }), _jsx("input", { type: "number", value: simpleForm.squareOff2Time, onChange: (event) => updateSimpleForm('squareOff2Time', event.target.value) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Square Off 2 Percent (%)" }), _jsx("input", { type: "number", value: simpleForm.squareOff2Percent, onChange: (event) => updateSimpleForm('squareOff2Percent', event.target.value), step: "0.1" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Profit Reaches" }), _jsx("input", { type: "number", value: simpleForm.profitReaches, onChange: (event) => updateSimpleForm('profitReaches', event.target.value), step: "0.1" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Lock Min Profit At" }), _jsx("input", { type: "number", value: simpleForm.lockMinProfitAt, onChange: (event) => updateSimpleForm('lockMinProfitAt', event.target.value), step: "0.1" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Increase In Profit" }), _jsx("input", { type: "number", value: simpleForm.increaseInProfit, onChange: (event) => updateSimpleForm('increaseInProfit', event.target.value), step: "0.1" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Trail Min Profit By" }), _jsx("input", { type: "number", value: simpleForm.trailMinProfitBy, onChange: (event) => updateSimpleForm('trailMinProfitBy', event.target.value), step: "0.1" })] }), _jsx("div", { className: "form-group full-width", children: _jsx("h4", { children: "Execution Parameters" }) }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Multiplier" }), _jsx("input", { type: "number", value: simpleForm.multiplier, onChange: (event) => updateSimpleForm('multiplier', event.target.value), step: "0.1" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Slippage Percent (%)" }), _jsx("input", { type: "number", value: simpleForm.slippagePercent, onChange: (event) => updateSimpleForm('slippagePercent', event.target.value), step: "0.1" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Strategy Parameters Template" }), _jsx("select", { value: simpleForm.strategyParameterKey, onChange: (event) => updateSimpleForm('strategyParameterKey', event.target.value), children: strategyOptions.map((option) => (_jsx("option", { value: option.value, children: option.label }, option.value))) }), _jsx("button", { type: "button", className: "btn btn-info btn-sm", onClick: loadCustomStrategy, disabled: customStrategyLoaded, style: { marginTop: '8px', width: '100%' }, children: customStrategyLoaded ? '✓ Custom Strategy Loaded' : '📁 Load Custom Strategy from JSON' }), _jsx("small", { className: "form-help", children: "Load strategy parameters from: C:\\Users\\Calin Jasper\\Downloads\\input json\\sample backtest.json" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Leg Parameters Template" }), _jsx("select", { value: simpleForm.legParameterKey, onChange: (event) => updateSimpleForm('legParameterKey', event.target.value), children: SIMPLE_LEG_OPTIONS.map((option) => (_jsx("option", { value: option.value, children: option.label }, option.value))) })] })] }), _jsxs("div", { className: "info-box", children: [_jsx("h4", { children: "Selected Parameter Templates" }), _jsxs("p", { children: [_jsx("strong", { children: "Strategy:" }), ' ', selectedStrategyOption?.label ?? 'Not available', " \u00B7", ' ', selectedStrategyParameters.length, " parameter set(s)"] }), _jsxs("p", { children: [_jsx("strong", { children: "Leg Configuration:" }), ' ', selectedLegOption?.label ?? 'Not available', " \u00B7", ' ', selectedLegParameters.length, " leg(s)"] }), selectedStrategyParameters.length > 0 && (_jsxs("details", { children: [_jsx("summary", { children: "View strategy parameter JSON" }), _jsx("pre", { className: "results-json", style: { maxHeight: '220px' }, children: JSON.stringify(selectedStrategyParameters, null, 2) })] })), selectedLegParameters.length > 0 && (_jsxs("details", { children: [_jsx("summary", { children: "View leg parameter JSON" }), _jsx("pre", { className: "results-json", style: { maxHeight: '220px' }, children: JSON.stringify(selectedLegParameters, null, 2) })] }))] }), _jsx("div", { className: "form-actions", children: _jsx("button", { type: "submit", className: "btn btn-primary", disabled: isRunning, children: isRunning ? 'Running Gateway Backtest...' : 'Run via API Gateway' }) })] })] })), activeTab === 'tradingview' && (_jsxs("section", { className: "card", children: [_jsxs("div", { className: "card__header", children: [_jsx("h3", { children: "TradingView Backtest Configuration" }), _jsx("p", { children: "Configure parameters for TradingView signal-based backtesting using multiple JSON input files." })] }), _jsxs("div", { className: "info-box", children: [_jsx("p", { children: _jsx("strong", { children: "TradingView Backtest uses 6 JSON files:" }) }), _jsxs("ul", { children: [_jsxs("li", { children: [_jsx("strong", { children: "TBS Long:" }), " Trailing Buy Strategy long configurations"] }), _jsxs("li", { children: [_jsx("strong", { children: "TBS Short:" }), " Trailing Buy Strategy short configurations"] }), _jsxs("li", { children: [_jsx("strong", { children: "Portfolio Long:" }), " Long portfolio configurations"] }), _jsxs("li", { children: [_jsx("strong", { children: "Portfolio Short:" }), " Short portfolio configurations"] }), _jsxs("li", { children: [_jsx("strong", { children: "Input TV:" }), " Main TradingView signal configurations"] }), _jsxs("li", { children: [_jsx("strong", { children: "TradingView Backtest:" }), " Overall backtest parameters"] })] }), _jsx("p", { children: "The system automatically loads and combines parameters from all configured files." })] }), _jsxs("div", { className: "tradingview-tabs", children: [_jsx("button", { className: `tv-tab ${tvParams.activeSection === 'input_tv' ? 'active' : ''}`, onClick: () => setTvParams({ ...tvParams, activeSection: 'input_tv' }), children: "Input TV" }), _jsx("button", { className: `tv-tab ${tvParams.activeSection === 'portfolio_long' ? 'active' : ''}`, onClick: () => setTvParams({ ...tvParams, activeSection: 'portfolio_long' }), children: "Portfolio Long" }), _jsx("button", { className: `tv-tab ${tvParams.activeSection === 'portfolio_short' ? 'active' : ''}`, onClick: () => setTvParams({ ...tvParams, activeSection: 'portfolio_short' }), children: "Portfolio Short" }), _jsx("button", { className: `tv-tab ${tvParams.activeSection === 'tbs_long' ? 'active' : ''}`, onClick: () => setTvParams({ ...tvParams, activeSection: 'tbs_long' }), children: "TBS Long" }), _jsx("button", { className: `tv-tab ${tvParams.activeSection === 'tbs_short' ? 'active' : ''}`, onClick: () => setTvParams({ ...tvParams, activeSection: 'tbs_short' }), children: "TBS Short" }), _jsx("button", { className: `tv-tab ${tvParams.activeSection === 'tradingview_backtest' ? 'active' : ''}`, onClick: () => setTvParams({ ...tvParams, activeSection: 'tradingview_backtest' }), children: "TradingView Backtest" })] }), tvParams.activeSection === 'input_tv' && (_jsx("form", { className: "backtest-form", children: _jsxs("div", { className: "form-grid", children: [_jsx("div", { className: "form-group full-width", children: _jsx("h4", { children: "Input TV - Main TradingView Signal Configurations" }) }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Strategy Name" }), _jsx("input", { type: "text", value: tvParams.name, onChange: (e) => setTvParams({ ...tvParams, name: e.target.value }), placeholder: "Enter strategy name" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Start Date (DD_MM_YYYY)" }), _jsx("input", { type: "text", value: tvParams.input_tv.StartDate || "01_01_2022", onChange: (e) => setTvParams({
                                                ...tvParams,
                                                input_tv: {
                                                    ...tvParams.input_tv,
                                                    StartDate: e.target.value
                                                }
                                            }), placeholder: "01_01_2022" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "End Date (DD_MM_YYYY)" }), _jsx("input", { type: "text", value: tvParams.input_tv.EndDate || "01_01_2026", onChange: (e) => setTvParams({
                                                ...tvParams,
                                                input_tv: {
                                                    ...tvParams.input_tv,
                                                    EndDate: e.target.value
                                                }
                                            }), placeholder: "01_01_2026" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Signal Date Time Format" }), _jsx("input", { type: "text", value: tvParams.input_tv.SignalDateFormat || "%m/%d/%Y %H:%M:%S", onChange: (e) => setTvParams({
                                                ...tvParams,
                                                input_tv: {
                                                    ...tvParams.input_tv,
                                                    SignalDateFormat: e.target.value
                                                }
                                            }), placeholder: "%m/%d/%Y %H:%M:%S" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Manual Trade Entry Time" }), _jsx("input", { type: "number", value: tvParams.input_tv.ManualTradeEntryTime || 0, onChange: (e) => setTvParams({
                                                ...tvParams,
                                                input_tv: {
                                                    ...tvParams.input_tv,
                                                    ManualTradeEntryTime: Number(e.target.value)
                                                }
                                            }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Manual Trade Lots" }), _jsx("input", { type: "number", value: tvParams.input_tv.ManualTradeLots || 1, onChange: (e) => setTvParams({
                                                ...tvParams,
                                                input_tv: {
                                                    ...tvParams.input_tv,
                                                    ManualTradeLots: Number(e.target.value)
                                                }
                                            }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "First Trade Entry Time" }), _jsx("input", { type: "number", value: tvParams.input_tv.FirstTradeEntryTime || 0, onChange: (e) => setTvParams({
                                                ...tvParams,
                                                input_tv: {
                                                    ...tvParams.input_tv,
                                                    FirstTradeEntryTime: Number(e.target.value)
                                                }
                                            }) })] }), _jsx("div", { className: "form-group", children: _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: tvParams.input_tv.TvExitApplicable === "yes", onChange: (e) => setTvParams({
                                                    ...tvParams,
                                                    input_tv: {
                                                        ...tvParams.input_tv,
                                                        TvExitApplicable: e.target.checked ? "yes" : "no"
                                                    }
                                                }) }), "TradingView Exit Applicable"] }) }), _jsx("div", { className: "form-group", children: _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: tvParams.input_tv.DoRollover === "yes", onChange: (e) => setTvParams({
                                                    ...tvParams,
                                                    input_tv: {
                                                        ...tvParams.input_tv,
                                                        DoRollover: e.target.checked ? "yes" : "no"
                                                    }
                                                }) }), "Do Rollover"] }) }), _jsx("div", { className: "form-group", children: _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: tvParams.input_tv.IntradaySqOffApplicable === "yes", onChange: (e) => setTvParams({
                                                    ...tvParams,
                                                    input_tv: {
                                                        ...tvParams.input_tv,
                                                        IntradaySqOffApplicable: e.target.checked ? "yes" : "no"
                                                    }
                                                }) }), "Intraday Square Off Applicable"] }) }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Intraday Exit Time (HHMMSS)" }), _jsx("input", { type: "text", value: tvParams.input_tv.IntradayExitTime || "151500", onChange: (e) => setTvParams({
                                                ...tvParams,
                                                input_tv: {
                                                    ...tvParams.input_tv,
                                                    IntradayExitTime: Number(e.target.value)
                                                }
                                            }), placeholder: "151500" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Expiry Day Exit Time (HHMMSS)" }), _jsx("input", { type: "text", value: tvParams.input_tv.ExpiryDayExitTime || "151500", onChange: (e) => setTvParams({
                                                ...tvParams,
                                                input_tv: {
                                                    ...tvParams.input_tv,
                                                    ExpiryDayExitTime: Number(e.target.value)
                                                }
                                            }), placeholder: "151500" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Rollover Time (HHMMSS)" }), _jsx("input", { type: "text", value: tvParams.input_tv.RolloverTime || "151500", onChange: (e) => setTvParams({
                                                ...tvParams,
                                                input_tv: {
                                                    ...tvParams.input_tv,
                                                    RolloverTime: Number(e.target.value)
                                                }
                                            }), placeholder: "151500" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Increase Entry Signal Time By (seconds)" }), _jsx("input", { type: "number", value: tvParams.input_tv.IncreaseEntrySignalTimeBy || 0, onChange: (e) => setTvParams({
                                                ...tvParams,
                                                input_tv: {
                                                    ...tvParams.input_tv,
                                                    IncreaseEntrySignalTimeBy: Number(e.target.value)
                                                }
                                            }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Increase Exit Signal Time By (seconds)" }), _jsx("input", { type: "number", value: tvParams.input_tv.IncreaseExitSignalTimeBy || 0, onChange: (e) => setTvParams({
                                                ...tvParams,
                                                input_tv: {
                                                    ...tvParams.input_tv,
                                                    IncreaseExitSignalTimeBy: Number(e.target.value)
                                                }
                                            }) })] })] }) })), tvParams.activeSection === 'portfolio_long' && (_jsx("form", { className: "backtest-form", children: _jsxs("div", { className: "form-grid", children: [_jsx("div", { className: "form-group full-width", children: _jsx("h4", { children: "Portfolio Long - Long Portfolio Configurations" }) }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Portfolio ID" }), _jsx("input", { type: "number", value: tvParams.portfolio_long.PortfolioID || 1, onChange: (e) => setTvParams({
                                                ...tvParams,
                                                portfolio_long: {
                                                    ...tvParams.portfolio_long,
                                                    PortfolioID: Number(e.target.value)
                                                }
                                            }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Portfolio Name" }), _jsx("input", { type: "text", value: tvParams.portfolio_long.PortfolioName || "LONG_PORTFOLIO", onChange: (e) => setTvParams({
                                                ...tvParams,
                                                portfolio_long: {
                                                    ...tvParams.portfolio_long,
                                                    PortfolioName: e.target.value
                                                }
                                            }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Start Date" }), _jsx("input", { type: "text", value: tvParams.portfolio_long.StartDate || "01_01_2022", onChange: (e) => setTvParams({
                                                ...tvParams,
                                                portfolio_long: {
                                                    ...tvParams.portfolio_long,
                                                    StartDate: e.target.value
                                                }
                                            }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "End Date" }), _jsx("input", { type: "text", value: tvParams.portfolio_long.EndDate || "01_01_2026", onChange: (e) => setTvParams({
                                                ...tvParams,
                                                portfolio_long: {
                                                    ...tvParams.portfolio_long,
                                                    EndDate: e.target.value
                                                }
                                            }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Portfolio Target (%)" }), _jsx("input", { type: "number", step: "0.1", value: tvParams.portfolio_long.PortfolioTarget || 0, onChange: (e) => setTvParams({
                                                ...tvParams,
                                                portfolio_long: {
                                                    ...tvParams.portfolio_long,
                                                    PortfolioTarget: Number(e.target.value)
                                                }
                                            }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Portfolio Stop Loss (%)" }), _jsx("input", { type: "number", step: "0.1", value: tvParams.portfolio_long.PortfolioStoploss || 0, onChange: (e) => setTvParams({
                                                ...tvParams,
                                                portfolio_long: {
                                                    ...tvParams.portfolio_long,
                                                    PortfolioStoploss: Number(e.target.value)
                                                }
                                            }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Portfolio Trailing Type" }), _jsxs("select", { value: tvParams.portfolio_long.PortfolioTrailingType || "portfolio lock trail", onChange: (e) => setTvParams({
                                                ...tvParams,
                                                portfolio_long: {
                                                    ...tvParams.portfolio_long,
                                                    PortfolioTrailingType: e.target.value
                                                }
                                            }), children: [_jsx("option", { value: "portfolio lock trail", children: "Portfolio Lock Trail" }), _jsx("option", { value: "trail profits", children: "Trail Profits" }), _jsx("option", { value: "lock minimum profit", children: "Lock Minimum Profit" })] })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Increase In Profit" }), _jsx("input", { type: "number", step: "0.1", value: tvParams.portfolio_long.IncreaseInProfit || 0, onChange: (e) => setTvParams({
                                                ...tvParams,
                                                portfolio_long: {
                                                    ...tvParams.portfolio_long,
                                                    IncreaseInProfit: Number(e.target.value)
                                                }
                                            }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Trail Min Profit By" }), _jsx("input", { type: "number", step: "0.1", value: tvParams.portfolio_long.TrailMinProfitBy || 0, onChange: (e) => setTvParams({
                                                ...tvParams,
                                                portfolio_long: {
                                                    ...tvParams.portfolio_long,
                                                    TrailMinProfitBy: Number(e.target.value)
                                                }
                                            }) })] })] }) })), tvParams.activeSection === 'portfolio_short' && (_jsx("form", { className: "backtest-form", children: _jsxs("div", { className: "form-grid", children: [_jsx("div", { className: "form-group full-width", children: _jsx("h4", { children: "Portfolio Short - Short Portfolio Configurations" }) }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Portfolio ID" }), _jsx("input", { type: "number", value: tvParams.portfolio_short.PortfolioID || 2, onChange: (e) => setTvParams({
                                                ...tvParams,
                                                portfolio_short: {
                                                    ...tvParams.portfolio_short,
                                                    PortfolioID: Number(e.target.value)
                                                }
                                            }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Portfolio Name" }), _jsx("input", { type: "text", value: tvParams.portfolio_short.PortfolioName || "SHORT_PORTFOLIO", onChange: (e) => setTvParams({
                                                ...tvParams,
                                                portfolio_short: {
                                                    ...tvParams.portfolio_short,
                                                    PortfolioName: e.target.value
                                                }
                                            }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Start Date" }), _jsx("input", { type: "text", value: tvParams.portfolio_short.StartDate || "01_01_2022", onChange: (e) => setTvParams({
                                                ...tvParams,
                                                portfolio_short: {
                                                    ...tvParams.portfolio_short,
                                                    StartDate: e.target.value
                                                }
                                            }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "End Date" }), _jsx("input", { type: "text", value: tvParams.portfolio_short.EndDate || "01_01_2026", onChange: (e) => setTvParams({
                                                ...tvParams,
                                                portfolio_short: {
                                                    ...tvParams.portfolio_short,
                                                    EndDate: e.target.value
                                                }
                                            }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Portfolio Target (%)" }), _jsx("input", { type: "number", step: "0.1", value: tvParams.portfolio_short.PortfolioTarget || 0, onChange: (e) => setTvParams({
                                                ...tvParams,
                                                portfolio_short: {
                                                    ...tvParams.portfolio_short,
                                                    PortfolioTarget: Number(e.target.value)
                                                }
                                            }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Portfolio Stop Loss (%)" }), _jsx("input", { type: "number", step: "0.1", value: tvParams.portfolio_short.PortfolioStoploss || 0, onChange: (e) => setTvParams({
                                                ...tvParams,
                                                portfolio_short: {
                                                    ...tvParams.portfolio_short,
                                                    PortfolioStoploss: Number(e.target.value)
                                                }
                                            }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Portfolio Trailing Type" }), _jsxs("select", { value: tvParams.portfolio_short.PortfolioTrailingType || "portfolio lock trail", onChange: (e) => setTvParams({
                                                ...tvParams,
                                                portfolio_short: {
                                                    ...tvParams.portfolio_short,
                                                    PortfolioTrailingType: e.target.value
                                                }
                                            }), children: [_jsx("option", { value: "portfolio lock trail", children: "Portfolio Lock Trail" }), _jsx("option", { value: "trail profits", children: "Trail Profits" }), _jsx("option", { value: "lock minimum profit", children: "Lock Minimum Profit" })] })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Increase In Profit" }), _jsx("input", { type: "number", step: "0.1", value: tvParams.portfolio_short.IncreaseInProfit || 0, onChange: (e) => setTvParams({
                                                ...tvParams,
                                                portfolio_short: {
                                                    ...tvParams.portfolio_short,
                                                    IncreaseInProfit: Number(e.target.value)
                                                }
                                            }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Trail Min Profit By" }), _jsx("input", { type: "number", step: "0.1", value: tvParams.portfolio_short.TrailMinProfitBy || 0, onChange: (e) => setTvParams({
                                                ...tvParams,
                                                portfolio_short: {
                                                    ...tvParams.portfolio_short,
                                                    TrailMinProfitBy: Number(e.target.value)
                                                }
                                            }) })] })] }) })), tvParams.activeSection === 'tbs_long' && (_jsx("form", { className: "backtest-form", children: _jsxs("div", { className: "form-grid", children: [_jsx("div", { className: "form-group full-width", children: _jsx("h4", { children: "TBS Long - Trailing Buy Strategy Long Configurations" }) }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Strategy Name" }), _jsx("input", { type: "text", value: tvParams.tbs_long.StrategyName || "TBS_LONG", onChange: (e) => setTvParams({
                                                ...tvParams,
                                                tbs_long: {
                                                    ...tvParams.tbs_long,
                                                    StrategyName: e.target.value
                                                }
                                            }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Index" }), _jsx("input", { type: "text", value: tvParams.tbs_long.Index || "NIFTY", onChange: (e) => setTvParams({
                                                ...tvParams,
                                                tbs_long: {
                                                    ...tvParams.tbs_long,
                                                    Index: e.target.value
                                                }
                                            }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Strategy Type" }), _jsxs("select", { value: tvParams.tbs_long.StrategyType || "BUY", onChange: (e) => setTvParams({
                                                ...tvParams,
                                                tbs_long: {
                                                    ...tvParams.tbs_long,
                                                    StrategyType: e.target.value
                                                }
                                            }), children: [_jsx("option", { value: "BUY", children: "BUY" }), _jsx("option", { value: "SELL", children: "SELL" })] })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Weekdays" }), _jsx("input", { type: "text", value: tvParams.tbs_long.Weekdays || "1,2,3,4,5", onChange: (e) => setTvParams({
                                                ...tvParams,
                                                tbs_long: {
                                                    ...tvParams.tbs_long,
                                                    Weekdays: e.target.value
                                                }
                                            }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "DTE" }), _jsx("input", { type: "number", value: tvParams.tbs_long.DTE || 10, onChange: (e) => setTvParams({
                                                ...tvParams,
                                                tbs_long: {
                                                    ...tvParams.tbs_long,
                                                    DTE: Number(e.target.value)
                                                }
                                            }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Strike Selection Time" }), _jsx("input", { type: "number", value: tvParams.tbs_long.StrikeSelectionTime || 95500, onChange: (e) => setTvParams({
                                                ...tvParams,
                                                tbs_long: {
                                                    ...tvParams.tbs_long,
                                                    StrikeSelectionTime: Number(e.target.value)
                                                }
                                            }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Start Time" }), _jsx("input", { type: "number", value: tvParams.tbs_long.StartTime || 95500, onChange: (e) => setTvParams({
                                                ...tvParams,
                                                tbs_long: {
                                                    ...tvParams.tbs_long,
                                                    StartTime: Number(e.target.value)
                                                }
                                            }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Last Entry Time" }), _jsx("input", { type: "number", value: tvParams.tbs_long.LastEntryTime || 140000, onChange: (e) => setTvParams({
                                                ...tvParams,
                                                tbs_long: {
                                                    ...tvParams.tbs_long,
                                                    LastEntryTime: Number(e.target.value)
                                                }
                                            }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "End Time" }), _jsx("input", { type: "number", value: tvParams.tbs_long.EndTime || 140000, onChange: (e) => setTvParams({
                                                ...tvParams,
                                                tbs_long: {
                                                    ...tvParams.tbs_long,
                                                    EndTime: Number(e.target.value)
                                                }
                                            }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Strategy Profit" }), _jsx("input", { type: "number", value: tvParams.tbs_long.StrategyProfit || 0, onChange: (e) => setTvParams({
                                                ...tvParams,
                                                tbs_long: {
                                                    ...tvParams.tbs_long,
                                                    StrategyProfit: Number(e.target.value)
                                                }
                                            }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Strategy Loss" }), _jsx("input", { type: "number", value: tvParams.tbs_long.StrategyLoss || 0, onChange: (e) => setTvParams({
                                                ...tvParams,
                                                tbs_long: {
                                                    ...tvParams.tbs_long,
                                                    StrategyLoss: Number(e.target.value)
                                                }
                                            }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Strategy Trailing Type" }), _jsxs("select", { value: tvParams.tbs_long.StrategyTrailingType || "Lock & Trail Profits", onChange: (e) => setTvParams({
                                                ...tvParams,
                                                tbs_long: {
                                                    ...tvParams.tbs_long,
                                                    StrategyTrailingType: e.target.value
                                                }
                                            }), children: [_jsx("option", { value: "Lock & Trail Profits", children: "Lock & Trail Profits" }), _jsx("option", { value: "Trail Profits", children: "Trail Profits" }), _jsx("option", { value: "Lock Minimum Profit", children: "Lock Minimum Profit" })] })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Profit Reaches" }), _jsx("input", { type: "number", step: "0.1", value: tvParams.tbs_long.ProfitReaches || 0, onChange: (e) => setTvParams({
                                                ...tvParams,
                                                tbs_long: {
                                                    ...tvParams.tbs_long,
                                                    ProfitReaches: Number(e.target.value)
                                                }
                                            }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Lock Min Profit At" }), _jsx("input", { type: "number", step: "0.1", value: tvParams.tbs_long.LockMinProfitAt || 0, onChange: (e) => setTvParams({
                                                ...tvParams,
                                                tbs_long: {
                                                    ...tvParams.tbs_long,
                                                    LockMinProfitAt: Number(e.target.value)
                                                }
                                            }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Increase In Profit" }), _jsx("input", { type: "number", step: "0.1", value: tvParams.tbs_long.IncreaseInProfit || 0, onChange: (e) => setTvParams({
                                                ...tvParams,
                                                tbs_long: {
                                                    ...tvParams.tbs_long,
                                                    IncreaseInProfit: Number(e.target.value)
                                                }
                                            }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Trail Min Profit By" }), _jsx("input", { type: "number", step: "0.1", value: tvParams.tbs_long.TrailMinProfitBy || 0, onChange: (e) => setTvParams({
                                                ...tvParams,
                                                tbs_long: {
                                                    ...tvParams.tbs_long,
                                                    TrailMinProfitBy: Number(e.target.value)
                                                }
                                            }) })] })] }) })), tvParams.activeSection === 'tbs_short' && (_jsx("form", { className: "backtest-form", children: _jsxs("div", { className: "form-grid", children: [_jsx("div", { className: "form-group full-width", children: _jsx("h4", { children: "TBS Short - Trailing Buy Strategy Short Configurations" }) }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Strategy Name" }), _jsx("input", { type: "text", value: tvParams.tbs_short.StrategyName || "TBS_SHORT", onChange: (e) => setTvParams({
                                                ...tvParams,
                                                tbs_short: {
                                                    ...tvParams.tbs_short,
                                                    StrategyName: e.target.value
                                                }
                                            }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Index" }), _jsx("input", { type: "text", value: tvParams.tbs_short.Index || "NIFTY", onChange: (e) => setTvParams({
                                                ...tvParams,
                                                tbs_short: {
                                                    ...tvParams.tbs_short,
                                                    Index: e.target.value
                                                }
                                            }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Strategy Type" }), _jsxs("select", { value: tvParams.tbs_short.StrategyType || "SELL", onChange: (e) => setTvParams({
                                                ...tvParams,
                                                tbs_short: {
                                                    ...tvParams.tbs_short,
                                                    StrategyType: e.target.value
                                                }
                                            }), children: [_jsx("option", { value: "BUY", children: "BUY" }), _jsx("option", { value: "SELL", children: "SELL" })] })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Weekdays" }), _jsx("input", { type: "text", value: tvParams.tbs_short.Weekdays || "1,2,3,4,5", onChange: (e) => setTvParams({
                                                ...tvParams,
                                                tbs_short: {
                                                    ...tvParams.tbs_short,
                                                    Weekdays: e.target.value
                                                }
                                            }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "DTE" }), _jsx("input", { type: "number", value: tvParams.tbs_short.DTE || 10, onChange: (e) => setTvParams({
                                                ...tvParams,
                                                tbs_short: {
                                                    ...tvParams.tbs_short,
                                                    DTE: Number(e.target.value)
                                                }
                                            }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Strike Selection Time" }), _jsx("input", { type: "number", value: tvParams.tbs_short.StrikeSelectionTime || 95500, onChange: (e) => setTvParams({
                                                ...tvParams,
                                                tbs_short: {
                                                    ...tvParams.tbs_short,
                                                    StrikeSelectionTime: Number(e.target.value)
                                                }
                                            }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Start Time" }), _jsx("input", { type: "number", value: tvParams.tbs_short.StartTime || 95500, onChange: (e) => setTvParams({
                                                ...tvParams,
                                                tbs_short: {
                                                    ...tvParams.tbs_short,
                                                    StartTime: Number(e.target.value)
                                                }
                                            }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Last Entry Time" }), _jsx("input", { type: "number", value: tvParams.tbs_short.LastEntryTime || 140000, onChange: (e) => setTvParams({
                                                ...tvParams,
                                                tbs_short: {
                                                    ...tvParams.tbs_short,
                                                    LastEntryTime: Number(e.target.value)
                                                }
                                            }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "End Time" }), _jsx("input", { type: "number", value: tvParams.tbs_short.EndTime || 140000, onChange: (e) => setTvParams({
                                                ...tvParams,
                                                tbs_short: {
                                                    ...tvParams.tbs_short,
                                                    EndTime: Number(e.target.value)
                                                }
                                            }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Strategy Profit" }), _jsx("input", { type: "number", value: tvParams.tbs_short.StrategyProfit || 0, onChange: (e) => setTvParams({
                                                ...tvParams,
                                                tbs_short: {
                                                    ...tvParams.tbs_short,
                                                    StrategyProfit: Number(e.target.value)
                                                }
                                            }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Strategy Loss" }), _jsx("input", { type: "number", value: tvParams.tbs_short.StrategyLoss || 0, onChange: (e) => setTvParams({
                                                ...tvParams,
                                                tbs_short: {
                                                    ...tvParams.tbs_short,
                                                    StrategyLoss: Number(e.target.value)
                                                }
                                            }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Strategy Trailing Type" }), _jsxs("select", { value: tvParams.tbs_short.StrategyTrailingType || "Lock & Trail Profits", onChange: (e) => setTvParams({
                                                ...tvParams,
                                                tbs_short: {
                                                    ...tvParams.tbs_short,
                                                    StrategyTrailingType: e.target.value
                                                }
                                            }), children: [_jsx("option", { value: "Lock & Trail Profits", children: "Lock & Trail Profits" }), _jsx("option", { value: "Trail Profits", children: "Trail Profits" }), _jsx("option", { value: "Lock Minimum Profit", children: "Lock Minimum Profit" })] })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Profit Reaches" }), _jsx("input", { type: "number", step: "0.1", value: tvParams.tbs_short.ProfitReaches || 0, onChange: (e) => setTvParams({
                                                ...tvParams,
                                                tbs_short: {
                                                    ...tvParams.tbs_short,
                                                    ProfitReaches: Number(e.target.value)
                                                }
                                            }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Lock Min Profit At" }), _jsx("input", { type: "number", step: "0.1", value: tvParams.tbs_short.LockMinProfitAt || 0, onChange: (e) => setTvParams({
                                                ...tvParams,
                                                tbs_short: {
                                                    ...tvParams.tbs_short,
                                                    LockMinProfitAt: Number(e.target.value)
                                                }
                                            }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Increase In Profit" }), _jsx("input", { type: "number", step: "0.1", value: tvParams.tbs_short.IncreaseInProfit || 0, onChange: (e) => setTvParams({
                                                ...tvParams,
                                                tbs_short: {
                                                    ...tvParams.tbs_short,
                                                    IncreaseInProfit: Number(e.target.value)
                                                }
                                            }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Trail Min Profit By" }), _jsx("input", { type: "number", step: "0.1", value: tvParams.tbs_short.TrailMinProfitBy || 0, onChange: (e) => setTvParams({
                                                ...tvParams,
                                                tbs_short: {
                                                    ...tvParams.tbs_short,
                                                    TrailMinProfitBy: Number(e.target.value)
                                                }
                                            }) })] })] }) })), tvParams.activeSection === 'tradingview_backtest' && (_jsx("form", { className: "backtest-form", children: _jsxs("div", { className: "form-grid", children: [_jsx("div", { className: "form-group full-width", children: _jsx("h4", { children: "TradingView Backtest - Overall Backtest Parameters" }) }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Slippage Percent (%)" }), _jsx("input", { type: "number", step: "0.1", value: tvParams.tradingview_backtest.slippage_percent || 0.5, onChange: (e) => setTvParams({
                                                ...tvParams,
                                                tradingview_backtest: {
                                                    ...tvParams.tradingview_backtest,
                                                    slippage_percent: Number(e.target.value)
                                                }
                                            }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Check Interval (seconds)" }), _jsx("input", { type: "number", value: tvParams.tradingview_backtest.check_interval || 60, onChange: (e) => setTvParams({
                                                ...tvParams,
                                                tradingview_backtest: {
                                                    ...tvParams.tradingview_backtest,
                                                    check_interval: Number(e.target.value)
                                                }
                                            }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Broker" }), _jsxs("select", { value: tvParams.tradingview_backtest.broker || "BROKER.PAPER", onChange: (e) => setTvParams({
                                                ...tvParams,
                                                tradingview_backtest: {
                                                    ...tvParams.tradingview_backtest,
                                                    broker: e.target.value
                                                }
                                            }), children: [_jsx("option", { value: "BROKER.PAPER", children: "BROKER.PAPER" }), _jsx("option", { value: "BROKER.ZERODHA", children: "BROKER.ZERODHA" }), _jsx("option", { value: "BROKER.UPSTOX", children: "BROKER.UPSTOX" })] })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Exchange" }), _jsxs("select", { value: tvParams.tradingview_backtest.exchange || "EXCHANGE.NSE", onChange: (e) => setTvParams({
                                                ...tvParams,
                                                tradingview_backtest: {
                                                    ...tvParams.tradingview_backtest,
                                                    exchange: e.target.value
                                                }
                                            }), children: [_jsx("option", { value: "EXCHANGE.NSE", children: "EXCHANGE.NSE" }), _jsx("option", { value: "EXCHANGE.MCX", children: "EXCHANGE.MCX" }), _jsx("option", { value: "EXCHANGE.US", children: "EXCHANGE.US" })] })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Order Type" }), _jsxs("select", { value: tvParams.tradingview_backtest.order_type || "ORDERTYPE.MARKET", onChange: (e) => setTvParams({
                                                ...tvParams,
                                                tradingview_backtest: {
                                                    ...tvParams.tradingview_backtest,
                                                    order_type: e.target.value
                                                }
                                            }), children: [_jsx("option", { value: "ORDERTYPE.MARKET", children: "ORDERTYPE.MARKET" }), _jsx("option", { value: "ORDERTYPE.LIMIT", children: "ORDERTYPE.LIMIT" }), _jsx("option", { value: "ORDERTYPE.SL", children: "ORDERTYPE.SL" })] })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Product Type" }), _jsxs("select", { value: tvParams.tradingview_backtest.product_type || "PRODUCTTYPE.NRML", onChange: (e) => setTvParams({
                                                ...tvParams,
                                                tradingview_backtest: {
                                                    ...tvParams.tradingview_backtest,
                                                    product_type: e.target.value
                                                }
                                            }), children: [_jsx("option", { value: "PRODUCTTYPE.NRML", children: "PRODUCTTYPE.NRML" }), _jsx("option", { value: "PRODUCTTYPE.MIS", children: "PRODUCTTYPE.MIS" }), _jsx("option", { value: "PRODUCTTYPE.CNC", children: "PRODUCTTYPE.CNC" })] })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Feed Source" }), _jsxs("select", { value: tvParams.tradingview_backtest.feed_source || "FEEDSOURCE.HISTORICAL", onChange: (e) => setTvParams({
                                                ...tvParams,
                                                tradingview_backtest: {
                                                    ...tvParams.tradingview_backtest,
                                                    feed_source: e.target.value
                                                }
                                            }), children: [_jsx("option", { value: "FEEDSOURCE.HISTORICAL", children: "FEEDSOURCE.HISTORICAL" }), _jsx("option", { value: "FEEDSOURCE.LIVE", children: "FEEDSOURCE.LIVE" })] })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Fixed VIX Value" }), _jsx("input", { type: "number", value: tvParams.tradingview_backtest.fix_vix || 0, onChange: (e) => setTvParams({
                                                ...tvParams,
                                                tradingview_backtest: {
                                                    ...tvParams.tradingview_backtest,
                                                    fix_vix: Number(e.target.value)
                                                }
                                            }) })] })] }) })), _jsxs("div", { className: "form-actions", children: [_jsx("button", { type: "button", className: "btn btn-secondary", onClick: async () => {
                                    try {
                                        const response = await apiClient.getTradingViewBacktestInput();
                                        const data = response.data;
                                        setTvParams({
                                            ...tvParams,
                                            tbs_long: data.tbs_long || {},
                                            tbs_short: data.tbs_short || {},
                                            portfolio_long: data.portfolio_long || {},
                                            portfolio_short: data.portfolio_short || {},
                                            input_tv: data.input_tv || {},
                                            tradingview_backtest: data.tradingview_backtest || {}
                                        });
                                        show('success', 'Current TradingView input loaded successfully!');
                                    }
                                    catch (error) {
                                        show('danger', 'Failed to load TradingView input');
                                    }
                                }, children: "\uD83D\uDCCB Load Current Input" }), _jsxs("div", { className: "form-group file-upload-group", children: [_jsxs("label", { children: ["\uD83D\uDCC1 Upload Excel/CSV File for Current Tab (", tvParams.activeSection, ")"] }), _jsxs("div", { className: "file-upload-container", children: [_jsx("input", { id: "file-upload", type: "file", accept: ".csv,.xlsx,.xls,.xlsm", onChange: (e) => setUploadFile(e.target.files?.[0] || null), className: "file-input" }), _jsx("button", { type: "button", className: "btn btn-info", onClick: handleFileUpload, disabled: !uploadFile || isUploading, children: isUploading ? '⏳ Uploading...' : '📤 Upload & Convert' })] }), _jsx("small", { className: "form-help", children: "Upload CSV or Excel files to convert to JSON format. The converted data will populate the current active tab." })] }), uploadedData && (_jsxs("div", { className: "form-group uploaded-data-display", children: [_jsxs("label", { children: ["\uD83D\uDCC4 Uploaded File Content - ", uploadedData.filename] }), _jsx("div", { className: "json-display", children: _jsx("pre", { children: JSON.stringify(uploadedData.json_data, null, 2) }) }), _jsx("button", { type: "button", className: "btn btn-secondary btn-sm", onClick: () => setUploadedData(null), children: "\u2715 Hide" })] })), _jsx("button", { type: "button", className: "btn btn-secondary", onClick: async () => {
                                    try {
                                        // Save each file individually
                                        await Promise.all([
                                            apiClient.updateTradingViewBacktestFile('tbs_long', tvParams.tbs_long),
                                            apiClient.updateTradingViewBacktestFile('tbs_short', tvParams.tbs_short),
                                            apiClient.updateTradingViewBacktestFile('portfolio_long', tvParams.portfolio_long),
                                            apiClient.updateTradingViewBacktestFile('portfolio_short', tvParams.portfolio_short),
                                            apiClient.updateTradingViewBacktestFile('input_tv', tvParams.input_tv),
                                            apiClient.updateTradingViewBacktestFile('tradingview_backtest', tvParams.tradingview_backtest)
                                        ]);
                                        show('success', 'TradingView configuration saved successfully!');
                                    }
                                    catch (error) {
                                        show('danger', 'Failed to save TradingView configuration');
                                    }
                                }, children: "\uD83D\uDCBE Save Configuration" }), _jsx("button", { type: "button", className: "btn btn-primary", onClick: runTradingViewBacktest, disabled: isRunning, children: isRunning ? 'Running TradingView Backtest...' : 'Run TradingView Backtest' })] })] })), renderResults()] }));
};
export default BacktestConfigurationPage;
