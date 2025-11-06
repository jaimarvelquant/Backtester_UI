import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@hooks/useApiClient';
import { normalizeTradingView, normalizePortfolioRunResponse } from '@utils/portfolio';

import '../Portfolio/PortfolioDetail.css';

const TradingViewDetailPage: React.FC = () => {
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
    return <div className="card">Loading trading view…</div>;
  }

  if (!data?.tradingView) {
    return <div className="card">Trading view not found.</div>;
  }

  const { tradingView, analysis } = data;

  return (
    <div className="portfolio-detail">
      <section className="card portfolio-detail__grid">
        <div>
          <span className="label">Name</span>
          <strong>{tradingView.name ?? '—'}</strong>
        </div>
        <div>
          <span className="label">Start Date</span>
          <strong>{tradingView.startdate ?? '—'}</strong>
        </div>
        <div>
          <span className="label">End Date</span>
          <strong>{tradingView.enddate ?? '—'}</strong>
        </div>
        <div>
          <span className="label">Exit Applicable</span>
          <strong>{tradingView.tvexitapplicable ?? '—'}</strong>
        </div>
        <div>
          <span className="label">Roll Over</span>
          <strong>{tradingView.dorollover ?? '—'}</strong>
        </div>
        <div>
          <span className="label">Owner</span>
          <strong>{tradingView.createdBy?.displayName ?? tradingView.createdBy?.username ?? '—'}</strong>
        </div>
      </section>

      {Array.isArray(tradingView.tvsignals) && tradingView.tvsignals.length > 0 && (
        <section className="card">
          <h3>Signals</h3>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Datetime</th>
                  <th>Symbol</th>
                  <th>Side</th>
                  <th>Comments</th>
                </tr>
              </thead>
              <tbody>
                {tradingView.tvsignals.map((signal: any, index: number) => (
                  <tr key={signal.id ?? index}>
                    <td>{index + 1}</td>
                    <td>{signal.datetime}</td>
                    <td>{signal.symbol ?? '—'}</td>
                    <td>{signal.side ?? '—'}</td>
                    <td>{signal.comments ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {analysis && (
        <section className="card">
          <h3>Run Metrics</h3>
          <div className="metrics-grid">
            {analysis.metrics?.map((metric: any) => (
              <article key={metric.strategy}>
                <header>
                  <h4>{metric.strategy}</h4>
                  <small>{metric.instrument ?? 'Combined'}</small>
                </header>
                <dl>
                  <div>
                    <dt>Total PnL</dt>
                    <dd>{metric.totalpnlFormat ?? metric.totalpnl}</dd>
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
                    <dt>Avg Day PnL</dt>
                    <dd>{metric.avgDayStrategyPnlFormat ?? metric.avgDayStrategyPnl}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </section>
      )}

      {analysis?.transactions && (
        <section className="card">
          <h3>Transactions</h3>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Entry</th>
                  <th>Exit</th>
                  <th>Symbol</th>
                  <th>PNL</th>
                </tr>
              </thead>
              <tbody>
                {analysis.transactions.map((txn: any, index: number) => (
                  <tr key={`${txn.strategy}-${txn.leg_id}-${index}`}>
                    <td>{index + 1}</td>
                    <td>
                      {txn.entry_date} {txn.entry_time}
                    </td>
                    <td>
                      {txn.exit_date} {txn.exit_time}
                    </td>
                    <td>{txn.symbol}</td>
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

export default TradingViewDetailPage;
