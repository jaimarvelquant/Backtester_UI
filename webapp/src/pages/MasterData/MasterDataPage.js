import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@hooks/useApiClient';
import { useAlert } from '@context/AlertContext';
import { useLoading } from '@context/LoadingContext';
import './MasterDataPage.css';
const PAGE_SIZES = [10, 15, 20, 30, 50];
const createEmptyMasterData = () => ({
    masterDataEnum: '',
    masterDataDesc: '',
    masterDataItemList: []
});
const MasterDataPage = () => {
    const apiClient = useApiClient();
    const { show, hide } = useAlert();
    const { withLoader } = useLoading();
    const queryClient = useQueryClient();
    const [action, setAction] = useState('list');
    const [selected, setSelected] = useState(createEmptyMasterData());
    const [filters, setFilters] = useState({ masterDataDesc: '' });
    const [appliedFilters, setAppliedFilters] = useState({ masterDataDesc: '' });
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(10);
    const queryKey = useMemo(() => ['master-data', appliedFilters, page, size], [appliedFilters, page, size]);
    const { data, isLoading } = useQuery({
        queryKey,
        queryFn: async () => {
            const payload = { page, size, ...appliedFilters };
            const response = await apiClient.searchMasterData(payload);
            return response.data;
        }
    });
    const openAdd = () => {
        hide();
        setSelected(createEmptyMasterData());
        setAction('add');
    };
    const openEdit = async (id) => {
        if (!id)
            return;
        try {
            hide();
            const response = await withLoader(() => apiClient.getMasterData(id));
            setSelected(response.data ?? createEmptyMasterData());
            setAction('edit');
        }
        catch (error) {
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
        if (!validate())
            return;
        try {
            await withLoader(() => apiClient.saveMasterData(selected));
            show('success', 'Master data saved');
            setAction('list');
            queryClient.invalidateQueries({ queryKey });
        }
        catch (error) {
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
    const removeItem = (index) => {
        setSelected((prev) => ({
            ...prev,
            masterDataItemList: prev.masterDataItemList?.filter((_, idx) => idx !== index) ?? []
        }));
    };
    const updateItem = (index, patch) => {
        setSelected((prev) => ({
            ...prev,
            masterDataItemList: prev.masterDataItemList?.map((item, idx) => idx === index ? { ...item, ...patch } : item) ?? []
        }));
    };
    if (action !== 'list') {
        return (_jsxs("div", { className: "master-data", children: [_jsxs("header", { className: "master-data__header", children: [_jsxs("div", { children: [_jsx("h2", { children: action === 'add' ? 'Create master data' : 'Edit master data' }), _jsx("p", { children: "Maintain dropdowns and enumerations used across the platform." })] }), _jsxs("div", { className: "master-data__actions", children: [_jsx("button", { type: "button", className: "btn", onClick: () => setAction('list'), children: "Cancel" }), _jsx("button", { type: "button", className: "btn btn-primary", onClick: save, children: "Save" })] })] }), _jsx("section", { className: "card", children: _jsxs("div", { className: "master-data__form", children: [_jsxs("label", { children: [_jsx("span", { children: "Key (enum)" }), _jsx("input", { type: "text", value: selected.masterDataEnum ?? '', onChange: (event) => setSelected((prev) => ({ ...prev, masterDataEnum: event.target.value.toUpperCase() })), placeholder: "E.g. STRATEGY_TYPE" })] }), _jsxs("label", { children: [_jsx("span", { children: "Description" }), _jsx("input", { type: "text", value: selected.masterDataDesc ?? '', onChange: (event) => setSelected((prev) => ({ ...prev, masterDataDesc: event.target.value })), placeholder: "Readable description" })] })] }) }), _jsxs("section", { className: "card", children: [_jsxs("div", { className: "master-data__list-header", children: [_jsx("h3", { children: "Items" }), _jsx("button", { type: "button", className: "btn", onClick: addItem, children: "+ Add Item" })] }), _jsx("div", { className: "table-wrapper", children: _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "#" }), _jsx("th", { children: "Name" }), _jsx("th", { children: "Description" }), _jsx("th", { className: "text-right", children: "Actions" })] }) }), _jsx("tbody", { children: selected.masterDataItemList?.length ? (selected.masterDataItemList.map((item, index) => (_jsxs("tr", { children: [_jsx("td", { children: index + 1 }), _jsx("td", { children: _jsx("input", { type: "text", value: item.name ?? '', onChange: (event) => updateItem(index, { name: event.target.value }) }) }), _jsx("td", { children: _jsx("input", { type: "text", value: item.desc ?? '', onChange: (event) => updateItem(index, { desc: event.target.value }) }) }), _jsx("td", { className: "text-right", children: _jsx("button", { type: "button", className: "btn danger", onClick: () => removeItem(index), children: "Remove" }) })] }, index)))) : (_jsx("tr", { children: _jsx("td", { colSpan: 4, children: "No items yet. Add at least one item." }) })) })] }) })] })] }));
    }
    return (_jsxs("div", { className: "master-data", children: [_jsxs("header", { className: "master-data__header", children: [_jsxs("div", { children: [_jsx("h2", { children: "Master Data Management" }), _jsx("p", { children: "Centralise enumerations used by portfolios, trading view, and backtesting." })] }), _jsx("button", { type: "button", className: "btn btn-primary", onClick: openAdd, children: "+ New Master Data" })] }), _jsx("section", { className: "card", children: _jsxs("form", { className: "filters", onSubmit: (event) => {
                        event.preventDefault();
                        setAppliedFilters(filters);
                        setPage(0);
                    }, children: [_jsxs("label", { children: [_jsx("span", { children: "Description" }), _jsx("input", { type: "text", value: filters.masterDataDesc, onChange: (event) => setFilters({ masterDataDesc: event.target.value }), placeholder: "Contains\u2026" })] }), _jsxs("div", { className: "filters__actions", children: [_jsx("button", { type: "button", className: "btn", onClick: () => setFilters({ masterDataDesc: '' }), children: "Reset" }), _jsx("button", { type: "submit", className: "btn btn-primary", children: "Search" })] })] }) }), _jsxs("section", { className: "card", children: [_jsxs("div", { className: "card__header", children: [_jsx("h3", { children: "Dataset" }), _jsxs("div", { className: "card__meta", children: [_jsxs("span", { children: [data?.totalItems ?? 0, " items"] }), _jsx("select", { value: size, onChange: (event) => setSize(Number(event.target.value)), children: PAGE_SIZES.map((option) => (_jsxs("option", { value: option, children: [option, " / page"] }, option))) })] })] }), _jsx("div", { className: "table-wrapper", children: _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "#" }), _jsx("th", { children: "Key" }), _jsx("th", { children: "Description" }), _jsx("th", { className: "text-right", children: "Action" })] }) }), _jsxs("tbody", { children: [isLoading && (_jsx("tr", { children: _jsx("td", { colSpan: 4, children: "Loading\u2026" }) })), !isLoading && !data?.data?.length && (_jsx("tr", { children: _jsx("td", { colSpan: 4, children: "No master data found." }) })), data?.data?.map((row, index) => (_jsxs("tr", { children: [_jsx("td", { children: page * size + index + 1 }), _jsx("td", { children: row.masterDataEnum }), _jsx("td", { children: row.masterDataDesc }), _jsx("td", { className: "text-right", children: _jsx("button", { type: "button", className: "btn", onClick: () => openEdit(row.id), children: "Edit" }) })] }, row.id)))] })] }) }), _jsxs("footer", { className: "pagination", children: [_jsx("button", { type: "button", onClick: () => setPage((value) => Math.max(0, value - 1)), disabled: page === 0, children: "Previous" }), _jsxs("span", { children: ["Page ", page + 1, " of ", data ? Math.max(1, Math.ceil((data.totalItems ?? 0) / size)) : 1] }), _jsx("button", { type: "button", onClick: () => {
                                    if (!data)
                                        return;
                                    const totalPages = Math.ceil((data.totalItems ?? 0) / size);
                                    setPage((value) => (value + 1 < totalPages ? value + 1 : value));
                                }, disabled: data ? page + 1 >= Math.ceil((data.totalItems ?? 0) / size) : true, children: "Next" })] })] })] }));
};
export default MasterDataPage;
