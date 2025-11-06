import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@hooks/useApiClient';
import { useAlert } from '@context/AlertContext';
import { useLoading } from '@context/LoadingContext';
import type { Portfolio, ApiResponse } from '@types/api';
import { normalizePortfolio, normalizePortfolioRunResponse } from '@utils/portfolio';
import { downloadBlob } from '@utils/download';
import { roundTo } from '@utils/number';

import './PortfolioDetail.css';

const PortfolioDetailPage: React.FC = () => {
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
      const portfolio = normalizePortfolio(portfolioResponse.data as Portfolio);
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
    if (!portfolio?.portfolioID) return;
    try {
      await withLoader(() => apiClient.runPortfolio(portfolio.portfolioID!));
      show('success', 'Portfolio execution started');
      await refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to run portfolio';
      show('danger', message);
    }
  };

  const handleDownload = async (fileType: 'XLSX' | 'JSON') => {
    if (!portfolio?.portfolioID) return;
    try {
      const blob = await withLoader(() => apiClient.downloadPortfolio([portfolio.portfolioID!], fileType));
      const filename = `${portfolio.portfolioName ?? 'portfolio'}.${fileType.toLowerCase()}`;
      downloadBlob(blob, filename);
      show('success', 'Download ready');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to download';
      show('danger', message);
    }
  };

  const handleDownloadTxn = async () => {
    if (!portfolio?.portfolioID) return;
    try {
      const blob = await withLoader(() => apiClient.downloadPortfolioTransactions([portfolio.portfolioID!]));
      const filename = `Txn_${portfolio.portfolioName ?? 'portfolio'}.xlsx`;
      downloadBlob(blob, filename);
      show('success', 'Transaction export is ready');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to download transactions';
      show('danger', message);
    }
  };

  if (isLoading) {
    return <div className="card">Loading portfolio…</div>;
  }

  if (!portfolio) {
    return (
      <div className="card">
        <p>Portfolio not found.</p>
        <button type="button" className="btn" onClick={() => navigate(-1)}>
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="portfolio-detail">
      <header className="card portfolio-detail__header">
        <div>
          <h2>{portfolio.portfolioName}</h2>
          <p>Strategy Type: {portfolio.strategyType ?? 'N/A'}</p>
        </div>
        <div className="portfolio-detail__actions">
          <button type="button" className="btn" onClick={() => navigate(-1)}>
            Back
          </button>
          <button type="button" className="btn btn-primary" onClick={handleRun}>
            Run Portfolio
          </button>
          <button type="button" className="btn" onClick={handleDownloadTxn}>
            Export Transactions
          </button>
          <button type="button" className="btn" onClick={() => handleDownload('XLSX')}>
            Download XLSX
          </button>
          <button type="button" className="btn" onClick={() => handleDownload('JSON')}>
            Download JSON
          </button>
        </div>
      </header>

      <section className="card portfolio-detail__grid">
        <div>
          <span className="label">Start Date</span>
          <strong>{portfolio.startDate ?? '—'}</strong>
        </div>
        <div>
          <span className="label">End Date</span>
          <strong>{portfolio.endDate ?? '—'}</strong>
        </div>
        <div>
          <span className="label">Target</span>
          <strong>{roundTo(Number(portfolio.portfolioTarget))}</strong>
        </div>
        <div>
          <span className="label">Stop Loss</span>
          <strong>{roundTo(Number(portfolio.portfolioStoploss))}</strong>
        </div>
        <div>
          <span className="label">Trailing Type</span>
          <strong>{portfolio.portfolioTrailingType ?? '—'}</strong>
        </div>
        <div>
          <span className="label">Profit Reaches</span>
          <strong>{roundTo(Number(portfolio.profitReaches))}</strong>
        </div>
        <div>
          <span className="label">Created By</span>
          <strong>{portfolio.createdBy?.displayName ?? portfolio.createdBy?.username ?? '—'}</strong>
        </div>
      </section>

      {Array.isArray(portfolio.strategiesSetting) && portfolio.strategiesSetting.length > 0 && (
        <section className="card">
          <h3>Strategies</h3>
          <div className="strategy-list">
            {portfolio.strategiesSetting.map((strategy: any) => (
              <article key={strategy.strategyID} className="strategy-card">
                <header>
                  <h4>{strategy.strategyName ?? 'Unnamed strategy'}</h4>
                  <span>ID: {strategy.strategyID ?? '—'}</span>
                </header>
                {Array.isArray(strategy.legsSettings) && strategy.legsSettings.length > 0 ? (
                  <table>
                    <thead>
                      <tr>
                        <th>Leg</th>
                        <th>Type</th>
                        <th>Entry</th>
                        <th>Exit</th>
                        <th>Symbol</th>
                      </tr>
                    </thead>
                    <tbody>
                      {strategy.legsSettings.map((leg: any, index: number) => (
                        <tr key={`${strategy.strategyID}-${index}`}>
                          <td>{leg.legID ?? index + 1}</td>
                          <td>{leg.orderType ?? leg.tradertype ?? '—'}</td>
                          <td>
                            {leg.entryDateDisplay} {leg.entryTimeDisplay}
                          </td>
                          <td>
                            {leg.exitDateDisplay} {leg.exitTimeDisplay}
                          </td>
                          <td>{leg.symbol ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p>No legs configured.</p>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {runResponse && (
        <section className="card">
          <h3>Performance Metrics</h3>
          <div className="metrics-grid">
            {runResponse.metrics?.map((metric: any) => (
              <article key={metric.strategy}>
                <header>
                  <h4>{metric.strategy}</h4>
                  <small>{metric.instrument ?? 'Portfolio Aggregate'}</small>
                </header>
                <dl>
                  <div>
                    <dt>Total PnL</dt>
                    <dd>{metric.totalpnlFormat ?? metric.totalpnl}</dd>
                  </div>
                  <div>
                    <dt>Max Drawdown %</dt>
                    <dd>{metric.maxdrawdownpercentageFormat ?? metric.maxdrawdownpercentage}</dd>
                  </div>
                  <div>
                    <dt>Win Rate</dt>
                    <dd>{metric.winrateFormat ?? metric.winrate}</dd>
                  </div>
                  <div>
                    <dt>Expectancy</dt>
                    <dd>{metric.expectancyFormat ?? metric.expectancy}</dd>
                  </div>
                  <div>
                    <dt>Sharpe Ratio</dt>
                    <dd>{metric.sharperatioFormat ?? metric.sharperatio}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </section>
      )}

      {runResponse?.transactions && runResponse.transactions.length > 0 && (
        <section className="card">
          <h3>Transactions</h3>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Strategy</th>
                  <th>Leg</th>
                  <th>Entry</th>
                  <th>Exit</th>
                  <th>Symbol</th>
                  <th>Entry Price</th>
                  <th>Exit Price</th>
                  <th>PNL</th>
                </tr>
              </thead>
              <tbody>
                {runResponse.transactions.map((txn: any, index: number) => (
                  <tr key={`${txn.strategy}-${txn.leg_id}-${index}`}>
                    <td>{index + 1}</td>
                    <td>{txn.strategy}</td>
                    <td>{txn.leg_id}</td>
                    <td>
                      {txn.entry_date} {txn.entry_time}
                    </td>
                    <td>
                      {txn.exit_date} {txn.exit_time}
                    </td>
                    <td>{txn.symbol}</td>
                    <td>{txn.entry_priceFormat ?? txn.entry_price}</td>
                    <td>{txn.exit_priceFormat ?? txn.exit_price}</td>
                    <td className={Number(txn.pnl) >= 0 ? 'text-success' : 'text-danger'}>
                      {txn.pnlFormat ?? txn.pnl}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};

export default PortfolioDetailPage;
