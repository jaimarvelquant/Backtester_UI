import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@hooks/useApiClient";
import { useAlert } from "@context/AlertContext";
import { useLoading } from "@context/LoadingContext";
import type { Portfolio, ApiResponse, PaginatedResponse } from "@app-types/api";
import { dateStringToLong, dateLongToDisplay } from "@utils/date";
import { roundTo } from "@utils/number";
import { downloadBlob } from "@utils/download";

import "./PortfolioPages.css";

type PortfolioFilters = {
  portfolioName?: string;
  strategyType?: string;
  startDate?: string;
  endDate?: string;
};

const PAGE_SIZES = [10, 15, 20, 30, 50];

const PortfolioListPage: React.FC = () => {
  const apiClient = useApiClient();
  const { show } = useAlert();
  const { withLoader } = useLoading();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<PortfolioFilters>({});
  const [appliedFilters, setAppliedFilters] = useState<PortfolioFilters>({});
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const queryKey = useMemo(
    () => ["portfolios", appliedFilters, page, size],
    [appliedFilters, page, size]
  );

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const payload: Record<string, unknown> = {
        page,
        size,
        ran: true,
        ...appliedFilters
      };
      if (payload.startDate) payload.startDate = dateStringToLong(payload.startDate as string);
      if (payload.endDate) payload.endDate = dateStringToLong(payload.endDate as string);
      const response: ApiResponse<PaginatedResponse<Portfolio>> = await apiClient.searchPortfolio(
        payload
      );
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

  const onSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setAppliedFilters(filters);
    setPage(0);
  };

  const handleRun = async (portfolio: Portfolio) => {
    if (!portfolio.portfolioID) return;
    try {
      await withLoader(() => apiClient.runPortfolio(portfolio.portfolioID!));
      show("success", "Portfolio execution started");
      queryClient.invalidateQueries({ queryKey });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to execute portfolio";
      show("danger", message);
    }
  };

  const handleDelete = async (portfolio: Portfolio) => {
    if (!portfolio.portfolioID) return;
    if (!window.confirm(`Delete portfolio "${portfolio.portfolioName}"?`)) {
      return;
    }
    try {
      await withLoader(() => apiClient.deletePortfolio(portfolio.portfolioID!));
      show("success", "Portfolio deleted");
      queryClient.invalidateQueries({ queryKey });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to delete portfolio";
      show("danger", message);
    }
  };

  const handleDownload = async (portfolio: Portfolio, fileType: "XLSX" | "JSON") => {
    if (!portfolio.portfolioID) return;
    try {
      const blob = await withLoader(() => apiClient.downloadPortfolio([portfolio.portfolioID!], fileType));
      const filename = `${portfolio.portfolioName ?? "portfolio"}.${fileType.toLowerCase()}`;
      downloadBlob(blob, filename);
      show("success", "Download ready");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to download";
      show("danger", message);
    }
  };

  const handleDownloadTxn = async (portfolio: Portfolio) => {
    if (!portfolio.portfolioID) return;
    try {
      const blob = await withLoader(() => apiClient.downloadPortfolioTransactions([portfolio.portfolioID!]));
      const filename = `Txn_${portfolio.portfolioName ?? "portfolio"}.xlsx`;
      downloadBlob(blob, filename);
      show("success", "Transaction export is ready");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to download transactions";
      show("danger", message);
    }
  };

  // JSON Upload handlers
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
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

      const response = await withLoader(() =>
        apiClient.uploadPortfolio(formData, userId, strategyType)
      );

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
        const fileInput = document.getElementById("json-file-input") as HTMLInputElement;
        if (fileInput) fileInput.value = "";
      } else {
        show("danger", response.message || "Failed to upload portfolio");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to upload portfolio";
      show("danger", message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancelUpload = () => {
    setShowUploadModal(false);
    setSelectedFile(null);
    setUploadProgress(0);
    setIsUploading(false);

    // Reset file input
    const fileInput = document.getElementById("json-file-input") as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  const validateJsonFile = (file: File): boolean => {
    return file.type === "application/json" || file.name.endsWith(".json");
  };

  return (
    <div className="portfolio-page">
      <header className="portfolio-page__header">
        <div>
          <h2>Portfolio Management</h2>
          <p>Search, execute, and export multi-leg strategy portfolios.</p>
        </div>
        <button className="btn btn-primary" type="button" onClick={() => setShowUploadModal(true)}>
          + New Portfolio (JSON Upload)
        </button>
      </header>

      <section className="card">
        <form className="filters" onSubmit={onSearchSubmit}>
          <label>
            <span>Portfolio</span>
            <input
              type="text"
              value={filters.portfolioName ?? ""}
              onChange={(event) => setFilters((prev) => ({ ...prev, portfolioName: event.target.value }))}
              placeholder="Name contains…"
            />
          </label>

          <label>
            <span>Strategy Type</span>
            <input
              type="text"
              value={filters.strategyType ?? ""}
              onChange={(event) => setFilters((prev) => ({ ...prev, strategyType: event.target.value }))}
              placeholder="e.g. ORB, VWAP"
            />
          </label>

          <label>
            <span>Start Date</span>
            <input
              type="date"
              value={filters.startDate ?? ""}
              onChange={(event) => setFilters((prev) => ({ ...prev, startDate: event.target.value }))}
            />
          </label>

          <label>
            <span>End Date</span>
            <input
              type="date"
              value={filters.endDate ?? ""}
              onChange={(event) => setFilters((prev) => ({ ...prev, endDate: event.target.value }))}
            />
          </label>

          <div className="filters__actions">
            <button type="button" className="btn" onClick={resetSearch}>
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
          <h3>Results</h3>
          <div className="card__meta">
            <span>{data?.total ?? 0} items</span>
            <select
              value={size}
              onChange={(event) => {
                setSize(Number(event.target.value));
                setPage(0);
              }}
            >
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
                <th>Strategy</th>
                <th>Start</th>
                <th>End</th>
                <th>Target</th>
                <th>Stop Loss</th>
                <th>Trailing</th>
                <th>Profit Reaches</th>
                <th>Owner</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={11}>Loading…</td>
                </tr>
              )}
              {!isLoading && data?.rows.length === 0 && (
                <tr>
                  <td colSpan={11}>No portfolios found. Adjust your filters.</td>
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
                  <td>{roundTo(Number(portfolio.profitReaches))}</td>
                  <td>{portfolio.createdBy?.displayName ?? portfolio.createdBy?.username}</td>
                  <td className="text-right">
                    <div className="table-actions">
                      <button type="button" onClick={() => navigate(`/portfolio/${portfolio.portfolioID}`)}>
                        View
                      </button>
                      <button type="button" onClick={() => handleRun(portfolio)}>
                        Run
                      </button>
                      <button type="button" onClick={() => handleDownloadTxn(portfolio)}>
                        Export Txn
                      </button>
                      <button type="button" onClick={() => handleDownload(portfolio, "XLSX")}>
                        XLSX
                      </button>
                      <button type="button" onClick={() => handleDownload(portfolio, "JSON")}>
                        JSON
                      </button>
                      <button type="button" className="danger" onClick={() => handleDelete(portfolio)}>
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
          <button
            type="button"
            onClick={() => setPage((value) => Math.max(0, value - 1))}
            disabled={page === 0}
          >
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

      {/* JSON Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={handleCancelUpload}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📁 Upload Portfolio JSON</h3>
              <button
                type="button"
                className="modal-close"
                onClick={handleCancelUpload}
                disabled={isUploading}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="upload-area">
                <input
                  id="json-file-input"
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileSelect}
                  disabled={isUploading}
                  style={{ display: 'none' }}
                />

                <label
                  htmlFor="json-file-input"
                  className={`file-drop-zone ${selectedFile ? 'has-file' : ''} ${isUploading ? 'disabled' : ''}`}
                >
                  <div className="file-drop-icon">
                    {selectedFile ? '📄' : '📁'}
                  </div>
                  <div className="file-drop-text">
                    {selectedFile ? (
                      <>
                        <strong>{selectedFile.name}</strong>
                        <br />
                        <span className="file-size">
                          {(selectedFile.size / 1024).toFixed(2)} KB
                        </span>
                      </>
                    ) : (
                      <>
                        <strong>Click to browse or drag and drop</strong>
                        <br />
                        <span>Select a JSON portfolio file to upload</span>
                      </>
                    )}
                  </div>
                </label>
              </div>

              {selectedFile && (
                <div className="file-info">
                  <h4>📋 File Details</h4>
                  <div className="file-details">
                    <div className="detail-item">
                      <span className="label">Name:</span>
                      <span className="value">{selectedFile.name}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Size:</span>
                      <span className="value">{(selectedFile.size / 1024).toFixed(2)} KB</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Type:</span>
                      <span className="value">{selectedFile.type || 'application/json'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Last Modified:</span>
                      <span className="value">
                        {new Date(selectedFile.lastModified).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {isUploading && (
                <div className="upload-progress">
                  <div className="progress-header">
                    <span>Uploading portfolio...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <div className="upload-instructions">
                <h4>📝 Instructions</h4>
                <ul>
                  <li>Select a valid JSON portfolio file</li>
                  <li>The file should contain portfolio configuration data</li>
                  <li>Supported format: .json files only</li>
                  <li>Maximum file size: 10MB</li>
                </ul>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCancelUpload}
                disabled={isUploading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
              >
                {isUploading ? 'Uploading...' : 'Upload Portfolio'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortfolioListPage;
