import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@hooks/useApiClient';
import { useAlert } from '@context/AlertContext';
import { useLoading } from '@context/LoadingContext';
import type { Portfolio, ApiResponse, PaginatedResponse } from '@types/api';
import { dateStringToLong, dateLongToDisplay } from '@utils/date';
import { roundTo } from '@utils/number';
import { downloadBlob } from '@utils/download';

import '../Portfolio/PortfolioPages.css';

type Filters = {
  portfolioName?: string;
  startDate?: string;
  endDate?: string;
};

const BacktestingListPage: React.FC = () => {
  const apiClient = useApiClient();
  const { show } = useAlert();
  const { withLoader } = useLoading();
  const navigate = useNavigate();

  const [filters, setFilters] = useState<Filters>({});
  const [appliedFilters, setAppliedFilters] = useState<Filters>({});
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);

  const queryKey = useMemo(
    () => ['backtesting', appliedFilters, page, size],
    [appliedFilters, page, size]
  );

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const payload: Record<string, unknown> = { page, size, ran: true, ...appliedFilters };
      if (payload.startDate) payload.startDate = dateStringToLong(payload.startDate as string);
      if (payload.endDate) payload.endDate = dateStringToLong(payload.endDate as string);
      const response: ApiResponse<PaginatedResponse<Portfolio>> = await apiClient.searchPortfolio(payload);
      return {
        total: response.data.totalItems,
        rows:
          response.data.data?.map((item) => ({
            ...item,
            startDate: item.startDate ? dateLongToDisplay(item.startDate) : item.startDate,
            endDate: item.endDate ? dateLongToDisplay(item.endDate) : item.endDate
          })) ?? []
      };
    }
  });

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setAppliedFilters(filters);
    setPage(0);
  };

  const reset = () => {
    setFilters({});
    setAppliedFilters({});
    setPage(0);
  };

  const download = async (portfolio: Portfolio) => {
    if (!portfolio.portfolioID) return;
    try {
      const blob = await withLoader(() => apiClient.downloadPortfolioTransactions([portfolio.portfolioID!]));
      const filename = `Txn_${portfolio.portfolioName ?? 'portfolio'}.xlsx`;
      downloadBlob(blob, filename);
      show('success', 'Download ready');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to download transactions';
      show('danger', message);
    }
  };

  return (
    <div className="portfolio-page">
      <header className="portfolio-page__header">
        <div>
          <h2>Portfolio Backtesting</h2>
          <p>Review completed runs and inspect their analytics.</p>
        </div>
      </header>

      <section className="card">
        <form className="filters" onSubmit={submitSearch}>
          <label>
            <span>Portfolio</span>
            <input
              type="text"
              value={filters.portfolioName ?? ''}
              onChange={(event) => setFilters((prev) => ({ ...prev, portfolioName: event.target.value }))}
              placeholder="Name contains…"
            />
          </label>

          <label>
            <span>Start Date</span>
            <input
              type="date"
              value={filters.startDate ?? ''}
              onChange={(event) => setFilters((prev) => ({ ...prev, startDate: event.target.value }))}
            />
          </label>

          <label>
            <span>End Date</span>
            <input
              type="date"
              value={filters.endDate ?? ''}
              onChange={(event) => setFilters((prev) => ({ ...prev, endDate: event.target.value }))}
            />
          </label>

          <div className="filters__actions">
            <button type="button" className="btn" onClick={reset}>
              Reset
            </button>
            <button type="submit" className="btn btn-primary">
              Search
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <div className="card__header">
          <h3>Completed runs</h3>
          <div className="card__meta">
            <span>{data?.total ?? 0} items</span>
            <select value={size} onChange={(event) => setSize(Number(event.target.value))}>
              {[10, 15, 20, 30, 50].map((option) => (
                <option key={option} value={option}>
                  {option} / page
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Strategy Type</th>
                <th>Start</th>
                <th>End</th>
                <th>Target</th>
                <th>Stop Loss</th>
                <th>Trailing</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={9}>Loading…</td>
                </tr>
              )}
              {!isLoading && data?.rows.length === 0 && (
                <tr>
                  <td colSpan={9}>No runs found. Adjust your filters.</td>
                </tr>
              )}
              {data?.rows.map((portfolio, index) => (
                <tr key={portfolio.portfolioID}>
                  <td>{page * size + index + 1}</td>
                  <td>{portfolio.portfolioName}</td>
                  <td>{portfolio.strategyType}</td>
                  <td>{portfolio.startDate}</td>
                  <td>{portfolio.endDate}</td>
                  <td>{roundTo(Number(portfolio.portfolioTarget))}</td>
                  <td>{roundTo(Number(portfolio.portfolioStoploss))}</td>
                  <td>{portfolio.portfolioTrailingType}</td>
                  <td className="text-right">
                    <div className="table-actions">
                      <button type="button" onClick={() => navigate(`/backtesting/result/${portfolio.portfolioID}`)}>
                        View result
                      </button>
                      <button type="button" onClick={() => download(portfolio)}>
                        Export Txn
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <footer className="pagination">
          <button type="button" onClick={() => setPage((value) => Math.max(0, value - 1))} disabled={page === 0}>
            Previous
          </button>
          <span>
            Page {page + 1} of {data ? Math.max(1, Math.ceil((data.total ?? 0) / size)) : 1}
          </span>
          <button
            type="button"
            onClick={() => {
              if (!data) return;
              const totalPages = Math.ceil((data.total ?? 0) / size);
              setPage((value) => (value + 1 < totalPages ? value + 1 : value));
            }}
            disabled={data ? page + 1 >= Math.ceil((data.total ?? 0) / size) : true}
          >
            Next
          </button>
        </footer>
      </section>
    </div>
  );
};

export default BacktestingListPage;
