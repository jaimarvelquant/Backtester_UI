import React, { useMemo, useState } from 'react';
import { useApiClient } from '@hooks/useApiClient';
import { useAlert } from '@context/AlertContext';
import { useLoading } from '@context/LoadingContext';
import {
  type BacktestOption
} from '@data/simpleBacktestData';

import '../Portfolio/PortfolioPages.css';

type TabKey = 'simple' | 'tradingview';

interface SimpleBacktestFormState {
  symbol: string;
  strategy: string;
  startDate: string;
  endDate: string;
  capital: string;
  quantity: string;
  target: string;
  stopLoss: string;
  isTickBacktest: 'YES' | 'NO';
  enabled: 'YES' | 'NO';
  portfolioName: string;
  portfolioTarget: string;
  portfolioStopLoss: string;
  portfolioTrailingType: string;
  pnlCalculationTime: string;
  lockPercent: string;
  trailPercent: string;
  squareOff1Time: string;
  squareOff1Percent: string;
  squareOff2Time: string;
  squareOff2Percent: string;
  profitReaches: string;
  lockMinProfitAt: string;
  increaseInProfit: string;
  trailMinProfitBy: string;
  multiplier: string;
  slippagePercent: string;
}

type AlertTone = 'success' | 'danger' | 'info';

interface SimpleServiceStatistics {
  total_trades?: number;
  winning_trades?: number;
  losing_trades?: number;
  win_rate?: number;
  total_pnl?: number;
  net_pnl?: number;
  total_charges?: number;
  average_trade_pnl?: number;
  max_profit?: number;
  max_loss?: number;
  [key: string]: unknown;
}

interface SimpleServiceResponse {
  success?: boolean;
  message?: string;
  output_file?: string;
  statistics?: SimpleServiceStatistics;
  [key: string]: unknown;
}

interface LabeledResult {
  label: string;
  payload: unknown;
}

const STRATEGY_CHOICES: BacktestOption[] = [
  { value: 'moving_average', label: 'Moving Average' },
  { value: 'rsi', label: 'RSI' },
  { value: 'macd', label: 'MACD' },
  { value: 'bollinger', label: 'Bollinger Bands' }
];

const DEFAULT_SIMPLE_FORM: SimpleBacktestFormState = {
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
  slippagePercent: '0.5'
};

