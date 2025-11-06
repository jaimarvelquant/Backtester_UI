import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@hooks/useApiClient';
import { useAlert } from '@context/AlertContext';
import { useLoading } from '@context/LoadingContext';
import { dateStringToLong, dateLongToDisplay } from '@utils/date';
import { downloadBlob } from '@utils/download';
import '../Portfolio/PortfolioPages.css';
const TradingViewListPage = () => {
    const apiClient = useApiClient();
    const { show } = useAlert();
    const { withLoader } = useLoading();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [filters, setFilters] = useState({});
    const [appliedFilters, setAppliedFilters] = useState({});
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(10);
    const queryKey = useMemo(() => ['trading-view', appliedFilters, page, size], [appliedFilters, page, size]);
    const { data, isLoading } = useQuery({
        queryKey,
        queryFn: async () => {
            const payload = { page, size, ...appliedFilters };
            if (payload.startDate)
                payload.startDate = dateStringToLong(payload.startDate);
            if (payload.endDate)
                payload.endDate = dateStringToLong(payload.endDate);
            const response = await apiClient.searchTradingView(payload);
            return {
                total: response.data.totalItems,
                rows: response.data.data?.map((item) => ({
                    ...item,
                    startdate: item.startdate ? dateLongToDisplay(item.startdate) : item.startdate,
                    enddate: item.enddate ? dateLongToDisplay(item.enddate) : item.enddate
                })) ?? []
            };
        }
    });
    const search = (event) => {
        event.preventDefault();
        setAppliedFilters(filters);
        setPage(0);
    };
    const reset = () => {
        setFilters({});
        setAppliedFilters({});
        setPage(0);
    };
    const run = async (item) => {
        if (!item.id)
            return;
        try {
            await withLoader(() => apiClient.runTradingView(item.id));
            show('success', 'Trading view execution started');
            queryClient.invalidateQueries({ queryKey });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to execute trading view';
            show('danger', message);
        }
    };
    const remove = async (item) => {
        if (!item.id)
            return;
        if (!window.confirm(`Delete trading view "${item.name}"?`))
            return;
        try {
            await withLoader(() => apiClient.deleteTradingView(item.id));
            show('success', 'Trading view deleted');
            queryClient.invalidateQueries({ queryKey });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to delete trading view';
            show('danger', message);
        }
    };
    const download = async (item, type) => {
        if (!item.id)
            return;
        try {
            const blob = await withLoader(() => apiClient.downloadTradingView([item.id], type));
            const filename = `${item.name ?? 'trading-view'}.${type.toLowerCase()}`;
            downloadBlob(blob, filename);
            show('success', 'Download ready');
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to download';
            show('danger', message);
        }
    };
    const downloadTxn = async (item) => {
        if (!item.id)
            return;
        try {
            const blob = await withLoader(() => apiClient.downloadTradingViewTransactions([item.id]));
            const filename = `TV_Txn_${item.name ?? 'strategy'}.xlsx`;
            downloadBlob(blob, filename);
            show('success', 'Transaction download ready');
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to download transactions';
            show('danger', message);
        }
    };
    return (_jsxs("div", { className: "portfolio-page", children: [_jsx("header", { className: "portfolio-page__header", children: _jsxs("div", { children: [_jsx("h2", { children: "Trading View Library" }), _jsx("p", { children: "Store and version your trading view strategies." })] }) }), _jsx("section", { className: "card", children: _jsxs("form", { className: "filters", onSubmit: search, children: [_jsxs("label", { children: [_jsx("span", { children: "Name" }), _jsx("input", { type: "text", value: filters.name ?? '', onChange: (event) => setFilters((prev) => ({ ...prev, name: event.target.value })), placeholder: "Contains\u2026" })] }), _jsxs("label", { children: [_jsx("span", { children: "Start Date" }), _jsx("input", { type: "date", value: filters.startDate ?? '', onChange: (event) => setFilters((prev) => ({ ...prev, startDate: event.target.value })) })] }), _jsxs("label", { children: [_jsx("span", { children: "End Date" }), _jsx("input", { type: "date", value: filters.endDate ?? '', onChange: (event) => setFilters((prev) => ({ ...prev, endDate: event.target.value })) })] }), _jsxs("div", { className: "filters__actions", children: [_jsx("button", { type: "button", className: "btn", onClick: reset, children: "Reset" }), _jsx("button", { type: "submit", className: "btn btn-primary", children: "Search" })] })] }) }), _jsxs("section", { className: "card", children: [_jsxs("div", { className: "card__header", children: [_jsx("h3", { children: "Strategies" }), _jsxs("div", { className: "card__meta", children: [_jsxs("span", { children: [data?.total ?? 0, " items"] }), _jsx("select", { value: size, onChange: (event) => setSize(Number(event.target.value)), children: [10, 15, 20, 30, 50].map((option) => (_jsxs("option", { value: option, children: [option, " / page"] }, option))) })] })] }), _jsx("div", { className: "table-wrapper", children: _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "#" }), _jsx("th", { children: "Name" }), _jsx("th", { children: "Start" }), _jsx("th", { children: "End" }), _jsx("th", { children: "Exit Applicable" }), _jsx("th", { children: "Roll Over" }), _jsx("th", { children: "Owner" }), _jsx("th", { className: "text-right", children: "Actions" })] }) }), _jsxs("tbody", { children: [isLoading && (_jsx("tr", { children: _jsx("td", { colSpan: 8, children: "Loading\u2026" }) })), !isLoading && data?.rows.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 8, children: "No strategies found." }) })), data?.rows.map((row, index) => (_jsxs("tr", { children: [_jsx("td", { children: page * size + index + 1 }), _jsx("td", { children: row.name }), _jsx("td", { children: row.startdate }), _jsx("td", { children: row.enddate }), _jsx("td", { children: row.tvexitapplicable }), _jsx("td", { children: row.dorollover }), _jsx("td", { children: row.createdBy?.displayName ?? row.createdBy?.username }), _jsx("td", { className: "text-right", children: _jsxs("div", { className: "table-actions", children: [_jsx("button", { type: "button", onClick: () => navigate(`/trading-view/${row.id}`), children: "View" }), _jsx("button", { type: "button", onClick: () => run(row), children: "Run" }), _jsx("button", { type: "button", onClick: () => downloadTxn(row), children: "Export Txn" }), _jsx("button", { type: "button", onClick: () => download(row, 'XLSX'), children: "XLSX" }), _jsx("button", { type: "button", onClick: () => download(row, 'CSV'), children: "CSV" }), _jsx("button", { type: "button", onClick: () => download(row, 'JSON'), children: "JSON" }), _jsx("button", { type: "button", className: "danger", onClick: () => remove(row), children: "Delete" })] }) })] }, row.id)))] })] }) }), _jsxs("footer", { className: "pagination", children: [_jsx("button", { type: "button", onClick: () => setPage((value) => Math.max(0, value - 1)), disabled: page === 0, children: "Previous" }), _jsxs("span", { children: ["Page ", page + 1, " of ", data ? Math.max(1, Math.ceil((data.total ?? 0) / size)) : 1] }), _jsx("button", { type: "button", onClick: () => {
                                    if (!data)
                                        return;
                                    const totalPages = Math.ceil((data.total ?? 0) / size);
                                    setPage((value) => (value + 1 < totalPages ? value + 1 : value));
                                }, disabled: data ? page + 1 >= Math.ceil((data.total ?? 0) / size) : true, children: "Next" })] })] })] }));
};
export default TradingViewListPage;
