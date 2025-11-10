import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@hooks/useApiClient';
import { useAlert } from '@context/AlertContext';
import { useLoading } from '@context/LoadingContext';
import type { User, UserAccess, ApiResponse, PaginatedResponse } from '@app-types/api';

import './UserManagementPage.css';

type Action = 'list' | 'add' | 'edit' | 'reset';

const DEFAULT_ACCESS: UserAccess[] = [
  { accessName: 'USER_MANGEMENT', active: false },
  { accessName: 'MASTER_DATA_MANAGEMENT', active: false },
  { accessName: 'PORTFOLIO_MANAGEMENT', active: true },
  { accessName: 'PORTFOLIO_BACKTESTING', active: true },
  { accessName: 'TRADING_VIEW_MANAGEMENT', active: true },
  { accessName: 'TRADING_VIEW_BACKTESTING', active: true }
];

const createEmptyUser = (): User & { password?: string } => ({
  username: '',
  displayName: '',
  email: '',
  mobileNumber: '',
  active: true,
  accessList: DEFAULT_ACCESS.map((access) => ({ ...access }))
});

const PAGE_SIZES = [10, 15, 20, 30, 50];

const UserManagementPage: React.FC = () => {
  const apiClient = useApiClient();
  const { show, hide } = useAlert();
  const { withLoader } = useLoading();
  const queryClient = useQueryClient();

  const [action, setAction] = useState<Action>('list');
  const [selected, setSelected] = useState<User & { password?: string }>(createEmptyUser());
  const [filters, setFilters] = useState({ name: '', username: '' });
  const [appliedFilters, setAppliedFilters] = useState({ name: '', username: '' });
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);

  const queryKey = useMemo(() => ['users', appliedFilters, page, size], [appliedFilters, page, size]);

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const payload: Record<string, unknown> = { page, size };
      if (appliedFilters.name) payload.name = appliedFilters.name;
      if (appliedFilters.username) payload.username = appliedFilters.username;
      const response: ApiResponse<PaginatedResponse<User>> = await apiClient.searchUser(payload);
      return response.data;
    }
  });

  const decorateAccess = (user: User): User => {
    const accessList = DEFAULT_ACCESS.map((access) => {
      const existing = user.accessList?.find((item) => item.accessName === access.accessName);
      return existing ? { ...existing } : { ...access };
    });
    return { ...user, accessList };
  };

  const openAdd = () => {
    hide();
    setSelected(createEmptyUser());
    setAction('add');
  };

  const openEdit = async (id?: number, mode: Action = 'edit') => {
    if (!id) return;
    try {
      const response = await withLoader(() => apiClient.getUser(id));
      const user = decorateAccess(response.data as User);
      setSelected({ ...user, password: '' });
      setAction(mode);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load user';
      show('danger', message);
    }
  };

  const toggleAccess = (index: number) => {
    setSelected((prev) => ({
      ...prev,
      accessList: prev.accessList?.map((access, idx) =>
        idx === index ? { ...access, active: !access.active } : access
      ) ?? []
    }));
  };

  const validate = () => {
    if (!selected.displayName) {
      show('danger', 'Display name is required');
      return false;
    }
    if (!selected.username) {
      show('danger', 'Username is required');
      return false;
    }
    if (action === 'add' && !selected.password) {
      show('danger', 'Password is required for new users');
      return false;
    }
    if (action === 'reset' && !selected.password) {
      show('danger', 'Provide a new password');
      return false;
    }
    return true;
  };

  const save = async () => {
    if (!validate()) return;
    try {
      const payload: User & { password?: string } = { ...selected };
      if (!payload.password) delete payload.password;
      await withLoader(() => apiClient.saveUser(payload));
      show('success', 'User saved');
      setAction('list');
      queryClient.invalidateQueries({ queryKey });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save user';
      show('danger', message);
    }
  };

  if (action !== 'list') {
    return (
      <div className="user-page">
        <header className="user-page__header">
          <div>
            <h2>{action === 'add' ? 'Create user' : action === 'reset' ? 'Reset password' : 'Edit user'}</h2>
            <p>Manage user access and credentials.</p>
          </div>
          <div className="user-page__actions">
            <button type="button" className="btn" onClick={() => setAction('list')}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={save}>
              Save
            </button>
          </div>
        </header>

        <section className="card">
          <div className="user-form">
            <label>
              <span>Display Name</span>
              <input
                type="text"
                value={selected.displayName}
                onChange={(event) => setSelected((prev) => ({ ...prev, displayName: event.target.value }))}
              />
            </label>
            <label>
              <span>Username</span>
              <input
                type="text"
                value={selected.username}
                onChange={(event) => setSelected((prev) => ({ ...prev, username: event.target.value }))}
                disabled={action !== 'add'}
              />
            </label>
            <label>
              <span>Email</span>
              <input
                type="email"
                value={selected.email ?? ''}
                onChange={(event) => setSelected((prev) => ({ ...prev, email: event.target.value }))}
              />
            </label>
            <label>
              <span>Mobile</span>
              <input
                type="tel"
                value={selected.mobileNumber ?? ''}
                onChange={(event) => setSelected((prev) => ({ ...prev, mobileNumber: event.target.value }))}
              />
            </label>
            <label>
              <span>Password</span>
              <input
                type="password"
                value={selected.password ?? ''}
                onChange={(event) => setSelected((prev) => ({ ...prev, password: event.target.value }))}
                placeholder={action === 'edit' ? 'Leave blank to keep unchanged' : 'Set password'}
              />
            </label>
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={selected.active ?? true}
                onChange={(event) => setSelected((prev) => ({ ...prev, active: event.target.checked }))}
              />
              <span>Active</span>
            </label>
          </div>
        </section>

        <section className="card">
          <h3>Access rights</h3>
          <div className="access-grid">
            {selected.accessList?.map((access, index) => (
              <label key={access.accessName} className={access.active ? 'is-active' : ''}>
                <input
                  type="checkbox"
                  checked={access.active}
                  onChange={() => toggleAccess(index)}
                />
                <span>{access.accessName.replace(/_/g, ' ')}</span>
              </label>
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="user-page">
      <header className="user-page__header">
        <div>
          <h2>User Management</h2>
          <p>Invite teammates and configure access by module.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openAdd}>
          + New User
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
            <span>Name</span>
            <input
              type="text"
              value={filters.name}
              onChange={(event) => setFilters((prev) => ({ ...prev, name: event.target.value }))}
            />
          </label>
          <label>
            <span>Username</span>
            <input
              type="text"
              value={filters.username}
              onChange={(event) => setFilters((prev) => ({ ...prev, username: event.target.value }))}
            />
          </label>
          <div className="filters__actions">
            <button
              type="button"
              className="btn"
              onClick={() => {
                setFilters({ name: '', username: '' });
                setAppliedFilters({ name: '', username: '' });
                setPage(0);
              }}
            >
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
          <h3>Users</h3>
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
                <th>Name</th>
                <th>Username</th>
                <th>Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={5}>Loading…</td>
                </tr>
              )}
              {!isLoading && !data?.data?.length && (
                <tr>
                  <td colSpan={5}>No users found.</td>
                </tr>
              )}
              {data?.data?.map((user, index) => (
                <tr key={user.id}>
                  <td>{page * size + index + 1}</td>
                  <td>{user.displayName}</td>
                  <td>{user.username}</td>
                  <td>
                    <span className={`badge ${user.active ? 'success' : 'danger'}`}>
                      {user.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="table-actions">
                      <button type="button" onClick={() => openEdit(user.id)}>
                        Edit
                      </button>
                      <button type="button" onClick={() => openEdit(user.id, 'reset')}>
                        Reset Password
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

export default UserManagementPage;
