import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@hooks/useApiClient';
import type { Portfolio, TradingView } from '@app-types/api';
import { roundTo } from '@utils/number';

import './DashboardPage.css';

const DashboardPage: React.FC = () => {
  const apiClient = useApiClient();

  const { data: portfolioData } = useQuery({
    queryKey: ['dashboard', 'portfolios'],
    queryFn: async () => {
      const response = await apiClient.searchPortfolio({ page: 0, size: 5, ran: true });
      return response.data.data;
    }
  });

  const { data: tradingViewData } = useQuery({
    queryKey: ['dashboard', 'trading-view'],
    queryFn: async () => {
      const response = await apiClient.searchTradingView({ page: 0, size: 5 });
      return response.data.data;
    }
  });

  return (
    <div className="dashboard">
      <section className="dashboard__hero">
        <div>
          <h2>Run smarter strategies.</h2>
          <p>
            Consolidate your portfolios, align with master data, and evaluate trade performance in minutes.
          </p>
          <div className="dashboard__actions">
            <a href="/portfolio/list" className="dashboard__pill">Manage Portfolio</a>
            <a href="/backtesting/list" className="dashboard__pill dashboard__pill--secondary">Backtesting</a>
            <a href="/trading-view/list" className="dashboard__pill dashboard__pill--ghost">Trading View</a>
          </div>
        </div>
        <div className="dashboard__highlights">
          <article>
            <h3>Portfolio coverage</h3>
            <p>Track multi-leg strategies, lock profits, and view VWAP conditions.</p>
          </article>
          <article>
            <h3>Trading view signals</h3>
            <p>Upload, version, and share signal libraries with your desk.</p>
          </article>
          <article>
            <h3>Backtesting insights</h3>
            <p>Compare P&amp;L, drawdowns, and win-rate outliers in one sheet.</p>
          </article>
        </div>
      </section>

      <section className="dashboard__panel">
        <header>
          <h3>Recently backtested portfolios</h3>
          <a href="/portfolio/list">View all →</a>
        </header>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Strategy Type</th>
              <th>Start</th>
              <th>End</th>
              <th>Target</th>
              <th>Stop Loss</th>
            </tr>
          </thead>
          <tbody>
            {portfolioData?.map((item: Portfolio) => (
              <tr key={item.portfolioID}>
                <td>{item.portfolioName}</td>
                <td>{item.strategyType}</td>
                <td>{item.startDate}</td>
                <td>{item.endDate}</td>
                <td>{roundTo(Number(item.portfolioTarget))}</td>
                <td>{roundTo(Number(item.portfolioStoploss))}</td>
              </tr>
            )) ?? (
              <tr>
                <td colSpan={6}>No portfolios found. Run your first backtest.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="dashboard__panel">
        <header>
          <h3>Latest trading view setups</h3>
          <a href="/trading-view/list">Explore library →</a>
        </header>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Start</th>
              <th>End</th>
              <th>Exit Applicable</th>
              <th>Owner</th>
            </tr>
          </thead>
          <tbody>
            {tradingViewData?.map((item: TradingView) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.startdate}</td>
                <td>{item.enddate}</td>
                <td>{item.tvexitapplicable}</td>
                <td>{item.createdBy?.displayName ?? item.createdBy?.username}</td>
              </tr>
            )) ?? (
              <tr>
                <td colSpan={5}>Upload your trading view signals to begin.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
};

export default DashboardPage;