const toNumber = (value: string): number => {
  if (value === '' || value === undefined || value === null) {
    return 0;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const formatDateForBackend = (isoDate: string): string => {
  if (!isoDate) {
    return '';
  }

  const [year, month, day] = isoDate.split('-');
  if (!year || !month || !day) {
    return isoDate.replace(/-/g, '_');
  }

  return `${day}_${month}_${year}`;
};

const interpretSuccess = (status: unknown): boolean => {
  if (typeof status === 'string') {
    return status.toLowerCase() === 'success';
  }

  if (typeof status === 'boolean') {
    return status;
  }

  return Boolean(status);
};

const formatStatValue = (value: unknown, fractionDigits = 2): string => {
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

const buildStatisticItems = (statistics?: SimpleServiceStatistics) => {
  if (!statistics) {
    return [] as Array<{ label: string; value: string }>;
  }

  const winRatePercent =
    typeof statistics.win_rate === 'number' && Number.isFinite(statistics.win_rate)
      ? statistics.win_rate * 100
      : undefined;

  const items: Array<{ label: string; value: string }> = [
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

const normalizeSimpleServiceResponse = (
  payload: unknown,
  fallbackMessage?: string
): SimpleServiceResponse | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const source = payload as Record<string, unknown>;
  const normalized: SimpleServiceResponse = {
    success: typeof source.success === 'boolean' ? source.success : undefined,
    message: typeof source.message === 'string' ? source.message : fallbackMessage,
    output_file: typeof source.output_file === 'string' ? source.output_file : undefined
  };

  if (typeof source.statistics === 'object' && source.statistics !== null) {
    normalized.statistics = source.statistics as SimpleServiceStatistics;
  }

  if (typeof source.data === 'object' && source.data !== null) {
    const data = source.data as Record<string, unknown>;

    if (!normalized.statistics && typeof data.statistics === 'object' && data.statistics !== null) {
      normalized.statistics = data.statistics as SimpleServiceStatistics;
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

const buildSimpleBacktestPayload = (form: SimpleBacktestFormState) => ({
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
  StrategyParameters: [],
  LegParameters: []
});

const BacktestConfigurationPage: React.FC = () => {
  const apiClient = useApiClient();
  const { show } = useAlert();
  const { withLoader } = useLoading();
  const [activeTab, setActiveTab] = useState<TabKey>('simple');
  const [simpleForm, setSimpleForm] = useState<SimpleBacktestFormState>(DEFAULT_SIMPLE_FORM);

  const [tvParams, setTvParams] = useState({
    name: 'TradingView Strategy',
    activeSection: 'input_tv' as 'input_tv' | 'portfolio_long' | 'portfolio_short' | 'tbs_long' | 'tbs_short' | 'tradingview_backtest',
    tbs_long: {} as Record<string, unknown>,
    tbs_short: {} as Record<string, unknown>,
    portfolio_short: {} as Record<string, unknown>,
    portfolio_long: {} as Record<string, unknown>,
    input_tv: {} as Record<string, unknown>,
    tradingview_backtest: {} as Record<string, unknown>
  });

  const [results, setResults] = useState<LabeledResult | null>(null);
  const [simpleServiceInput, setSimpleServiceInput] = useState<unknown>(null);
  const [simpleServiceResults, setSimpleServiceResults] = useState<SimpleServiceResponse | null>(null);
  const [serviceBanner, setServiceBanner] = useState<{ tone: AlertTone; message: string }>({
    tone: 'success',
    message: 'All backend services are running! Ready to test backtest strategies.'
  });
  const [pendingServiceAction, setPendingServiceAction] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedData, setUploadedData] = useState<{json_data: any, filename: string} | null>(null);

  const serviceBusy = pendingServiceAction !== null;


  const simpleServiceStatItems = useMemo(
    () => buildStatisticItems(simpleServiceResults?.statistics),
    [simpleServiceResults]
  );

  const updateSimpleForm = <K extends keyof SimpleBacktestFormState>(key: K, value: SimpleBacktestFormState[K]) => {
    setSimpleForm((prev) => ({ ...prev, [key]: value }));
  };

  const runGatewayBacktest = async () => {
    try {
      setIsRunning(true);
      const response = await withLoader(async () => {
        const payload = buildSimpleBacktestPayload(simpleForm);
        return await apiClient.runDirectBacktest(payload);
      });

      setResults({ label: 'API Gateway Backtest', payload: response });

      const responseStatus = (response as { status?: unknown } | null)?.status;

      if (interpretSuccess(responseStatus)) {
        show('success', 'Simple backtest completed successfully!');
      } else {
        const errorMessage =
          (response as { message?: unknown } | null)?.message ??
          (response as { error?: unknown } | null)?.error ??
          (response as { errorMessage?: unknown } | null)?.errorMessage ??
          'Simple backtest failed';
        show('danger', String(errorMessage));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Simple backtest execution failed';
      show('danger', message);
    } finally {
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
      } else {
        show('danger', response.data.message || 'TradingView backtest failed');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'TradingView backtest execution failed';
      show('danger', message);
    } finally {
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
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }
      } else {
        show('danger', result.message || 'File upload failed');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'File upload failed';
      show('danger', message);
    } finally {
      setIsUploading(false);
    }
  };

  
  const updateServiceStatus = (tone: AlertTone, message: string) => {
    setServiceBanner({ tone, message });
  };

  const handleCreateTemplate = async () => {
    setPendingServiceAction('create-template');
    try {
      const response = await withLoader(async () => apiClient.createSimpleBacktestTemplate());
      const message = (response as { message?: unknown })?.message ?? 'Input template created successfully.';
      updateServiceStatus('success', String(message));
      show('success', String(message));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create input template.';
      updateServiceStatus('danger', message);
      show('danger', message);
    } finally {
      setPendingServiceAction(null);
    }
  };

  const handleLoadInput = async () => {
    setPendingServiceAction('load-input');
    try {
      const response = await withLoader(async () => apiClient.getSimpleBacktestInput());
      const success = interpretSuccess((response as { success?: unknown })?.success);
      const message = (response as { message?: unknown })?.message ?? 'Loaded current input parameters.';

      if (success) {
        const data = (response as { data?: unknown })?.data ?? response;
        setSimpleServiceInput(data);
        updateServiceStatus('info', String(message));
        show('success', 'Fetched current simple backtest input.');
      } else {
        updateServiceStatus('danger', String(message));
        show('danger', String(message));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load input parameters.';
      updateServiceStatus('danger', message);
      show('danger', message);
    } finally {
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

      const success = interpretSuccess((response as { success?: unknown })?.success ?? normalized?.success);
      const message = (response as { message?: unknown })?.message ?? normalized?.message ?? 'Sample backtest completed successfully.';

      updateServiceStatus(success ? 'success' : 'danger', String(message));
      show(success ? 'success' : 'danger', String(message));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to run sample backtest.';
      updateServiceStatus('danger', message);
      show('danger', message);
    } finally {
      setPendingServiceAction(null);
    }
  };

  const runSimpleServiceBacktest = async () => {
    setPendingServiceAction('run-service');
    try {
      const payload = buildSimpleBacktestPayload(simpleForm);
      const response = await withLoader(async () => apiClient.runSimpleBacktestWithData(payload));
      const normalized = normalizeSimpleServiceResponse(response, 'Backtest completed via Simple Backtest service.');
      setSimpleServiceResults(normalized);
      setResults({ label: 'Simple Backtest Service · Run With Data', payload: response });

      const success = interpretSuccess((response as { success?: unknown })?.success ?? normalized?.success);
      const message = (response as { message?: unknown })?.message ?? normalized?.message ?? 'Backtest completed via Simple Backtest service.';

      updateServiceStatus(success ? 'success' : 'danger', String(message));
      show(success ? 'success' : 'danger', String(message));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to run simple backtest service.';
      updateServiceStatus('danger', message);
      show('danger', message);
    } finally {
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

      const success = interpretSuccess((response as { success?: unknown })?.success ?? normalized?.success);
      const message = (response as { message?: unknown })?.message ?? normalized?.message ?? 'Fetched latest simple backtest results.';

      updateServiceStatus(success ? 'info' : 'danger', String(message));
      show(success ? 'success' : 'danger', String(message));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch simple backtest results.';
      updateServiceStatus('danger', message);
      show('danger', message);
    } finally {
      setPendingServiceAction(null);
    }
  };

  const handleClearServicePanels = () => {
    setSimpleServiceInput(null);
    setSimpleServiceResults(null);
    updateServiceStatus('info', 'Cleared Simple Backtest service panels.');
  };

  const renderResults = () => {
    if (!results) return null;

    return (
      <section className="card">
        <div className="card__header">
          <h3>{results.label}</h3>
        </div>
        <div className="results-container">
          <pre className="results-json">
            {JSON.stringify(results.payload, null, 2)}
          </pre>
        </div>
      </section>
    );
  };

  return (
    <div className="portfolio-page">
      <header className="portfolio-page__header">
        <div>
          <h2>Backtest Configuration</h2>
          <p>Configure and run backtests using the Python backend services.</p>
        </div>
      </header>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'simple' ? 'active' : ''}`}
          onClick={() => setActiveTab('simple')}
        >
          Simple Backtest
        </button>
        <button
          className={`tab ${activeTab === 'tradingview' ? 'active' : ''}`}
          onClick={() => setActiveTab('tradingview')}
        >
          TradingView Backtest
        </button>
      </div>

      {activeTab === 'simple' && (
        <section className="card">
          <div className="card__header">
            <h3>Simple Backtest Configuration</h3>
            <p>Configure and trigger the Python backtest service with the same controls as the standalone tool.</p>
          </div>
          <div className={`status-banner ${serviceBanner.tone}`}>
            {serviceBanner.message}
          </div>

          <div className="service-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                if (!serviceBusy) void handleCreateTemplate();
              }}
              disabled={serviceBusy}
            >
              Create Template
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                if (!serviceBusy) void handleLoadInput();
              }}
              disabled={serviceBusy}
            >
              Load Input
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                if (!serviceBusy) void handleLoadSample();
              }}
              disabled={serviceBusy}
            >
              Run Sample
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                if (!serviceBusy) void runSimpleServiceBacktest();
              }}
              disabled={serviceBusy}
            >
              Run Simple Service
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                if (!serviceBusy) void handleFetchResults();
              }}
              disabled={serviceBusy}
            >
              Fetch Results
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClearServicePanels}
              disabled={serviceBusy}
            >
              Clear Panels
            </button>
          </div>

          {simpleServiceInput && (
            <div className="info-box">
              <h4>Current Simple Backtest Input</h4>
              <details>
                <summary>View JSON</summary>
                <pre className="results-json">{JSON.stringify(simpleServiceInput, null, 2)}</pre>
              </details>
            </div>
          )}

          {simpleServiceResults && (
            <div className="info-box">
              <h4>Simple Backtest Service Summary</h4>
              {typeof simpleServiceResults.message === 'string' && (
                <p>
                  <strong>Status:</strong> {simpleServiceResults.message}
                </p>
              )}
              {simpleServiceResults.output_file && (
                <p>
                  <strong>Output File:</strong> {simpleServiceResults.output_file}
                </p>
              )}
              {simpleServiceStatItems.length > 0 ? (
                <div className="stats-grid">
                  {simpleServiceStatItems.map((item) => (
                    <div key={item.label} className="stat-card">
                      <div className="stat-value">{item.value}</div>
                      <div className="stat-label">{item.label}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No statistics available yet.</p>
              )}
              <details>
                <summary>View service response</summary>
                <pre className="results-json">{JSON.stringify(simpleServiceResults, null, 2)}</pre>
              </details>
            </div>
          )}

          <form
            className="backtest-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (!isRunning) {
                void runGatewayBacktest();
              }
            }}
          >
            <div className="form-grid">
              <div className="form-group full-width">
                <h4>Strategy Overview</h4>
              </div>

              <div className="form-group">
                <label>Symbol</label>
                <input
                  type="text"
                  value={simpleForm.symbol}
                  onChange={(event) => updateSimpleForm('symbol', event.target.value)}
                  placeholder="NIFTY"
                  required
                />
              </div>

              <div className="form-group">
                <label>Strategy</label>
                <select
                  value={simpleForm.strategy}
                  onChange={(event) => updateSimpleForm('strategy', event.target.value)}
                >
                  {STRATEGY_CHOICES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Start Date</label>
                <input
                  type="date"
                  value={simpleForm.startDate}
                  onChange={(event) => updateSimpleForm('startDate', event.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>End Date</label>
                <input
                  type="date"
                  value={simpleForm.endDate}
                  onChange={(event) => updateSimpleForm('endDate', event.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Initial Capital</label>
                <input
                  type="number"
                  value={simpleForm.capital}
                  onChange={(event) => updateSimpleForm('capital', event.target.value)}
                  min="0"
                  step="1"
                  required
                />
              </div>

              <div className="form-group">
                <label>Quantity</label>
                <input
                  type="number"
                  value={simpleForm.quantity}
                  onChange={(event) => updateSimpleForm('quantity', event.target.value)}
                  min="1"
                  step="1"
                  required
                />
              </div>

              <div className="form-group">
                <label>Target (%)</label>
                <input
                  type="number"
                  value={simpleForm.target}
                  onChange={(event) => updateSimpleForm('target', event.target.value)}
                  step="0.1"
                />
              </div>

              <div className="form-group">
                <label>Stop Loss (%)</label>
                <input
                  type="number"
                  value={simpleForm.stopLoss}
                  onChange={(event) => updateSimpleForm('stopLoss', event.target.value)}
                  step="0.1"
                />
              </div>

              <div className="form-group">
                <label>Is Tick Backtest</label>
                <select
                  value={simpleForm.isTickBacktest}
                  onChange={(event) =>
                    updateSimpleForm('isTickBacktest', event.target.value as SimpleBacktestFormState['isTickBacktest'])
                  }
                >
                  <option value="NO">NO</option>
                  <option value="YES">YES</option>
                </select>
              </div>

              <div className="form-group">
                <label>Enabled</label>
                <select
                  value={simpleForm.enabled}
                  onChange={(event) =>
                    updateSimpleForm('enabled', event.target.value as SimpleBacktestFormState['enabled'])
                  }
                >
                  <option value="YES">YES</option>
                  <option value="NO">NO</option>
                </select>
              </div>

              <div className="form-group full-width">
                <h4>Portfolio Controls</h4>
              </div>

              <div className="form-group">
                <label>Portfolio Name</label>
                <input
                  type="text"
                  value={simpleForm.portfolioName}
                  onChange={(event) => updateSimpleForm('portfolioName', event.target.value)}
                  placeholder="CRUDE"
                />
              </div>

              <div className="form-group">
                <label>Portfolio Target (%)</label>
                <input
                  type="number"
                  value={simpleForm.portfolioTarget}
                  onChange={(event) => updateSimpleForm('portfolioTarget', event.target.value)}
                  step="0.1"
                />
              </div>

              <div className="form-group">
                <label>Portfolio Stop Loss (%)</label>
                <input
                  type="number"
                  value={simpleForm.portfolioStopLoss}
                  onChange={(event) => updateSimpleForm('portfolioStopLoss', event.target.value)}
                  step="0.1"
                />
              </div>

              <div className="form-group">
                <label>Portfolio Trailing Type</label>
                <input
                  type="text"
                  value={simpleForm.portfolioTrailingType}
                  onChange={(event) => updateSimpleForm('portfolioTrailingType', event.target.value)}
                  placeholder="portfolio lock trail"
                />
              </div>

              <div className="form-group">
                <label>PnL Calculation Time</label>
                <input
                  type="number"
                  value={simpleForm.pnlCalculationTime}
                  onChange={(event) => updateSimpleForm('pnlCalculationTime', event.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Lock Percent (%)</label>
                <input
                  type="number"
                  value={simpleForm.lockPercent}
                  onChange={(event) => updateSimpleForm('lockPercent', event.target.value)}
                  step="0.1"
                />
              </div>

              <div className="form-group">
                <label>Trail Percent (%)</label>
                <input
                  type="number"
                  value={simpleForm.trailPercent}
                  onChange={(event) => updateSimpleForm('trailPercent', event.target.value)}
                  step="0.1"
                />
              </div>

              <div className="form-group full-width">
                <h4>Square Off & Profit Management</h4>
              </div>

              <div className="form-group">
                <label>Square Off 1 Time</label>
                <input
                  type="number"
                  value={simpleForm.squareOff1Time}
                  onChange={(event) => updateSimpleForm('squareOff1Time', event.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Square Off 1 Percent (%)</label>
                <input
                  type="number"
                  value={simpleForm.squareOff1Percent}
                  onChange={(event) => updateSimpleForm('squareOff1Percent', event.target.value)}
                  step="0.1"
                />
              </div>

              <div className="form-group">
                <label>Square Off 2 Time</label>
                <input
                  type="number"
                  value={simpleForm.squareOff2Time}
                  onChange={(event) => updateSimpleForm('squareOff2Time', event.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Square Off 2 Percent (%)</label>
                <input
                  type="number"
                  value={simpleForm.squareOff2Percent}
                  onChange={(event) => updateSimpleForm('squareOff2Percent', event.target.value)}
                  step="0.1"
                />
              </div>

              <div className="form-group">
                <label>Profit Reaches</label>
                <input
                  type="number"
                  value={simpleForm.profitReaches}
                  onChange={(event) => updateSimpleForm('profitReaches', event.target.value)}
                  step="0.1"
                />
              </div>

              <div className="form-group">
                <label>Lock Min Profit At</label>
                <input
                  type="number"
                  value={simpleForm.lockMinProfitAt}
                  onChange={(event) => updateSimpleForm('lockMinProfitAt', event.target.value)}
                  step="0.1"
                />
              </div>

              <div className="form-group">
                <label>Increase In Profit</label>
                <input
                  type="number"
                  value={simpleForm.increaseInProfit}
                  onChange={(event) => updateSimpleForm('increaseInProfit', event.target.value)}
                  step="0.1"
                />
              </div>

              <div className="form-group">
                <label>Trail Min Profit By</label>
                <input
                  type="number"
                  value={simpleForm.trailMinProfitBy}
                  onChange={(event) => updateSimpleForm('trailMinProfitBy', event.target.value)}
                  step="0.1"
                />
              </div>

              <div className="form-group full-width">
                <h4>Execution Parameters</h4>
              </div>

              <div className="form-group">
                <label>Multiplier</label>
                <input
                  type="number"
                  value={simpleForm.multiplier}
                  onChange={(event) => updateSimpleForm('multiplier', event.target.value)}
                  step="0.1"
                />
              </div>

              <div className="form-group">
                <label>Slippage Percent (%)</label>
                <input
                  type="number"
                  value={simpleForm.slippagePercent}
                  onChange={(event) => updateSimpleForm('slippagePercent', event.target.value)}
                  step="0.1"
                />
              </div>

  

            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isRunning}
              >
                {isRunning ? 'Running Gateway Backtest...' : 'Run via API Gateway'}
              </button>
            </div>
          </form>
        </section>
      )}

      {activeTab === 'tradingview' && (
        <section className="card">
          <div className="card__header">
            <h3>TradingView Backtest Configuration</h3>
            <p>Configure parameters for TradingView signal-based backtesting using multiple JSON input files.</p>
          </div>

          <div className="info-box">
            <p><strong>TradingView Backtest uses 6 JSON files:</strong></p>
            <ul>
              <li><strong>TBS Long:</strong> Trailing Buy Strategy long configurations</li>
              <li><strong>TBS Short:</strong> Trailing Buy Strategy short configurations</li>
              <li><strong>Portfolio Long:</strong> Long portfolio configurations</li>
              <li><strong>Portfolio Short:</strong> Short portfolio configurations</li>
              <li><strong>Input TV:</strong> Main TradingView signal configurations</li>
              <li><strong>TradingView Backtest:</strong> Overall backtest parameters</li>
            </ul>
            <p>The system automatically loads and combines parameters from all configured files.</p>
          </div>

          <div className="tradingview-tabs">
            <button
              className={`tv-tab ${tvParams.activeSection === 'input_tv' ? 'active' : ''}`}
              onClick={() => setTvParams({...tvParams, activeSection: 'input_tv'})}
            >
              Input TV
            </button>
            <button
              className={`tv-tab ${tvParams.activeSection === 'portfolio_long' ? 'active' : ''}`}
              onClick={() => setTvParams({...tvParams, activeSection: 'portfolio_long'})}
            >
              Portfolio Long
            </button>
            <button
              className={`tv-tab ${tvParams.activeSection === 'portfolio_short' ? 'active' : ''}`}
              onClick={() => setTvParams({...tvParams, activeSection: 'portfolio_short'})}
            >
              Portfolio Short
            </button>
            <button
              className={`tv-tab ${tvParams.activeSection === 'tbs_long' ? 'active' : ''}`}
              onClick={() => setTvParams({...tvParams, activeSection: 'tbs_long'})}
            >
              TBS Long
            </button>
            <button
              className={`tv-tab ${tvParams.activeSection === 'tbs_short' ? 'active' : ''}`}
              onClick={() => setTvParams({...tvParams, activeSection: 'tbs_short'})}
            >
              TBS Short
            </button>
            <button
              className={`tv-tab ${tvParams.activeSection === 'tradingview_backtest' ? 'active' : ''}`}
              onClick={() => setTvParams({...tvParams, activeSection: 'tradingview_backtest'})}
            >
              TradingView Backtest
            </button>
          </div>

          {tvParams.activeSection === 'input_tv' && (
            <form className="backtest-form">
              <div className="form-grid">
                <div className="form-group full-width">
                  <h4>Input TV - Main TradingView Signal Configurations</h4>
                </div>

                <div className="form-group">
                  <label>Strategy Name</label>
                  <input
                    type="text"
                    value={tvParams.name}
                    onChange={(e) => setTvParams({...tvParams, name: e.target.value})}
                    placeholder="Enter strategy name"
                  />
                </div>

                <div className="form-group">
                  <label>Start Date (DD_MM_YYYY)</label>
                  <input
                    type="text"
                    value={tvParams.input_tv.StartDate || "01_01_2022"}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      input_tv: {
                        ...tvParams.input_tv,
                        StartDate: e.target.value
                      }
                    })}
                    placeholder="01_01_2022"
                  />
                </div>

                <div className="form-group">
                  <label>End Date (DD_MM_YYYY)</label>
                  <input
                    type="text"
                    value={tvParams.input_tv.EndDate || "01_01_2026"}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      input_tv: {
                        ...tvParams.input_tv,
                        EndDate: e.target.value
                      }
                    })}
                    placeholder="01_01_2026"
                  />
                </div>

                <div className="form-group">
                  <label>Signal Date Time Format</label>
                  <input
                    type="text"
                    value={tvParams.input_tv.SignalDateFormat || "%m/%d/%Y %H:%M:%S"}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      input_tv: {
                        ...tvParams.input_tv,
                        SignalDateFormat: e.target.value
                      }
                    })}
                    placeholder="%m/%d/%Y %H:%M:%S"
                  />
                </div>

                <div className="form-group">
                  <label>Manual Trade Entry Time</label>
                  <input
                    type="number"
                    value={tvParams.input_tv.ManualTradeEntryTime || 0}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      input_tv: {
                        ...tvParams.input_tv,
                        ManualTradeEntryTime: Number(e.target.value)
                      }
                    })}
                  />
                </div>

                <div className="form-group">
                  <label>Manual Trade Lots</label>
                  <input
                    type="number"
                    value={tvParams.input_tv.ManualTradeLots || 1}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      input_tv: {
                        ...tvParams.input_tv,
                        ManualTradeLots: Number(e.target.value)
                      }
                    })}
                  />
                </div>

                <div className="form-group">
                  <label>First Trade Entry Time</label>
                  <input
                    type="number"
                    value={tvParams.input_tv.FirstTradeEntryTime || 0}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      input_tv: {
                        ...tvParams.input_tv,
                        FirstTradeEntryTime: Number(e.target.value)
                      }
                    })}
                  />
                </div>

                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={tvParams.input_tv.TvExitApplicable === "yes"}
                      onChange={(e) => setTvParams({
                        ...tvParams,
                        input_tv: {
                          ...tvParams.input_tv,
                          TvExitApplicable: e.target.checked ? "yes" : "no"
                        }
                      })}
                    />
                    TradingView Exit Applicable
                  </label>
                </div>

                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={tvParams.input_tv.DoRollover === "yes"}
                      onChange={(e) => setTvParams({
                        ...tvParams,
                        input_tv: {
                          ...tvParams.input_tv,
                          DoRollover: e.target.checked ? "yes" : "no"
                        }
                      })}
                    />
                    Do Rollover
                  </label>
                </div>

                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={tvParams.input_tv.IntradaySqOffApplicable === "yes"}
                      onChange={(e) => setTvParams({
                        ...tvParams,
                        input_tv: {
                          ...tvParams.input_tv,
                          IntradaySqOffApplicable: e.target.checked ? "yes" : "no"
                        }
                      })}
                    />
                    Intraday Square Off Applicable
                  </label>
                </div>

                <div className="form-group">
                  <label>Intraday Exit Time (HHMMSS)</label>
                  <input
                    type="text"
                    value={tvParams.input_tv.IntradayExitTime || "151500"}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      input_tv: {
                        ...tvParams.input_tv,
                        IntradayExitTime: Number(e.target.value)
                      }
                    })}
                    placeholder="151500"
                  />
                </div>

                <div className="form-group">
                  <label>Expiry Day Exit Time (HHMMSS)</label>
                  <input
                    type="text"
                    value={tvParams.input_tv.ExpiryDayExitTime || "151500"}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      input_tv: {
                        ...tvParams.input_tv,
                        ExpiryDayExitTime: Number(e.target.value)
                      }
                    })}
                    placeholder="151500"
                  />
                </div>

                <div className="form-group">
                  <label>Rollover Time (HHMMSS)</label>
                  <input
                    type="text"
                    value={tvParams.input_tv.RolloverTime || "151500"}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      input_tv: {
                        ...tvParams.input_tv,
                        RolloverTime: Number(e.target.value)
                      }
                    })}
                    placeholder="151500"
                  />
                </div>

                <div className="form-group">
                  <label>Increase Entry Signal Time By (seconds)</label>
                  <input
                    type="number"
                    value={tvParams.input_tv.IncreaseEntrySignalTimeBy || 0}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      input_tv: {
                        ...tvParams.input_tv,
                        IncreaseEntrySignalTimeBy: Number(e.target.value)
                      }
                    })}
                  />
                </div>

                <div className="form-group">
                  <label>Increase Exit Signal Time By (seconds)</label>
                  <input
                    type="number"
                    value={tvParams.input_tv.IncreaseExitSignalTimeBy || 0}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      input_tv: {
                        ...tvParams.input_tv,
                        IncreaseExitSignalTimeBy: Number(e.target.value)
                      }
                    })}
                  />
                </div>
              </div>
            </form>
          )}

          {tvParams.activeSection === 'portfolio_long' && (
            <form className="backtest-form">
              <div className="form-grid">
                <div className="form-group full-width">
                  <h4>Portfolio Long - Long Portfolio Configurations</h4>
                </div>

                <div className="form-group">
                  <label>Portfolio ID</label>
                  <input
                    type="number"
                    value={tvParams.portfolio_long.PortfolioID || 1}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      portfolio_long: {
                        ...tvParams.portfolio_long,
                        PortfolioID: Number(e.target.value)
                      }
                    })}
                  />
                </div>

                <div className="form-group">
                  <label>Portfolio Name</label>
                  <input
                    type="text"
                    value={tvParams.portfolio_long.PortfolioName || "LONG_PORTFOLIO"}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      portfolio_long: {
                        ...tvParams.portfolio_long,
                        PortfolioName: e.target.value
                      }
                    })}
                  />
                </div>

                <div className="form-group">
                  <label>Start Date</label>
                  <input
                    type="text"
                    value={tvParams.portfolio_long.StartDate || "01_01_2022"}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      portfolio_long: {
                        ...tvParams.portfolio_long,
                        StartDate: e.target.value
                      }
                    })}
                  />
                </div>

                <div className="form-group">
                  <label>End Date</label>
                  <input
                    type="text"
                    value={tvParams.portfolio_long.EndDate || "01_01_2026"}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      portfolio_long: {
                        ...tvParams.portfolio_long,
                        EndDate: e.target.value
                      }
                    })}
                  />
                </div>

                <div className="form-group">
                  <label>Portfolio Target (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={tvParams.portfolio_long.PortfolioTarget || 0}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      portfolio_long: {
                        ...tvParams.portfolio_long,
                        PortfolioTarget: Number(e.target.value)
                      }
                    })}
                  />
                </div>

                <div className="form-group">
                  <label>Portfolio Stop Loss (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={tvParams.portfolio_long.PortfolioStoploss || 0}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      portfolio_long: {
                        ...tvParams.portfolio_long,
                        PortfolioStoploss: Number(e.target.value)
                      }
                    })}
                  />
                </div>

                <div className="form-group">
                  <label>Portfolio Trailing Type</label>
                  <select
                    value={tvParams.portfolio_long.PortfolioTrailingType || "portfolio lock trail"}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      portfolio_long: {
                        ...tvParams.portfolio_long,
                        PortfolioTrailingType: e.target.value
                      }
                    })}
                  >
                    <option value="portfolio lock trail">Portfolio Lock Trail</option>
                    <option value="trail profits">Trail Profits</option>
                    <option value="lock minimum profit">Lock Minimum Profit</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Increase In Profit</label>
                  <input
                    type="number"
                    step="0.1"
                    value={tvParams.portfolio_long.IncreaseInProfit || 0}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      portfolio_long: {
                        ...tvParams.portfolio_long,
                        IncreaseInProfit: Number(e.target.value)
                      }
                    })}
                  />
                </div>

                <div className="form-group">
                  <label>Trail Min Profit By</label>
                  <input
                    type="number"
                    step="0.1"
                    value={tvParams.portfolio_long.TrailMinProfitBy || 0}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      portfolio_long: {
                        ...tvParams.portfolio_long,
                        TrailMinProfitBy: Number(e.target.value)
                      }
                    })}
                  />
                </div>
              </div>
            </form>
          )}

          {tvParams.activeSection === 'portfolio_short' && (
            <form className="backtest-form">
              <div className="form-grid">
                <div className="form-group full-width">
                  <h4>Portfolio Short - Short Portfolio Configurations</h4>
                </div>

                <div className="form-group">
                  <label>Portfolio ID</label>
                  <input
                    type="number"
                    value={tvParams.portfolio_short.PortfolioID || 2}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      portfolio_short: {
                        ...tvParams.portfolio_short,
                        PortfolioID: Number(e.target.value)
                      }
                    })}
                  />
                </div>

                <div className="form-group">
                  <label>Portfolio Name</label>
                  <input
                    type="text"
                    value={tvParams.portfolio_short.PortfolioName || "SHORT_PORTFOLIO"}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      portfolio_short: {
                        ...tvParams.portfolio_short,
                        PortfolioName: e.target.value
                      }
                    })}
                  />
                </div>

                <div className="form-group">
                  <label>Start Date</label>
                  <input
                    type="text"
                    value={tvParams.portfolio_short.StartDate || "01_01_2022"}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      portfolio_short: {
                        ...tvParams.portfolio_short,
                        StartDate: e.target.value
                      }
                    })}
                  />
                </div>

                <div className="form-group">
                  <label>End Date</label>
                  <input
                    type="text"
                    value={tvParams.portfolio_short.EndDate || "01_01_2026"}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      portfolio_short: {
                        ...tvParams.portfolio_short,
                        EndDate: e.target.value
                      }
                    })}
                  />
                </div>

                <div className="form-group">
                  <label>Portfolio Target (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={tvParams.portfolio_short.PortfolioTarget || 0}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      portfolio_short: {
                        ...tvParams.portfolio_short,
                        PortfolioTarget: Number(e.target.value)
                      }
                    })}
                  />
                </div>

                <div className="form-group">
                  <label>Portfolio Stop Loss (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={tvParams.portfolio_short.PortfolioStoploss || 0}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      portfolio_short: {
                        ...tvParams.portfolio_short,
                        PortfolioStoploss: Number(e.target.value)
                      }
                    })}
                  />
                </div>

                <div className="form-group">
                  <label>Portfolio Trailing Type</label>
                  <select
                    value={tvParams.portfolio_short.PortfolioTrailingType || "portfolio lock trail"}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      portfolio_short: {
                        ...tvParams.portfolio_short,
                        PortfolioTrailingType: e.target.value
                      }
                    })}
                  >
                    <option value="portfolio lock trail">Portfolio Lock Trail</option>
                    <option value="trail profits">Trail Profits</option>
                    <option value="lock minimum profit">Lock Minimum Profit</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Increase In Profit</label>
                  <input
                    type="number"
                    step="0.1"
                    value={tvParams.portfolio_short.IncreaseInProfit || 0}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      portfolio_short: {
                        ...tvParams.portfolio_short,
                        IncreaseInProfit: Number(e.target.value)
                      }
                    })}
                  />
                </div>

                <div className="form-group">
                  <label>Trail Min Profit By</label>
                  <input
                    type="number"
                    step="0.1"
                    value={tvParams.portfolio_short.TrailMinProfitBy || 0}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      portfolio_short: {
                        ...tvParams.portfolio_short,
                        TrailMinProfitBy: Number(e.target.value)
                      }
                    })}
                  />
                </div>
              </div>
            </form>
          )}

          {tvParams.activeSection === 'tbs_long' && (
            <form className="backtest-form">
              <div className="form-grid">
                <div className="form-group full-width">
                  <h4>TBS Long - Trailing Buy Strategy Long Configurations</h4>
                </div>

                <div className="form-group">
                  <label>Strategy Name</label>
                  <input
                    type="text"
                    value={tvParams.tbs_long.StrategyName || "TBS_LONG"}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      tbs_long: {
                        ...tvParams.tbs_long,
                        StrategyName: e.target.value
                      }
                    })}
                  />
                </div>

                <div className="form-group">
                  <label>Index</label>
                  <input
                    type="text"
                    value={tvParams.tbs_long.Index || "NIFTY"}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      tbs_long: {
                        ...tvParams.tbs_long,
                        Index: e.target.value
                      }
                    })}
                  />
                </div>

                <div className="form-group">
                  <label>Strategy Type</label>
                  <select
                    value={tvParams.tbs_long.StrategyType || "BUY"}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      tbs_long: {
                        ...tvParams.tbs_long,
                        StrategyType: e.target.value
                      }
                    })}
                  >
                    <option value="BUY">BUY</option>
                    <option value="SELL">SELL</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Weekdays</label>
                  <input
                    type="text"
                    value={tvParams.tbs_long.Weekdays || "1,2,3,4,5"}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      tbs_long: {
                        ...tvParams.tbs_long,
                        Weekdays: e.target.value
                      }
                    })}
                  />
                </div>

                <div className="form-group">
                  <label>DTE</label>
                  <input
                    type="number"
                    value={tvParams.tbs_long.DTE || 10}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      tbs_long: {
                        ...tvParams.tbs_long,
                        DTE: Number(e.target.value)
                      }
                    })}
                  />
                </div>

                <div className="form-group">
                  <label>Strike Selection Time</label>
                  <input
                    type="number"
                    value={tvParams.tbs_long.StrikeSelectionTime || 95500}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      tbs_long: {
                        ...tvParams.tbs_long,
                        StrikeSelectionTime: Number(e.target.value)
                      }
                    })}
                  />
                </div>

                <div className="form-group">
                  <label>Start Time</label>
                  <input
                    type="number"
                    value={tvParams.tbs_long.StartTime || 95500}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      tbs_long: {
                        ...tvParams.tbs_long,
                        StartTime: Number(e.target.value)
                      }
                    })}
                  />
                </div>

                <div className="form-group">
                  <label>Last Entry Time</label>
                  <input
                    type="number"
                    value={tvParams.tbs_long.LastEntryTime || 140000}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      tbs_long: {
                        ...tvParams.tbs_long,
                        LastEntryTime: Number(e.target.value)
                      }
                    })}
                  />
                </div>

                <div className="form-group">
                  <label>End Time</label>
                  <input
                    type="number"
                    value={tvParams.tbs_long.EndTime || 140000}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      tbs_long: {
                        ...tvParams.tbs_long,
                        EndTime: Number(e.target.value)
                      }
                    })}
                  />
                </div>

                <div className="form-group">
                  <label>Strategy Profit</label>
                  <input
                    type="number"
                    value={tvParams.tbs_long.StrategyProfit || 0}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      tbs_long: {
                        ...tvParams.tbs_long,
                        StrategyProfit: Number(e.target.value)
                      }
                    })}
                  />
                </div>

                <div className="form-group">
                  <label>Strategy Loss</label>
                  <input
                    type="number"
                    value={tvParams.tbs_long.StrategyLoss || 0}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      tbs_long: {
                        ...tvParams.tbs_long,
                        StrategyLoss: Number(e.target.value)
                      }
                    })}
                  />
                </div>

                <div className="form-group">
                  <label>Strategy Trailing Type</label>
                  <select
                    value={tvParams.tbs_long.StrategyTrailingType || "Lock & Trail Profits"}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      tbs_long: {
                        ...tvParams.tbs_long,
                        StrategyTrailingType: e.target.value
                      }
                    })}
                  >
                    <option value="Lock & Trail Profits">Lock & Trail Profits</option>
                    <option value="Trail Profits">Trail Profits</option>
                    <option value="Lock Minimum Profit">Lock Minimum Profit</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Profit Reaches</label>
                  <input
                    type="number"
                    step="0.1"
                    value={tvParams.tbs_long.ProfitReaches || 0}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      tbs_long: {
                        ...tvParams.tbs_long,
                        ProfitReaches: Number(e.target.value)
                      }
                    })}
                  />
                </div>

                <div className="form-group">
                  <label>Lock Min Profit At</label>
                  <input
                    type="number"
                    step="0.1"
                    value={tvParams.tbs_long.LockMinProfitAt || 0}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      tbs_long: {
                        ...tvParams.tbs_long,
                        LockMinProfitAt: Number(e.target.value)
                      }
                    })}
                  />
                </div>

                <div className="form-group">
                  <label>Increase In Profit</label>
                  <input
                    type="number"
                    step="0.1"
                    value={tvParams.tbs_long.IncreaseInProfit || 0}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      tbs_long: {
                        ...tvParams.tbs_long,
                        IncreaseInProfit: Number(e.target.value)
                      }
                    })}
                  />
                </div>

                <div className="form-group">
                  <label>Trail Min Profit By</label>
                  <input
                    type="number"
                    step="0.1"
                    value={tvParams.tbs_long.TrailMinProfitBy || 0}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      tbs_long: {
                        ...tvParams.tbs_long,
                        TrailMinProfitBy: Number(e.target.value)
                      }
                    })}
                  />
                </div>
              </div>
            </form>
          )}

          {tvParams.activeSection === 'tbs_short' && (
            <form className="backtest-form">
              <div className="form-grid">
                <div className="form-group full-width">
                  <h4>TBS Short - Trailing Buy Strategy Short Configurations</h4>
                </div>

                <div className="form-group">
                  <label>Strategy Name</label>
                  <input
                    type="text"
                    value={tvParams.tbs_short.StrategyName || "TBS_SHORT"}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      tbs_short: {
                        ...tvParams.tbs_short,
                        StrategyName: e.target.value
                      }
                    })}
                  />
                </div>

                <div className="form-group">
                  <label>Index</label>
                  <input
                    type="text"
                    value={tvParams.tbs_short.Index || "NIFTY"}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      tbs_short: {
                        ...tvParams.tbs_short,
                        Index: e.target.value
                      }
                    })}
                  />
                </div>

                <div className="form-group">
                  <label>Strategy Type</label>
                  <select
                    value={tvParams.tbs_short.StrategyType || "SELL"}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      tbs_short: {
                        ...tvParams.tbs_short,
                        StrategyType: e.target.value
                      }
                    })}
                  >
                    <option value="BUY">BUY</option>
                    <option value="SELL">SELL</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Weekdays</label>
                  <input
                    type="text"
                    value={tvParams.tbs_short.Weekdays || "1,2,3,4,5"}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      tbs_short: {
                        ...tvParams.tbs_short,
                        Weekdays: e.target.value
                      }
                    })}
                  />
                </div>

                <div className="form-group">
                  <label>DTE</label>
                  <input
                    type="number"
                    value={tvParams.tbs_short.DTE || 10}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      tbs_short: {
                        ...tvParams.tbs_short,
                        DTE: Number(e.target.value)
                      }
                    })}
                  />
                </div>

                <div className="form-group">
                  <label>Strike Selection Time</label>
                  <input
                    type="number"
                    value={tvParams.tbs_short.StrikeSelectionTime || 95500}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      tbs_short: {
                        ...tvParams.tbs_short,
                        StrikeSelectionTime: Number(e.target.value)
                      }
                    })}
                  />
                </div>

                <div className="form-group">
                  <label>Start Time</label>
                  <input
                    type="number"
                    value={tvParams.tbs_short.StartTime || 95500}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      tbs_short: {
                        ...tvParams.tbs_short,
                        StartTime: Number(e.target.value)
                      }
                    })}
                  />
                </div>

                <div className="form-group">
                  <label>Last Entry Time</label>
                  <input
                    type="number"
                    value={tvParams.tbs_short.LastEntryTime || 140000}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      tbs_short: {
                        ...tvParams.tbs_short,
                        LastEntryTime: Number(e.target.value)
                      }
                    })}
                  />
                </div>

                <div className="form-group">
                  <label>End Time</label>
                  <input
                    type="number"
                    value={tvParams.tbs_short.EndTime || 140000}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      tbs_short: {
                        ...tvParams.tbs_short,
                        EndTime: Number(e.target.value)
                      }
                    })}
                  />
                </div>

                <div className="form-group">
                  <label>Strategy Profit</label>
                  <input
                    type="number"
                    value={tvParams.tbs_short.StrategyProfit || 0}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      tbs_short: {
                        ...tvParams.tbs_short,
                        StrategyProfit: Number(e.target.value)
                      }
                    })}
                  />
                </div>

                <div className="form-group">
                  <label>Strategy Loss</label>
                  <input
                    type="number"
                    value={tvParams.tbs_short.StrategyLoss || 0}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      tbs_short: {
                        ...tvParams.tbs_short,
                        StrategyLoss: Number(e.target.value)
                      }
                    })}
                  />
                </div>

                <div className="form-group">
                  <label>Strategy Trailing Type</label>
                  <select
                    value={tvParams.tbs_short.StrategyTrailingType || "Lock & Trail Profits"}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      tbs_short: {
                        ...tvParams.tbs_short,
                        StrategyTrailingType: e.target.value
                      }
                    })}
                  >
                    <option value="Lock & Trail Profits">Lock & Trail Profits</option>
                    <option value="Trail Profits">Trail Profits</option>
                    <option value="Lock Minimum Profit">Lock Minimum Profit</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Profit Reaches</label>
                  <input
                    type="number"
                    step="0.1"
                    value={tvParams.tbs_short.ProfitReaches || 0}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      tbs_short: {
                        ...tvParams.tbs_short,
                        ProfitReaches: Number(e.target.value)
                      }
                    })}
                  />
                </div>

                <div className="form-group">
                  <label>Lock Min Profit At</label>
                  <input
                    type="number"
                    step="0.1"
                    value={tvParams.tbs_short.LockMinProfitAt || 0}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      tbs_short: {
                        ...tvParams.tbs_short,
                        LockMinProfitAt: Number(e.target.value)
                      }
                    })}
                  />
                </div>

                <div className="form-group">
                  <label>Increase In Profit</label>
                  <input
                    type="number"
                    step="0.1"
                    value={tvParams.tbs_short.IncreaseInProfit || 0}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      tbs_short: {
                        ...tvParams.tbs_short,
                        IncreaseInProfit: Number(e.target.value)
                      }
                    })}
                  />
                </div>

                <div className="form-group">
                  <label>Trail Min Profit By</label>
                  <input
                    type="number"
                    step="0.1"
                    value={tvParams.tbs_short.TrailMinProfitBy || 0}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      tbs_short: {
                        ...tvParams.tbs_short,
                        TrailMinProfitBy: Number(e.target.value)
                      }
                    })}
                  />
                </div>
              </div>
            </form>
          )}

          {tvParams.activeSection === 'tradingview_backtest' && (
            <form className="backtest-form">
              <div className="form-grid">
                <div className="form-group full-width">
                  <h4>TradingView Backtest - Overall Backtest Parameters</h4>
                </div>

                <div className="form-group">
                  <label>Slippage Percent (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={tvParams.tradingview_backtest.slippage_percent || 0.5}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      tradingview_backtest: {
                        ...tvParams.tradingview_backtest,
                        slippage_percent: Number(e.target.value)
                      }
                    })}
                  />
                </div>

                <div className="form-group">
                  <label>Check Interval (seconds)</label>
                  <input
                    type="number"
                    value={tvParams.tradingview_backtest.check_interval || 60}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      tradingview_backtest: {
                        ...tvParams.tradingview_backtest,
                        check_interval: Number(e.target.value)
                      }
                    })}
                  />
                </div>

                <div className="form-group">
                  <label>Broker</label>
                  <select
                    value={tvParams.tradingview_backtest.broker || "BROKER.PAPER"}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      tradingview_backtest: {
                        ...tvParams.tradingview_backtest,
                        broker: e.target.value
                      }
                    })}
                  >
                    <option value="BROKER.PAPER">BROKER.PAPER</option>
                    <option value="BROKER.ZERODHA">BROKER.ZERODHA</option>
                    <option value="BROKER.UPSTOX">BROKER.UPSTOX</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Exchange</label>
                  <select
                    value={tvParams.tradingview_backtest.exchange || "EXCHANGE.NSE"}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      tradingview_backtest: {
                        ...tvParams.tradingview_backtest,
                        exchange: e.target.value
                      }
                    })}
                  >
                    <option value="EXCHANGE.NSE">EXCHANGE.NSE</option>
                    <option value="EXCHANGE.MCX">EXCHANGE.MCX</option>
                    <option value="EXCHANGE.US">EXCHANGE.US</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Order Type</label>
                  <select
                    value={tvParams.tradingview_backtest.order_type || "ORDERTYPE.MARKET"}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      tradingview_backtest: {
                        ...tvParams.tradingview_backtest,
                        order_type: e.target.value
                      }
                    })}
                  >
                    <option value="ORDERTYPE.MARKET">ORDERTYPE.MARKET</option>
                    <option value="ORDERTYPE.LIMIT">ORDERTYPE.LIMIT</option>
                    <option value="ORDERTYPE.SL">ORDERTYPE.SL</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Product Type</label>
                  <select
                    value={tvParams.tradingview_backtest.product_type || "PRODUCTTYPE.NRML"}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      tradingview_backtest: {
                        ...tvParams.tradingview_backtest,
                        product_type: e.target.value
                      }
                    })}
                  >
                    <option value="PRODUCTTYPE.NRML">PRODUCTTYPE.NRML</option>
                    <option value="PRODUCTTYPE.MIS">PRODUCTTYPE.MIS</option>
                    <option value="PRODUCTTYPE.CNC">PRODUCTTYPE.CNC</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Feed Source</label>
                  <select
                    value={tvParams.tradingview_backtest.feed_source || "FEEDSOURCE.HISTORICAL"}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      tradingview_backtest: {
                        ...tvParams.tradingview_backtest,
                        feed_source: e.target.value
                      }
                    })}
                  >
                    <option value="FEEDSOURCE.HISTORICAL">FEEDSOURCE.HISTORICAL</option>
                    <option value="FEEDSOURCE.LIVE">FEEDSOURCE.LIVE</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Fixed VIX Value</label>
                  <input
                    type="number"
                    value={tvParams.tradingview_backtest.fix_vix || 0}
                    onChange={(e) => setTvParams({
                      ...tvParams,
                      tradingview_backtest: {
                        ...tvParams.tradingview_backtest,
                        fix_vix: Number(e.target.value)
                      }
                    })}
                  />
                </div>
              </div>
            </form>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={async () => {
                try {
                  const response = await apiClient.getTradingViewBacktestInput();
                  const data = response.data as Record<string, unknown>;
                  setTvParams({
                    ...tvParams,
                    tbs_long: data.tbs_long as Record<string, unknown> || {},
                    tbs_short: data.tbs_short as Record<string, unknown> || {},
                    portfolio_long: data.portfolio_long as Record<string, unknown> || {},
                    portfolio_short: data.portfolio_short as Record<string, unknown> || {},
                    input_tv: data.input_tv as Record<string, unknown> || {},
                    tradingview_backtest: data.tradingview_backtest as Record<string, unknown> || {}
                  });
                  show('success', 'Current TradingView input loaded successfully!');
                } catch (error) {
                  show('danger', 'Failed to load TradingView input');
                }
              }}
            >
              📋 Load Current Input
            </button>

            <div className="form-group file-upload-group">
              <label>📁 Upload Excel/CSV File for Current Tab ({tvParams.activeSection})</label>
              <div className="file-upload-container">
                <input
                  id="file-upload"
                  type="file"
                  accept=".csv,.xlsx,.xls,.xlsm"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="file-input"
                />
                <button
                  type="button"
                  className="btn btn-info"
                  onClick={handleFileUpload}
                  disabled={!uploadFile || isUploading}
                >
                  {isUploading ? '⏳ Uploading...' : '📤 Upload & Convert'}
                </button>
              </div>
              <small className="form-help">
                Upload CSV or Excel files to convert to JSON format. The converted data will populate the current active tab.
              </small>
            </div>

            {uploadedData && (
              <div className="form-group uploaded-data-display">
                <label>📄 Uploaded File Content - {uploadedData.filename}</label>
                <div className="json-display">
                  <pre>{JSON.stringify(uploadedData.json_data, null, 2)}</pre>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setUploadedData(null)}
                >
                  ✕ Hide
                </button>
              </div>
            )}

            
            <button
              type="button"
              className="btn btn-secondary"
              onClick={async () => {
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
                } catch (error) {
                  show('danger', 'Failed to save TradingView configuration');
                }
              }}
            >
              💾 Save Configuration
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={runTradingViewBacktest}
              disabled={isRunning}
            >
              {isRunning ? 'Running TradingView Backtest...' : 'Run TradingView Backtest'}
            </button>
          </div>
        </section>
      )}

      {renderResults()}
    </div>
  );
};

export default BacktestConfigurationPage;