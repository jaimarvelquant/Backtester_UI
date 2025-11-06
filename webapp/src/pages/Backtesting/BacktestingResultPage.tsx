import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@hooks/useApiClient';
import { normalizePortfolio, normalizePortfolioRunResponse } from '@utils/portfolio';

import '../Portfolio/PortfolioDetail.css';

const TABS = ['metrics', 'daywise', 'monthwise', 'margin', 'transactions'] as const;
type TabKey = typeof TABS[number];

const BacktestingResultPage: React.FC = () => {
  const { id } = useParams();
  const apiClient = useApiClient();
  const [activeTab, setActiveTab] = useState<TabKey>('metrics');

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
    return <div className="card">Loading backtesting result…</div>;
  }

  if (!data?.portfolio || !data?.runResponse) {
    return <div className="card">No backtesting result available.</div>;
  }

  const { portfolio, runResponse } = data;

  return (
    <div className="portfolio-detail">
      <section className="card portfolio-detail__grid">
        <div>
          <span className="label">Portfolio</span>
          <strong>{portfolio.portfolioName ?? '—'}</strong>
        </div>
        <div>
          <span className="label">Strategy Type</span>
          <strong>{portfolio.strategyType ?? '—'}</strong>
        </div>
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
          <strong>{portfolio.portfolioTarget ?? '—'}</strong>
        </div>
        <div>
          <span className="label">Stop Loss</span>
          <strong>{portfolio.portfolioStoploss ?? '—'}</strong>
        </div>
        <div>
          <span className="label">Trailing Type</span>
          <strong>{portfolio.portfolioTrailingType ?? '—'}</strong>
        </div>
      </section>

      <section className="card">
        <nav className="backtesting-tabs">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              className={tab === activeTab ? 'is-active' : ''}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'metrics' && 'Metrics'}
              {tab === 'daywise' && 'Day-wise'}
              {tab === 'monthwise' && 'Month-wise'}
              {tab === 'margin' && 'Margin %'}
              {tab === 'transactions' && 'Transactions'}
            </button>
          ))}
        </nav>

        {activeTab === 'metrics' && (
          <div className="metrics-grid">
            {runResponse.metrics?.map((metric: any) => (
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
                    <dt>Pos Days %</dt>
                    <dd>{metric.posDayPercentageFormat ?? metric.posDayPercentage}</dd>
                  </div>
                  <div>
                    <dt>Neg Days %</dt>
                    <dd>{metric.negDayPercentageFormat ?? metric.negDayPercentage}</dd>
                  </div>
                  <div>
                    <dt>Max Drawdown</dt>
                    <dd>{metric.maxdrawdownFormat ?? metric.maxdrawdown}</dd>
                  </div>
                  <div>
                    <dt>Profit Factor</dt>
                    <dd>{metric.profitfactorFormat ?? metric.profitfactor}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        )}

        {activeTab === 'daywise' && (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Strategy</th>
                  <th>Day</th>
                  <th>Win %</th>
                  <th>Loss %</th>
                  <th>Avg PnL</th>
                </tr>
              </thead>
              <tbody>
                {runResponse.daywisestats?.map((row: any, index: number) => (
                  <tr key={`${row.strategy}-${index}`}>
                    <td>{row.strategy}</td>
                    <td>{row.day}</td>
                    <td>{row.winPercentageFormat ?? row.winPercentage}</td>
                    <td>{row.lossPercentageFormat ?? row.lossPercentage}</td>
                    <td>{row.avgDayStrategyPnlFormat ?? row.avgDayStrategyPnl}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'monthwise' && (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Strategy</th>
                  <th>Month</th>
                  <th>Year</th>
                  <th>PnL</th>
                </tr>
              </thead>
              <tbody>
                {runResponse.monthwisestats?.map((row: any, index: number) => (
                  <tr key={`${row.strategy}-${index}`}>
                    <td>{row.strategy}</td>
                    <td>{row.month}</td>
                    <td>{row.year}</td>
                    <td>{row.pnlFormat ?? row.pnl}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'margin' && (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Strategy</th>
                  <th>Margin %</th>
                  <th>Total PnL</th>
                </tr>
              </thead>
              <tbody>
                {runResponse.marginpercentwisestats?.map((row: any, index: number) => (
                  <tr key={`${row.strategy}-${index}`}>
                    <td>{row.strategy}</td>
                    <td>{row.marginpercentageFormat ?? row.marginpercentage}</td>
                    <td>{row.totalpnlFormat ?? row.totalpnl}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'transactions' && (
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
                  <th>PNL</th>
                </tr>
              </thead>
              <tbody>
                {runResponse.transactions?.map((txn: any, index: number) => (
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
                    <td className={Number(txn.pnl) >= 0 ? 'text-success' : 'text-danger'}>
                      {txn.pnlFormat ?? txn.pnl}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default BacktestingResultPage;
