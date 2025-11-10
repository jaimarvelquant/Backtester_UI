import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@hooks/useApiClient';
import { useAlert } from '@context/AlertContext';
import { useLoading } from '@context/LoadingContext';
import type { TradingView, ApiResponse, PaginatedResponse } from '@app-types/api';
import { dateStringToLong, dateLongToDisplay } from '@utils/date';
import { downloadBlob } from '@utils/download';

import '../Portfolio/PortfolioPages.css';

type Filters = {
  name?: string;
  startDate?: string;
  endDate?: string;
};

const TradingViewListPage: React.FC = () => {
  const apiClient = useApiClient();
  const { show } = useAlert();
  const { withLoader } = useLoading();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<Filters>({});
  const [appliedFilters, setAppliedFilters] = useState<Filters>({});
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);

  const queryKey = useMemo(
    () => ['trading-view', appliedFilters, page, size],
    [appliedFilters, page, size]
  );

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const payload: Record<string, unknown> = { page, size, ...appliedFilters };
      if (payload.startDate) payload.startDate = dateStringToLong(payload.startDate as string);
      if (payload.endDate) payload.endDate = dateStringToLong(payload.endDate as string);
      const response: ApiResponse<PaginatedResponse<TradingView>> = await apiClient.searchTradingView(payload);
      return {
        total: response.data.totalItems,
        rows:
          response.data.data?.map((item) => ({
            ...item,
            startdate: item.startdate ? dateLongToDisplay(item.startdate) : item.startdate,
            enddate: item.enddate ? dateLongToDisplay(item.enddate) : item.enddate
          })) ?? []
      };
    }
  });

  const search = (event: React.FormEvent) => {
    event.preventDefault();
    setAppliedFilters(filters);
    setPage(0);
  };

  const reset = () => {
    setFilters({});
    setAppliedFilters({});
    setPage(0);
  };

  const run = async (item: TradingView) => {
    if (!item.id) return;
    try {
      await withLoader(() => apiClient.runTradingView(item.id!));
      show('success', 'Trading view execution started');
      queryClient.invalidateQueries({ queryKey });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to execute trading view';
      show('danger', message);
    }
  };

  const remove = async (item: TradingView) => {
    if (!item.id) return;
    if (!window.confirm(`Delete trading view "${item.name}"?`)) return;
    try {
      await withLoader(() => apiClient.deleteTradingView(item.id!));
      show('success', 'Trading view deleted');
      queryClient.invalidateQueries({ queryKey });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to delete trading view';
      show('danger', message);
    }
  };

  const download = async (item: TradingView, type: 'XLSX' | 'CSV' | 'JSON') => {
    if (!item.id) return;
    try {
      const blob = await withLoader(() => apiClient.downloadTradingView([item.id!], type));
      const filename = `${item.name ?? 'trading-view'}.${type.toLowerCase()}`;
      downloadBlob(blob, filename);
      show('success', 'Download ready');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to download';
      show('danger', message);
    }
  };

  const downloadTxn = async (item: TradingView) => {
    if (!item.id) return;
    try {
      const blob = await withLoader(() => apiClient.downloadTradingViewTransactions([item.id!]));
      const filename = `TV_Txn_${item.name ?? 'strategy'}.xlsx`;
      downloadBlob(blob, filename);
      show('success', 'Transaction download ready');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to download transactions';
      show('danger', message);
    }
  };

  return (
    <div className="portfolio-page">
      <header className="portfolio-page__header">
        <div>
          <h2>Trading View Library</h2>
          <p>Store and version your trading view strategies.</p>
        </div>
      </header>

      <section className="card">
        <form className="filters" onSubmit={search}>
          <label>
            <span>Name</span>
            <input
              type="text"
              value={filters.name ?? ''}
              onChange={(event) => setFilters((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Contains…"
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
          <h3>Strategies</h3>
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
                <th>Start</th>
                <th>End</th>
                <th>Exit Applicable</th>
                <th>Roll Over</th>
                <th>Owner</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={8}>Loading…</td>
                </tr>
              )}
              {!isLoading && data?.rows.length === 0 && (
                <tr>
                  <td colSpan={8}>No strategies found.</td>
                </tr>
              )}
              {data?.rows.map((row, index) => (
                <tr key={row.id}>
                  <td>{page * size + index + 1}</td>
                  <td>{row.name}</td>
                  <td>{row.startdate}</td>
                  <td>{row.enddate}</td>
                  <td>{row.tvexitapplicable}</td>
                  <td>{row.dorollover}</td>
                  <td>{row.createdBy?.displayName ?? row.createdBy?.username}</td>
                  <td className="text-right">
                    <div className="table-actions">
                      <button type="button" onClick={() => navigate(`/trading-view/${row.id}`)}>
                        View
                      </button>
                      <button type="button" onClick={() => run(row)}>
                        Run
                      </button>
                      <button type="button" onClick={() => downloadTxn(row)}>
                        Export Txn
                      </button>
                      <button type="button" onClick={() => download(row, 'XLSX')}>
                        XLSX
                      </button>
                      <button type="button" onClick={() => download(row, 'CSV')}>
                        CSV
                      </button>
                      <button type="button" onClick={() => download(row, 'JSON')}>
                        JSON
                      </button>
                      <button type="button" className="danger" onClick={() => remove(row)}>
                        Delete
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

export default TradingViewListPage;
