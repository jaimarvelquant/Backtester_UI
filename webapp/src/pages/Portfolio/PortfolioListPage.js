import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
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
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
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
    // JSON Upload handlers
    const handleFileSelect = (event) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.type !== "application/json" && !file.name.endsWith(".json")) {
                show("danger", "Please select a valid JSON file");
                return;
            }
            setSelectedFile(file);
            setUploadProgress(0);
        }
    };
    const handleUpload = async () => {
        if (!selectedFile) {
            show("danger", "Please select a JSON file to upload");
            return;
        }
        setIsUploading(true);
        setUploadProgress(0);
        try {
            const formData = new FormData();
            formData.append("file", selectedFile);
            // Simulate upload progress
            const progressInterval = setInterval(() => {
                setUploadProgress((prev) => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return 90;
                    }
                    return prev + 10;
                });
            }, 100);
            // Get user ID - you might need to get this from authentication context
            // For now, using a default user ID
            const userId = 1;
            const strategyType = "JSON_UPLOAD";
            const response = await withLoader(() => apiClient.uploadPortfolio(formData, userId, strategyType));
            clearInterval(progressInterval);
            setUploadProgress(100);
            if (response.status === "success") {
                show("success", `Portfolio "${selectedFile.name}" uploaded successfully!`);
                setSelectedFile(null);
                setShowUploadModal(false);
                setUploadProgress(0);
                // Refresh the portfolio list
                queryClient.invalidateQueries({ queryKey });
                // Reset file input
                const fileInput = document.getElementById("json-file-input");
                if (fileInput)
                    fileInput.value = "";
            }
            else {
                show("danger", response.message || "Failed to upload portfolio");
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Failed to upload portfolio";
            show("danger", message);
        }
        finally {
            setIsUploading(false);
        }
    };
    const handleCancelUpload = () => {
        setShowUploadModal(false);
        setSelectedFile(null);
        setUploadProgress(0);
        setIsUploading(false);
        // Reset file input
        const fileInput = document.getElementById("json-file-input");
        if (fileInput)
            fileInput.value = "";
    };
    const validateJsonFile = (file) => {
        return file.type === "application/json" || file.name.endsWith(".json");
    };
    return (_jsxs("div", { className: "portfolio-page", children: [_jsxs("header", { className: "portfolio-page__header", children: [_jsxs("div", { children: [_jsx("h2", { children: "Portfolio Management" }), _jsx("p", { children: "Search, execute, and export multi-leg strategy portfolios." })] }), _jsx("button", { className: "btn btn-primary", type: "button", onClick: () => setShowUploadModal(true), children: "+ New Portfolio (JSON Upload)" })] }), _jsx("section", { className: "card", children: _jsxs("form", { className: "filters", onSubmit: onSearchSubmit, children: [_jsxs("label", { children: [_jsx("span", { children: "Portfolio" }), _jsx("input", { type: "text", value: filters.portfolioName ?? "", onChange: (event) => setFilters((prev) => ({ ...prev, portfolioName: event.target.value })), placeholder: "Name contains\u2026" })] }), _jsxs("label", { children: [_jsx("span", { children: "Strategy Type" }), _jsx("input", { type: "text", value: filters.strategyType ?? "", onChange: (event) => setFilters((prev) => ({ ...prev, strategyType: event.target.value })), placeholder: "e.g. ORB, VWAP" })] }), _jsxs("label", { children: [_jsx("span", { children: "Start Date" }), _jsx("input", { type: "date", value: filters.startDate ?? "", onChange: (event) => setFilters((prev) => ({ ...prev, startDate: event.target.value })) })] }), _jsxs("label", { children: [_jsx("span", { children: "End Date" }), _jsx("input", { type: "date", value: filters.endDate ?? "", onChange: (event) => setFilters((prev) => ({ ...prev, endDate: event.target.value })) })] }), _jsxs("div", { className: "filters__actions", children: [_jsx("button", { type: "button", className: "btn", onClick: resetSearch, children: "Reset" }), _jsx("button", { type: "submit", className: "btn btn-primary", children: "Search" })] })] }) }), _jsxs("section", { className: "card", children: [_jsxs("div", { className: "card__header", children: [_jsx("h3", { children: "Results" }), _jsxs("div", { className: "card__meta", children: [_jsxs("span", { children: [data?.total ?? 0, " items"] }), _jsx("select", { value: size, onChange: (event) => {
                                            setSize(Number(event.target.value));
                                            setPage(0);
                                        }, children: PAGE_SIZES.map((option) => (_jsxs("option", { value: option, children: [option, " / page"] }, option))) })] })] }), _jsx("div", { className: "table-wrapper", children: _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "#" }), _jsx("th", { children: "Name" }), _jsx("th", { children: "Strategy" }), _jsx("th", { children: "Start" }), _jsx("th", { children: "End" }), _jsx("th", { children: "Target" }), _jsx("th", { children: "Stop Loss" }), _jsx("th", { children: "Trailing" }), _jsx("th", { children: "Profit Reaches" }), _jsx("th", { children: "Owner" }), _jsx("th", { className: "text-right", children: "Actions" })] }) }), _jsxs("tbody", { children: [isLoading && (_jsx("tr", { children: _jsx("td", { colSpan: 11, children: "Loading\u2026" }) })), !isLoading && data?.rows.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 11, children: "No portfolios found. Adjust your filters." }) })), data?.rows.map((portfolio, index) => (_jsxs("tr", { children: [_jsx("td", { children: page * size + index + 1 }), _jsx("td", { children: portfolio.portfolioName }), _jsx("td", { children: portfolio.strategyType }), _jsx("td", { children: portfolio.startDate }), _jsx("td", { children: portfolio.endDate }), _jsx("td", { children: roundTo(Number(portfolio.portfolioTarget)) }), _jsx("td", { children: roundTo(Number(portfolio.portfolioStoploss)) }), _jsx("td", { children: portfolio.portfolioTrailingType }), _jsx("td", { children: roundTo(Number(portfolio.profitReaches)) }), _jsx("td", { children: portfolio.createdBy?.displayName ?? portfolio.createdBy?.username }), _jsx("td", { className: "text-right", children: _jsxs("div", { className: "table-actions", children: [_jsx("button", { type: "button", onClick: () => navigate(`/portfolio/${portfolio.portfolioID}`), children: "View" }), _jsx("button", { type: "button", onClick: () => handleRun(portfolio), children: "Run" }), _jsx("button", { type: "button", onClick: () => handleDownloadTxn(portfolio), children: "Export Txn" }), _jsx("button", { type: "button", onClick: () => handleDownload(portfolio, "XLSX"), children: "XLSX" }), _jsx("button", { type: "button", onClick: () => handleDownload(portfolio, "JSON"), children: "JSON" }), _jsx("button", { type: "button", className: "danger", onClick: () => handleDelete(portfolio), children: "Delete" })] }) })] }, portfolio.portfolioID)))] })] }) }), _jsxs("footer", { className: "pagination", children: [_jsx("button", { type: "button", onClick: () => setPage((value) => Math.max(0, value - 1)), disabled: page === 0, children: "Previous" }), _jsxs("span", { children: ["Page ", page + 1, " of ", data ? Math.max(1, Math.ceil((data.total ?? 0) / size)) : 1] }), _jsx("button", { type: "button", onClick: () => {
                                    if (!data)
                                        return;
                                    const totalPages = Math.ceil((data.total ?? 0) / size);
                                    setPage((value) => (value + 1 < totalPages ? value + 1 : value));
                                }, disabled: data ? page + 1 >= Math.ceil((data.total ?? 0) / size) : true, children: "Next" })] })] }), showUploadModal && (_jsx("div", { className: "modal-overlay", onClick: handleCancelUpload, children: _jsxs("div", { className: "modal-content", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "modal-header", children: [_jsx("h3", { children: "\uD83D\uDCC1 Upload Portfolio JSON" }), _jsx("button", { type: "button", className: "modal-close", onClick: handleCancelUpload, disabled: isUploading, children: "\u00D7" })] }), _jsxs("div", { className: "modal-body", children: [_jsxs("div", { className: "upload-area", children: [_jsx("input", { id: "json-file-input", type: "file", accept: ".json,application/json", onChange: handleFileSelect, disabled: isUploading, style: { display: 'none' } }), _jsxs("label", { htmlFor: "json-file-input", className: `file-drop-zone ${selectedFile ? 'has-file' : ''} ${isUploading ? 'disabled' : ''}`, children: [_jsx("div", { className: "file-drop-icon", children: selectedFile ? '📄' : '📁' }), _jsx("div", { className: "file-drop-text", children: selectedFile ? (_jsxs(_Fragment, { children: [_jsx("strong", { children: selectedFile.name }), _jsx("br", {}), _jsxs("span", { className: "file-size", children: [(selectedFile.size / 1024).toFixed(2), " KB"] })] })) : (_jsxs(_Fragment, { children: [_jsx("strong", { children: "Click to browse or drag and drop" }), _jsx("br", {}), _jsx("span", { children: "Select a JSON portfolio file to upload" })] })) })] })] }), selectedFile && (_jsxs("div", { className: "file-info", children: [_jsx("h4", { children: "\uD83D\uDCCB File Details" }), _jsxs("div", { className: "file-details", children: [_jsxs("div", { className: "detail-item", children: [_jsx("span", { className: "label", children: "Name:" }), _jsx("span", { className: "value", children: selectedFile.name })] }), _jsxs("div", { className: "detail-item", children: [_jsx("span", { className: "label", children: "Size:" }), _jsxs("span", { className: "value", children: [(selectedFile.size / 1024).toFixed(2), " KB"] })] }), _jsxs("div", { className: "detail-item", children: [_jsx("span", { className: "label", children: "Type:" }), _jsx("span", { className: "value", children: selectedFile.type || 'application/json' })] }), _jsxs("div", { className: "detail-item", children: [_jsx("span", { className: "label", children: "Last Modified:" }), _jsx("span", { className: "value", children: new Date(selectedFile.lastModified).toLocaleString() })] })] })] })), isUploading && (_jsxs("div", { className: "upload-progress", children: [_jsxs("div", { className: "progress-header", children: [_jsx("span", { children: "Uploading portfolio..." }), _jsxs("span", { children: [uploadProgress, "%"] })] }), _jsx("div", { className: "progress-bar", children: _jsx("div", { className: "progress-fill", style: { width: `${uploadProgress}%` } }) })] })), _jsxs("div", { className: "upload-instructions", children: [_jsx("h4", { children: "\uD83D\uDCDD Instructions" }), _jsxs("ul", { children: [_jsx("li", { children: "Select a valid JSON portfolio file" }), _jsx("li", { children: "The file should contain portfolio configuration data" }), _jsx("li", { children: "Supported format: .json files only" }), _jsx("li", { children: "Maximum file size: 10MB" })] })] })] }), _jsxs("div", { className: "modal-footer", children: [_jsx("button", { type: "button", className: "btn btn-secondary", onClick: handleCancelUpload, disabled: isUploading, children: "Cancel" }), _jsx("button", { type: "button", className: "btn btn-primary", onClick: handleUpload, disabled: !selectedFile || isUploading, children: isUploading ? 'Uploading...' : 'Upload Portfolio' })] })] }) }))] }));
};
export default PortfolioListPage;
