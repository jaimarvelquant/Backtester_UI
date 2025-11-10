import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@hooks/useApiClient';
import { useAlert } from '@context/AlertContext';
import { useLoading } from '@context/LoadingContext';
import type { MasterData, MasterDataItem, ApiResponse, PaginatedResponse } from '@app-types/api';

import './MasterDataPage.css';

type Action = 'list' | 'edit' | 'add';

const PAGE_SIZES = [10, 15, 20, 30, 50];

const createEmptyMasterData = (): MasterData => ({
  masterDataEnum: '',
  masterDataDesc: '',
  masterDataItemList: []
});

const MasterDataPage: React.FC = () => {
  const apiClient = useApiClient();
  const { show, hide } = useAlert();
  const { withLoader } = useLoading();
  const queryClient = useQueryClient();

  const [action, setAction] = useState<Action>('list');
  const [selected, setSelected] = useState<MasterData>(createEmptyMasterData());
  const [filters, setFilters] = useState({ masterDataDesc: '' });
  const [appliedFilters, setAppliedFilters] = useState({ masterDataDesc: '' });
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);

  const queryKey = useMemo(
    () => ['master-data', appliedFilters, page, size],
    [appliedFilters, page, size]
  );

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const payload: Record<string, unknown> = { page, size, ...appliedFilters };
      const response: ApiResponse<PaginatedResponse<MasterData>> = await apiClient.searchMasterData(payload);
      return response.data;
    }
  });

  const openAdd = () => {
    hide();
    setSelected(createEmptyMasterData());
    setAction('add');
  };

  const openEdit = async (id?: number) => {
    if (!id) return;
    try {
      hide();
      const response = await withLoader(() => apiClient.getMasterData(id));
      setSelected(response.data ?? createEmptyMasterData());
      setAction('edit');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load master data';
      show('danger', message);
    }
  };

  const validate = () => {
    if (!selected.masterDataEnum) {
      show('danger', 'Master data key is required');
      return false;
    }
    if (!selected.masterDataDesc) {
      show('danger', 'Description is required');
      return false;
    }
    if (!selected.masterDataItemList || selected.masterDataItemList.length === 0) {
      show('danger', 'At least one item is required');
      return false;
    }
    for (const item of selected.masterDataItemList) {
      if (!item.name) {
        show('danger', 'Item name is required');
        return false;
      }
      if (!item.desc) {
        show('danger', 'Item description is required');
        return false;
      }
    }
    return true;
  };

  const save = async () => {
    if (!validate()) return;
    try {
      await withLoader(() => apiClient.saveMasterData(selected));
      show('success', 'Master data saved');
      setAction('list');
      queryClient.invalidateQueries({ queryKey });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save master data';
      show('danger', message);
    }
  };

  const addItem = () => {
    setSelected((prev) => ({
      ...prev,
      masterDataItemList: [...(prev.masterDataItemList ?? []), { name: '', desc: '' }]
    }));
  };

  const removeItem = (index: number) => {
    setSelected((prev) => ({
      ...prev,
      masterDataItemList: prev.masterDataItemList?.filter((_, idx) => idx !== index) ?? []
    }));
  };

  const updateItem = (index: number, patch: Partial<MasterDataItem>) => {
    setSelected((prev) => ({
      ...prev,
      masterDataItemList: prev.masterDataItemList?.map((item, idx) =>
        idx === index ? { ...item, ...patch } : item
      ) ?? []
    }));
  };

  if (action !== 'list') {
    return (
      <div className="master-data">
        <header className="master-data__header">
          <div>
            <h2>{action === 'add' ? 'Create master data' : 'Edit master data'}</h2>
            <p>Maintain dropdowns and enumerations used across the platform.</p>
          </div>
          <div className="master-data__actions">
            <button type="button" className="btn" onClick={() => setAction('list')}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={save}>
              Save
            </button>
          </div>
        </header>

        <section className="card">
          <div className="master-data__form">
            <label>
              <span>Key (enum)</span>
              <input
                type="text"
                value={selected.masterDataEnum ?? ''}
                onChange={(event) => setSelected((prev) => ({ ...prev, masterDataEnum: event.target.value.toUpperCase() }))}
                placeholder="E.g. STRATEGY_TYPE"
              />
            </label>
            <label>
              <span>Description</span>
              <input
                type="text"
                value={selected.masterDataDesc ?? ''}
                onChange={(event) => setSelected((prev) => ({ ...prev, masterDataDesc: event.target.value }))}
                placeholder="Readable description"
              />
            </label>
          </div>
        </section>

        <section className="card">
          <div className="master-data__list-header">
            <h3>Items</h3>
            <button type="button" className="btn" onClick={addItem}>
              + Add Item
            </button>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Description</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {selected.masterDataItemList?.length ? (
                  selected.masterDataItemList.map((item, index) => (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td>
                        <input
                          type="text"
                          value={item.name ?? ''}
                          onChange={(event) => updateItem(index, { name: event.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={item.desc ?? ''}
                          onChange={(event) => updateItem(index, { desc: event.target.value })}
                        />
                      </td>
                      <td className="text-right">
                        <button type="button" className="btn danger" onClick={() => removeItem(index)}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4}>No items yet. Add at least one item.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="master-data">
      <header className="master-data__header">
        <div>
          <h2>Master Data Management</h2>
          <p>Centralise enumerations used by portfolios, trading view, and backtesting.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openAdd}>
          + New Master Data
        </button>
      </header>

      <section className="card">
        <form
          className="filters"
          onSubmit={(event) => {
            event.preventDefault();
            setAppliedFilters(filters);
            setPage(0);
          }}
        >
          <label>
            <span>Description</span>
            <input
              type="text"
              value={filters.masterDataDesc}
              onChange={(event) => setFilters({ masterDataDesc: event.target.value })}
              placeholder="Contains…"
            />
          </label>
          <div className="filters__actions">
            <button type="button" className="btn" onClick={() => setFilters({ masterDataDesc: '' })}>
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
          <h3>Dataset</h3>
          <div className="card__meta">
            <span>{data?.totalItems ?? 0} items</span>
            <select value={size} onChange={(event) => setSize(Number(event.target.value))}>
              {PAGE_SIZES.map((option) => (
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
                <th>Key</th>
                <th>Description</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={4}>Loading…</td>
                </tr>
              )}
              {!isLoading && !data?.data?.length && (
                <tr>
                  <td colSpan={4}>No master data found.</td>
                </tr>
              )}
              {data?.data?.map((row, index) => (
                <tr key={row.id}>
                  <td>{page * size + index + 1}</td>
                  <td>{row.masterDataEnum}</td>
                  <td>{row.masterDataDesc}</td>
                  <td className="text-right">
                    <button type="button" className="btn" onClick={() => openEdit(row.id)}>
                      Edit
                    </button>
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
            Page {page + 1} of {data ? Math.max(1, Math.ceil((data.totalItems ?? 0) / size)) : 1}
          </span>
          <button
            type="button"
            onClick={() => {
              if (!data) return;
              const totalPages = Math.ceil((data.totalItems ?? 0) / size);
              setPage((value) => (value + 1 < totalPages ? value + 1 : value));
            }}
            disabled={data ? page + 1 >= Math.ceil((data.totalItems ?? 0) / size) : true}
          >
            Next
          </button>
        </footer>
      </section>
    </div>
  );
};

export default MasterDataPage;
