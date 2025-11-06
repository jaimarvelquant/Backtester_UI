import React, { useState } from 'react';
import { useApiClient } from '@hooks/useApiClient';
import { useAlert } from '@context/AlertContext';
import { useLoading } from '@context/LoadingContext';

import '../Portfolio/PortfolioPages.css';

const BacktestConfigurationPage: React.FC = () => {
  const apiClient = useApiClient();
  const { show } = useAlert();
  const { withLoader } = useLoading();
  const [activeTab, setActiveTab] = useState<'simple' | 'tradingview'>('simple');

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

  const [results, setResults] = useState<any>(null);
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
      } else {
        show('danger', response.data.message || 'Backtest failed');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Backtest execution failed';
      show('danger', message);
    } finally {
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

  const renderResults = () => {
    if (!results) return null;

    return (
      <section className="card">
        <div className="card__header">
          <h3>Backtest Results</h3>
        </div>
        <div className="results-container">
          <pre className="results-json">
            {JSON.stringify(results, null, 2)}
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
          </div>
          <form className="backtest-form">
            <div className="form-grid">
              <div className="form-group">
                <label>Strategy Name</label>
                <input
                  type="text"
                  value={simpleParams.name}
                  onChange={(e) => setSimpleParams({...simpleParams, name: e.target.value})}
                  placeholder="Enter strategy name"
                />
              </div>

              <div className="form-group">
                <label>Strategy Type</label>
                <select
                  value={simpleParams.strategy}
                  onChange={(e) => setSimpleParams({...simpleParams, strategy: e.target.value})}
                >
                  <option value="moving_average">Moving Average</option>
                  <option value="rsi">RSI</option>
                  <option value="macd">MACD</option>
                  <option value="bollinger">Bollinger Bands</option>
                </select>
              </div>

              <div className="form-group">
                <label>Symbol</label>
                <input
                  type="text"
                  value={simpleParams.symbol}
                  onChange={(e) => setSimpleParams({...simpleParams, symbol: e.target.value})}
                  placeholder="NIFTY, BANKNIFTY, etc."
                />
              </div>

              <div className="form-group">
                <label>Timeframe</label>
                <select
                  value={simpleParams.timeframe}
                  onChange={(e) => setSimpleParams({...simpleParams, timeframe: e.target.value})}
                >
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </div>

              <div className="form-group">
                <label>Start Date</label>
                <input
                  type="date"
                  value={simpleParams.startDate}
                  onChange={(e) => setSimpleParams({...simpleParams, startDate: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>End Date</label>
                <input
                  type="date"
                  value={simpleParams.endDate}
                  onChange={(e) => setSimpleParams({...simpleParams, endDate: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Initial Capital</label>
                <input
                  type="number"
                  value={simpleParams.capital}
                  onChange={(e) => setSimpleParams({...simpleParams, capital: Number(e.target.value)})}
                />
              </div>

              <div className="form-group">
                <label>Quantity</label>
                <input
                  type="number"
                  value={simpleParams.quantity}
                  onChange={(e) => setSimpleParams({...simpleParams, quantity: Number(e.target.value)})}
                />
              </div>

              <div className="form-group">
                <label>Target (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={simpleParams.target}
                  onChange={(e) => setSimpleParams({...simpleParams, target: Number(e.target.value)})}
                />
              </div>

              <div className="form-group">
                <label>Stop Loss (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={simpleParams.stoploss}
                  onChange={(e) => setSimpleParams({...simpleParams, stoploss: Number(e.target.value)})}
                />
              </div>

              <div className="form-group">
                <label>Trailing (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={simpleParams.trailing}
                  onChange={(e) => setSimpleParams({...simpleParams, trailing: Number(e.target.value)})}
                />
              </div>

              <div className="form-group">
                <label>Slippage (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={simpleParams.slippage}
                  onChange={(e) => setSimpleParams({...simpleParams, slippage: Number(e.target.value)})}
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={runSimpleBacktest}
                disabled={isRunning}
              >
                {isRunning ? 'Running Backtest...' : 'Run Backtest'}
              </button>
            </div>
          </form>
        </section>
      )}

      {activeTab === 'tradingview' && (
        <section className="card">
          <div className="card__header">
            <h3>TradingView Backtest Configuration</h3>
          </div>
          <form className="backtest-form">
            <div className="form-grid">
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
                <label>Symbol</label>
                <input
                  type="text"
                  value={tvParams.symbol}
                  onChange={(e) => setTvParams({...tvParams, symbol: e.target.value})}
                  placeholder="NIFTY, BANKNIFTY, etc."
                />
              </div>

              <div className="form-group">
                <label>Start Date</label>
                <input
                  type="date"
                  value={tvParams.startDate}
                  onChange={(e) => setTvParams({...tvParams, startDate: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>End Date</label>
                <input
                  type="date"
                  value={tvParams.endDate}
                  onChange={(e) => setTvParams({...tvParams, endDate: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Initial Capital</label>
                <input
                  type="number"
                  value={tvParams.capital}
                  onChange={(e) => setTvParams({...tvParams, capital: Number(e.target.value)})}
                />
              </div>

              <div className="form-group">
                <label>Quantity</label>
                <input
                  type="number"
                  value={tvParams.quantity}
                  onChange={(e) => setTvParams({...tvParams, quantity: Number(e.target.value)})}
                />
              </div>

              <div className="form-group">
                <label>Target (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={tvParams.target}
                  onChange={(e) => setTvParams({...tvParams, target: Number(e.target.value)})}
                />
              </div>

              <div className="form-group">
                <label>Stop Loss (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={tvParams.stoploss}
                  onChange={(e) => setTvParams({...tvParams, stoploss: Number(e.target.value)})}
                />
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={tvParams.doRollover}
                    onChange={(e) => setTvParams({...tvParams, doRollover: e.target.checked})}
                  />
                  Do Rollover
                </label>
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={tvParams.intradaySqOffApplicable}
                    onChange={(e) => setTvParams({...tvParams, intradaySqOffApplicable: e.target.checked})}
                  />
                  Intraday Square Off
                </label>
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={tvParams.tvExitApplicable}
                    onChange={(e) => setTvParams({...tvParams, tvExitApplicable: e.target.checked})}
                  />
                  TradingView Exit
                </label>
              </div>

              <div className="form-group">
                <label>First Trade Entry Time</label>
                <input
                  type="time"
                  value={tvParams.firstTradeEntryTime}
                  onChange={(e) => setTvParams({...tvParams, firstTradeEntryTime: e.target.value})}
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={runTradingViewBacktest}
                disabled={isRunning}
              >
                {isRunning ? 'Running TradingView Backtest...' : 'Run TradingView Backtest'}
              </button>
            </div>
          </form>
        </section>
      )}

      {renderResults()}
    </div>
  );
};

export default BacktestConfigurationPage;