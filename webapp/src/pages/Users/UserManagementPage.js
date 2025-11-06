import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@hooks/useApiClient';
import { useAlert } from '@context/AlertContext';
import { useLoading } from '@context/LoadingContext';
import './UserManagementPage.css';
const DEFAULT_ACCESS = [
    { accessName: 'USER_MANGEMENT', active: false },
    { accessName: 'MASTER_DATA_MANAGEMENT', active: false },
    { accessName: 'PORTFOLIO_MANAGEMENT', active: true },
    { accessName: 'PORTFOLIO_BACKTESTING', active: true },
    { accessName: 'TRADING_VIEW_MANAGEMENT', active: true },
    { accessName: 'TRADING_VIEW_BACKTESTING', active: true }
];
const createEmptyUser = () => ({
    username: '',
    displayName: '',
    email: '',
    mobileNumber: '',
    active: true,
    accessList: DEFAULT_ACCESS.map((access) => ({ ...access }))
});
const PAGE_SIZES = [10, 15, 20, 30, 50];
const UserManagementPage = () => {
    const apiClient = useApiClient();
    const { show, hide } = useAlert();
    const { withLoader } = useLoading();
    const queryClient = useQueryClient();
    const [action, setAction] = useState('list');
    const [selected, setSelected] = useState(createEmptyUser());
    const [filters, setFilters] = useState({ name: '', username: '' });
    const [appliedFilters, setAppliedFilters] = useState({ name: '', username: '' });
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(10);
    const queryKey = useMemo(() => ['users', appliedFilters, page, size], [appliedFilters, page, size]);
    const { data, isLoading } = useQuery({
        queryKey,
        queryFn: async () => {
            const payload = { page, size };
            if (appliedFilters.name)
                payload.name = appliedFilters.name;
            if (appliedFilters.username)
                payload.username = appliedFilters.username;
            const response = await apiClient.searchUser(payload);
            return response.data;
        }
    });
    const decorateAccess = (user) => {
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
    const openEdit = async (id, mode = 'edit') => {
        if (!id)
            return;
        try {
            const response = await withLoader(() => apiClient.getUser(id));
            const user = decorateAccess(response.data);
            setSelected({ ...user, password: '' });
            setAction(mode);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to load user';
            show('danger', message);
        }
    };
    const toggleAccess = (index) => {
        setSelected((prev) => ({
            ...prev,
            accessList: prev.accessList?.map((access, idx) => idx === index ? { ...access, active: !access.active } : access) ?? []
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
        if (!validate())
            return;
        try {
            const payload = { ...selected };
            if (!payload.password)
                delete payload.password;
            await withLoader(() => apiClient.saveUser(payload));
            show('success', 'User saved');
            setAction('list');
            queryClient.invalidateQueries({ queryKey });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to save user';
            show('danger', message);
        }
    };
    if (action !== 'list') {
        return (_jsxs("div", { className: "user-page", children: [_jsxs("header", { className: "user-page__header", children: [_jsxs("div", { children: [_jsx("h2", { children: action === 'add' ? 'Create user' : action === 'reset' ? 'Reset password' : 'Edit user' }), _jsx("p", { children: "Manage user access and credentials." })] }), _jsxs("div", { className: "user-page__actions", children: [_jsx("button", { type: "button", className: "btn", onClick: () => setAction('list'), children: "Cancel" }), _jsx("button", { type: "button", className: "btn btn-primary", onClick: save, children: "Save" })] })] }), _jsx("section", { className: "card", children: _jsxs("div", { className: "user-form", children: [_jsxs("label", { children: [_jsx("span", { children: "Display Name" }), _jsx("input", { type: "text", value: selected.displayName, onChange: (event) => setSelected((prev) => ({ ...prev, displayName: event.target.value })) })] }), _jsxs("label", { children: [_jsx("span", { children: "Username" }), _jsx("input", { type: "text", value: selected.username, onChange: (event) => setSelected((prev) => ({ ...prev, username: event.target.value })), disabled: action !== 'add' })] }), _jsxs("label", { children: [_jsx("span", { children: "Email" }), _jsx("input", { type: "email", value: selected.email ?? '', onChange: (event) => setSelected((prev) => ({ ...prev, email: event.target.value })) })] }), _jsxs("label", { children: [_jsx("span", { children: "Mobile" }), _jsx("input", { type: "tel", value: selected.mobileNumber ?? '', onChange: (event) => setSelected((prev) => ({ ...prev, mobileNumber: event.target.value })) })] }), _jsxs("label", { children: [_jsx("span", { children: "Password" }), _jsx("input", { type: "password", value: selected.password ?? '', onChange: (event) => setSelected((prev) => ({ ...prev, password: event.target.value })), placeholder: action === 'edit' ? 'Leave blank to keep unchanged' : 'Set password' })] }), _jsxs("label", { className: "checkbox-field", children: [_jsx("input", { type: "checkbox", checked: selected.active ?? true, onChange: (event) => setSelected((prev) => ({ ...prev, active: event.target.checked })) }), _jsx("span", { children: "Active" })] })] }) }), _jsxs("section", { className: "card", children: [_jsx("h3", { children: "Access rights" }), _jsx("div", { className: "access-grid", children: selected.accessList?.map((access, index) => (_jsxs("label", { className: access.active ? 'is-active' : '', children: [_jsx("input", { type: "checkbox", checked: access.active, onChange: () => toggleAccess(index) }), _jsx("span", { children: access.accessName.replace(/_/g, ' ') })] }, access.accessName))) })] })] }));
    }
    return (_jsxs("div", { className: "user-page", children: [_jsxs("header", { className: "user-page__header", children: [_jsxs("div", { children: [_jsx("h2", { children: "User Management" }), _jsx("p", { children: "Invite teammates and configure access by module." })] }), _jsx("button", { type: "button", className: "btn btn-primary", onClick: openAdd, children: "+ New User" })] }), _jsx("section", { className: "card", children: _jsxs("form", { className: "filters", onSubmit: (event) => {
                        event.preventDefault();
                        setAppliedFilters(filters);
                        setPage(0);
                    }, children: [_jsxs("label", { children: [_jsx("span", { children: "Name" }), _jsx("input", { type: "text", value: filters.name, onChange: (event) => setFilters((prev) => ({ ...prev, name: event.target.value })) })] }), _jsxs("label", { children: [_jsx("span", { children: "Username" }), _jsx("input", { type: "text", value: filters.username, onChange: (event) => setFilters((prev) => ({ ...prev, username: event.target.value })) })] }), _jsxs("div", { className: "filters__actions", children: [_jsx("button", { type: "button", className: "btn", onClick: () => {
                                        setFilters({ name: '', username: '' });
                                        setAppliedFilters({ name: '', username: '' });
                                        setPage(0);
                                    }, children: "Reset" }), _jsx("button", { type: "submit", className: "btn btn-primary", children: "Search" })] })] }) }), _jsxs("section", { className: "card", children: [_jsxs("div", { className: "card__header", children: [_jsx("h3", { children: "Users" }), _jsxs("div", { className: "card__meta", children: [_jsxs("span", { children: [data?.totalItems ?? 0, " items"] }), _jsx("select", { value: size, onChange: (event) => setSize(Number(event.target.value)), children: PAGE_SIZES.map((option) => (_jsxs("option", { value: option, children: [option, " / page"] }, option))) })] })] }), _jsx("div", { className: "table-wrapper", children: _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "#" }), _jsx("th", { children: "Name" }), _jsx("th", { children: "Username" }), _jsx("th", { children: "Status" }), _jsx("th", { className: "text-right", children: "Action" })] }) }), _jsxs("tbody", { children: [isLoading && (_jsx("tr", { children: _jsx("td", { colSpan: 5, children: "Loading\u2026" }) })), !isLoading && !data?.data?.length && (_jsx("tr", { children: _jsx("td", { colSpan: 5, children: "No users found." }) })), data?.data?.map((user, index) => (_jsxs("tr", { children: [_jsx("td", { children: page * size + index + 1 }), _jsx("td", { children: user.displayName }), _jsx("td", { children: user.username }), _jsx("td", { children: _jsx("span", { className: `badge ${user.active ? 'success' : 'danger'}`, children: user.active ? 'Active' : 'Inactive' }) }), _jsx("td", { className: "text-right", children: _jsxs("div", { className: "table-actions", children: [_jsx("button", { type: "button", onClick: () => openEdit(user.id), children: "Edit" }), _jsx("button", { type: "button", onClick: () => openEdit(user.id, 'reset'), children: "Reset Password" })] }) })] }, user.id)))] })] }) }), _jsxs("footer", { className: "pagination", children: [_jsx("button", { type: "button", onClick: () => setPage((value) => Math.max(0, value - 1)), disabled: page === 0, children: "Previous" }), _jsxs("span", { children: ["Page ", page + 1, " of ", data ? Math.max(1, Math.ceil((data.totalItems ?? 0) / size)) : 1] }), _jsx("button", { type: "button", onClick: () => {
                                    if (!data)
                                        return;
                                    const totalPages = Math.ceil((data.totalItems ?? 0) / size);
                                    setPage((value) => (value + 1 < totalPages ? value + 1 : value));
                                }, disabled: data ? page + 1 >= Math.ceil((data.totalItems ?? 0) / size) : true, children: "Next" })] })] })] }));
};
export default UserManagementPage;
