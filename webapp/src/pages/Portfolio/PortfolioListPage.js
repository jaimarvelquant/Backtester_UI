import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@hooks/useApiClient";
import { useAlert } from "@context/AlertContext";
import { useLoading } from "@context/LoadingContext";
import { dateStringToLong, dateLongToDisplay } from "@utils/date";
import { roundTo } from "@utils/number";
import { downloadBlob } from "@utils/download";
import "./PortfolioPages.css";
const PAGE_SIZES = [10, 15, 20, 30, 50];
const PortfolioListPage = () => {
    const apiClient = useApiClient();
    const { show } = useAlert();
    const { withLoader } = useLoading();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [filters, setFilters] = useState({});
    const [appliedFilters, setAppliedFilters] = useState({});
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(10);
    const queryKey = useMemo(() => ["portfolios", appliedFilters, page, size], [appliedFilters, page, size]);
    const { data, isLoading } = useQuery({
        queryKey,
        queryFn: async () => {
            const payload = {
                page,
                size,
                ran: true,
                ...appliedFilters
            };
            if (payload.startDate)
                payload.startDate = dateStringToLong(payload.startDate);
            if (payload.endDate)
                payload.endDate = dateStringToLong(payload.endDate);
            const response = await apiClient.searchPortfolio(payload);
            const result = response.data;
            return {
                total: result.totalItems,
                rows: result.data?.map((item) => ({
                    ...item,
                    startDate: item.startDate ? dateLongToDisplay(item.startDate) : item.startDate,
                    endDate: item.endDate ? dateLongToDisplay(item.endDate) : item.endDate
                })) ?? []
            };
        }
    });
    const resetSearch = () => {
        setFilters({});
        setAppliedFilters({});
        setPage(0);
    };
    const onSearchSubmit = (event) => {
        event.preventDefault();
        setAppliedFilters(filters);
        setPage(0);
    };
    const handleRun = async (portfolio) => {
        if (!portfolio.portfolioID)
            return;
        try {
            await withLoader(() => apiClient.runPortfolio(portfolio.portfolioID));
            show("success", "Portfolio execution started");
            queryClient.invalidateQueries({ queryKey });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Unable to execute portfolio";
            show("danger", message);
        }
    };
    const handleDelete = async (portfolio) => {
        if (!portfolio.portfolioID)
            return;
        if (!window.confirm(`Delete portfolio "${portfolio.portfolioName}"?`)) {
            return;
        }
        try {
            await withLoader(() => apiClient.deletePortfolio(portfolio.portfolioID));
            show("success", "Portfolio deleted");
            queryClient.invalidateQueries({ queryKey });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Unable to delete portfolio";
            show("danger", message);
        }
    };
    const handleDownload = async (portfolio, fileType) => {
        if (!portfolio.portfolioID)
            return;
        try {
            const blob = await withLoader(() => apiClient.downloadPortfolio([portfolio.portfolioID], fileType));
            const filename = `${portfolio.portfolioName ?? "portfolio"}.${fileType.toLowerCase()}`;
            downloadBlob(blob, filename);
            show("success", "Download ready");
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Unable to download";
            show("danger", message);
        }
    };
    const handleDownloadTxn = async (portfolio) => {
        if (!portfolio.portfolioID)
            return;
        try {
            const blob = await withLoader(() => apiClient.downloadPortfolioTransactions([portfolio.portfolioID]));
            const filename = `Txn_${portfolio.portfolioName ?? "portfolio"}.xlsx`;
            downloadBlob(blob, filename);
            show("success", "Transaction export is ready");
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Unable to download transactions";
            show("danger", message);
        }
    };
    return (_jsxs("div", { className: "portfolio-page", children: [_jsxs("header", { className: "portfolio-page__header", children: [_jsxs("div", { children: [_jsx("h2", { children: "Portfolio Management" }), _jsx("p", { children: "Search, execute, and export multi-leg strategy portfolios." })] }), _jsx("button", { className: "btn btn-primary", type: "button", onClick: () => show("info", "Upload JSON support is coming soon. Use the API endpoints meanwhile."), children: "+ New Portfolio (JSON Upload)" })] }), _jsx("section", { className: "card", children: _jsxs("form", { className: "filters", onSubmit: onSearchSubmit, children: [_jsxs("label", { children: [_jsx("span", { children: "Portfolio" }), _jsx("input", { type: "text", value: filters.portfolioName ?? "", onChange: (event) => setFilters((prev) => ({ ...prev, portfolioName: event.target.value })), placeholder: "Name contains\u2026" })] }), _jsxs("label", { children: [_jsx("span", { children: "Strategy Type" }), _jsx("input", { type: "text", value: filters.strategyType ?? "", onChange: (event) => setFilters((prev) => ({ ...prev, strategyType: event.target.value })), placeholder: "e.g. ORB, VWAP" })] }), _jsxs("label", { children: [_jsx("span", { children: "Start Date" }), _jsx("input", { type: "date", value: filters.startDate ?? "", onChange: (event) => setFilters((prev) => ({ ...prev, startDate: event.target.value })) })] }), _jsxs("label", { children: [_jsx("span", { children: "End Date" }), _jsx("input", { type: "date", value: filters.endDate ?? "", onChange: (event) => setFilters((prev) => ({ ...prev, endDate: event.target.value })) })] }), _jsxs("div", { className: "filters__actions", children: [_jsx("button", { type: "button", className: "btn", onClick: resetSearch, children: "Reset" }), _jsx("button", { type: "submit", className: "btn btn-primary", children: "Search" })] })] }) }), _jsxs("section", { className: "card", children: [_jsxs("div", { className: "card__header", children: [_jsx("h3", { children: "Results" }), _jsxs("div", { className: "card__meta", children: [_jsxs("span", { children: [data?.total ?? 0, " items"] }), _jsx("select", { value: size, onChange: (event) => {
                                            setSize(Number(event.target.value));
                                            setPage(0);
                                        }, children: PAGE_SIZES.map((option) => (_jsxs("option", { value: option, children: [option, " / page"] }, option))) })] })] }), _jsx("div", { className: "table-wrapper", children: _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "#" }), _jsx("th", { children: "Name" }), _jsx("th", { children: "Strategy" }), _jsx("th", { children: "Start" }), _jsx("th", { children: "End" }), _jsx("th", { children: "Target" }), _jsx("th", { children: "Stop Loss" }), _jsx("th", { children: "Trailing" }), _jsx("th", { children: "Profit Reaches" }), _jsx("th", { children: "Owner" }), _jsx("th", { className: "text-right", children: "Actions" })] }) }), _jsxs("tbody", { children: [isLoading && (_jsx("tr", { children: _jsx("td", { colSpan: 11, children: "Loading\u2026" }) })), !isLoading && data?.rows.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 11, children: "No portfolios found. Adjust your filters." }) })), data?.rows.map((portfolio, index) => (_jsxs("tr", { children: [_jsx("td", { children: page * size + index + 1 }), _jsx("td", { children: portfolio.portfolioName }), _jsx("td", { children: portfolio.strategyType }), _jsx("td", { children: portfolio.startDate }), _jsx("td", { children: portfolio.endDate }), _jsx("td", { children: roundTo(Number(portfolio.portfolioTarget)) }), _jsx("td", { children: roundTo(Number(portfolio.portfolioStoploss)) }), _jsx("td", { children: portfolio.portfolioTrailingType }), _jsx("td", { children: roundTo(Number(portfolio.profitReaches)) }), _jsx("td", { children: portfolio.createdBy?.displayName ?? portfolio.createdBy?.username }), _jsx("td", { className: "text-right", children: _jsxs("div", { className: "table-actions", children: [_jsx("button", { type: "button", onClick: () => navigate(`/portfolio/${portfolio.portfolioID}`), children: "View" }), _jsx("button", { type: "button", onClick: () => handleRun(portfolio), children: "Run" }), _jsx("button", { type: "button", onClick: () => handleDownloadTxn(portfolio), children: "Export Txn" }), _jsx("button", { type: "button", onClick: () => handleDownload(portfolio, "XLSX"), children: "XLSX" }), _jsx("button", { type: "button", onClick: () => handleDownload(portfolio, "JSON"), children: "JSON" }), _jsx("button", { type: "button", className: "danger", onClick: () => handleDelete(portfolio), children: "Delete" })] }) })] }, portfolio.portfolioID)))] })] }) }), _jsxs("footer", { className: "pagination", children: [_jsx("button", { type: "button", onClick: () => setPage((value) => Math.max(0, value - 1)), disabled: page === 0, children: "Previous" }), _jsxs("span", { children: ["Page ", page + 1, " of ", data ? Math.max(1, Math.ceil((data.total ?? 0) / size)) : 1] }), _jsx("button", { type: "button", onClick: () => {
                                    if (!data)
                                        return;
                                    const totalPages = Math.ceil((data.total ?? 0) / size);
                                    setPage((value) => (value + 1 < totalPages ? value + 1 : value));
                                }, disabled: data ? page + 1 >= Math.ceil((data.total ?? 0) / size) : true, children: "Next" })] })] })] }));
};
export default PortfolioListPage;
