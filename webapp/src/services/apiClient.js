export class ApiError extends Error {
    constructor(message, status, payload) {
        super(message);
        Object.defineProperty(this, "status", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "payload", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.status = status;
        this.payload = payload;
    }
}
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';
const PUBLIC_BASE = import.meta.env.VITE_PUBLIC_BASE_URL ?? '/public';
export class ApiClient {
    constructor(getToken) {
        Object.defineProperty(this, "getToken", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: getToken
        });
    }
    buildHeaders(init, skipAuth) {
        const headers = new Headers(init?.headers ?? {});
        const isFormData = init?.body instanceof FormData;
        if (!isFormData && !headers.has('Content-Type')) {
            headers.set('Content-Type', 'application/json');
        }
        if (!skipAuth) {
            const token = this.getToken();
            if (token && !headers.has('Authorization')) {
                headers.set('Authorization', `Bearer ${token}`);
            }
        }
        return headers;
    }
    async handleResponse(response) {
        const contentType = response.headers.get('content-type') ?? '';
        if (!response.ok) {
            let payload;
            try {
                if (contentType.includes('application/json')) {
                    payload = await response.json();
                }
                else {
                    payload = await response.text();
                }
            }
            catch (error) {
                payload = undefined;
            }
            throw new ApiError(response.statusText || 'Request failed', response.status, payload);
        }
        if (response.status === 204) {
            return undefined;
        }
        if (contentType.includes('application/json')) {
            return (await response.json());
        }
        return (await response.blob());
    }
    async request(input, options = {}) {
        const { skipAuth, ...init } = options;
        const headers = this.buildHeaders(init, skipAuth);
        const response = await fetch(input, { ...init, headers });
        return this.handleResponse(response);
    }
    // Authentication
    login(body) {
        return this.request(`${PUBLIC_BASE}/login`, {
            method: 'POST',
            body: JSON.stringify(body),
            skipAuth: true
        });
    }
    // User management
    saveUser(body) {
        return this.request(`${API_BASE}/user/save`, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    }
    getUser(id) {
        return this.request(`${API_BASE}/user/id/${id}`);
    }
    searchUser(body) {
        return this.request(`${API_BASE}/user/search`, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    }
    getAllUsers() {
        return this.request(`${API_BASE}/user/all`);
    }
    // Master data
    saveMasterData(body) {
        return this.request(`${API_BASE}/master-data/save`, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    }
    getMasterData(id) {
        return this.request(`${API_BASE}/master-data/id/${id}`);
    }
    searchMasterData(body) {
        return this.request(`${API_BASE}/master-data/search`, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    }
    getAllMasterData() {
        return this.request(`${API_BASE}/master-data/all`);
    }
    // Portfolio
    savePortfolio(body) {
        return this.request(`${API_BASE}/portfolio/save`, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    }
    getPortfolio(id) {
        return this.request(`${API_BASE}/portfolio/id/${id}`);
    }
    getPortfolioTransaction(id) {
        return this.request(`${API_BASE}/portfolio/transaction/${id}`);
    }
    searchPortfolio(body) {
        return this.request(`${API_BASE}/portfolio/search`, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    }
    searchAllPortfolio(body) {
        return this.request(`${API_BASE}/portfolio/search/all`, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    }
    runPortfolio(id) {
        return this.request(`${API_BASE}/portfolio/run/${id}`);
    }
    deletePortfolio(id) {
        return this.request(`${API_BASE}/portfolio/id/${id}`, {
            method: 'DELETE'
        });
    }
    portfolioTransactionSearch(body) {
        return this.request(`${API_BASE}/portfolio/transaction/search`, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    }
    downloadPortfolio(ids, fileType) {
        return this.request(`${API_BASE}/portfolio/download/${fileType}`, {
            method: 'POST',
            body: JSON.stringify(ids)
        });
    }
    uploadPortfolio(formData, userId, strategyType) {
        return this.request(`${API_BASE}/portfolio/upload/${userId}/${strategyType}`, {
            method: 'POST',
            body: formData
        });
    }
    downloadPortfolioTransactions(ids) {
        return this.request(`${API_BASE}/portfolio/transaction/download`, {
            method: 'POST',
            body: JSON.stringify(ids)
        });
    }
    getSharedPortfolio(userId) {
        return this.request(`${API_BASE}/portfolio/shared/${userId}`);
    }
    saveSharedPortfolio(body, userId, portfolioId) {
        return this.request(`${API_BASE}/portfolio/shared/save/${userId}/${portfolioId}`, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    }
    // Trading view
    searchTradingView(body) {
        return this.request(`${API_BASE}/trading-view/search`, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    }
    getTradingView(id) {
        return this.request(`${API_BASE}/trading-view/id/${id}`);
    }
    getTradingViewTransaction(id) {
        return this.request(`${API_BASE}/trading-view/transaction/${id}`);
    }
    saveTradingView(body) {
        return this.request(`${API_BASE}/trading-view/save`, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    }
    deleteTradingView(id) {
        return this.request(`${API_BASE}/trading-view/id/${id}`, {
            method: 'DELETE'
        });
    }
    runTradingView(id) {
        return this.request(`${API_BASE}/trading-view/run/${id}`);
    }
    getSharedTradingView(userId) {
        return this.request(`${API_BASE}/trading-view/shared/${userId}`);
    }
    saveSharedTradingView(body, userId, tradingViewId) {
        return this.request(`${API_BASE}/trading-view/shared/save/${userId}/${tradingViewId}`, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    }
    downloadTradingView(ids, fileType) {
        return this.request(`${API_BASE}/trading-view/download/${fileType}`, {
            method: 'POST',
            body: JSON.stringify(ids)
        });
    }
    uploadTradingView(formData, userId) {
        return this.request(`${API_BASE}/trading-view/upload/${userId}`, {
            method: 'POST',
            body: formData
        });
    }
    downloadTradingViewTransactions(ids) {
        return this.request(`${API_BASE}/trading-view/transaction/download`, {
            method: 'POST',
            body: JSON.stringify(ids)
        });
    }
    tradingViewTransactionSearch(body) {
        return this.request(`${API_BASE}/trading-view/transaction/search`, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    }
    // Direct backtest execution methods
    runDirectBacktest(parameters) {
        const DIRECT_API_BASE = import.meta.env.VITE_DIRECT_API_BASE_URL ?? 'http://localhost:5000';
        return this.request(`${DIRECT_API_BASE}/api/backtest/run`, {
            method: 'POST',
            body: JSON.stringify(parameters),
            skipAuth: true
        });
    }
    runDirectTradingViewBacktest(parameters) {
        const DIRECT_API_BASE = import.meta.env.VITE_DIRECT_API_BASE_URL ?? 'http://localhost:5000';
        return this.request(`${DIRECT_API_BASE}/api/tradingview/run`, {
            method: 'POST',
            body: JSON.stringify(parameters),
            skipAuth: true
        });
    }
    // Simple Backtest Service methods
    runSimpleBacktest(parameters) {
        const DIRECT_API_BASE = import.meta.env.VITE_DIRECT_API_BASE_URL ?? 'http://localhost:5000';
        return this.request(`${DIRECT_API_BASE}/simple-backtest/run`, {
            method: 'POST',
            body: JSON.stringify(parameters),
            skipAuth: true
        });
    }
    runSimpleBacktestWithData(parameters) {
        const DIRECT_API_BASE = import.meta.env.VITE_DIRECT_API_BASE_URL ?? 'http://localhost:5000';
        return this.request(`${DIRECT_API_BASE}/simple-backtest/run-with-data`, {
            method: 'POST',
            body: JSON.stringify(parameters),
            skipAuth: true
        });
    }
    getSimpleBacktestInput() {
        const DIRECT_API_BASE = import.meta.env.VITE_DIRECT_API_BASE_URL ?? 'http://localhost:5000';
        return this.request(`${DIRECT_API_BASE}/simple-backtest/input`, {
            method: 'GET',
            skipAuth: true
        });
    }
    getSimpleBacktestResults() {
        const DIRECT_API_BASE = import.meta.env.VITE_DIRECT_API_BASE_URL ?? 'http://localhost:5000';
        return this.request(`${DIRECT_API_BASE}/simple-backtest/results`, {
            method: 'GET',
            skipAuth: true
        });
    }
    loadSimpleBacktestSample() {
        const DIRECT_API_BASE = import.meta.env.VITE_DIRECT_API_BASE_URL ?? 'http://localhost:5000';
        return this.request(`${DIRECT_API_BASE}/simple-backtest/load-sample`, {
            method: 'POST',
            skipAuth: true
        });
    }
    createSimpleBacktestTemplate() {
        const DIRECT_API_BASE = import.meta.env.VITE_DIRECT_API_BASE_URL ?? 'http://localhost:5000';
        return this.request(`${DIRECT_API_BASE}/simple-backtest/create-template`, {
            method: 'POST',
            skipAuth: true
        });
    }
    updateSimpleBacktestInput(parameters) {
        const DIRECT_API_BASE = import.meta.env.VITE_DIRECT_API_BASE_URL ?? 'http://localhost:5000';
        return this.request(`${DIRECT_API_BASE}/simple-backtest/update-input`, {
            method: 'POST',
            body: JSON.stringify(parameters),
            skipAuth: true
        });
    }
    // TradingView Backtest Service methods
    runTradingViewBacktest(parameters) {
        const DIRECT_API_BASE = import.meta.env.VITE_DIRECT_API_BASE_URL ?? 'http://localhost:5000';
        return this.request(`${DIRECT_API_BASE}/tradingview-backtest/run`, {
            method: 'POST',
            body: JSON.stringify(parameters),
            skipAuth: true
        });
    }
    getTradingViewBacktestInput() {
        const DIRECT_API_BASE = import.meta.env.VITE_DIRECT_API_BASE_URL ?? 'http://localhost:5000';
        return this.request(`${DIRECT_API_BASE}/tradingview-backtest/input`, {
            method: 'GET',
            skipAuth: true
        });
    }
    updateTradingViewBacktestFile(fileType, content) {
        const DIRECT_API_BASE = import.meta.env.VITE_DIRECT_API_BASE_URL ?? 'http://localhost:5000';
        return this.request(`${DIRECT_API_BASE}/tradingview-backtest/update`, {
            method: 'POST',
            body: JSON.stringify({ file_type: fileType, content }),
            skipAuth: true
        });
    }
    // Standard Backtest Service methods
    runStandardBacktest(parameters) {
        const DIRECT_API_BASE = import.meta.env.VITE_DIRECT_API_BASE_URL ?? 'http://localhost:5000';
        return this.request(`${DIRECT_API_BASE}/standard-backtest/run`, {
            method: 'POST',
            body: JSON.stringify(parameters),
            skipAuth: true
        });
    }
    getStandardBacktestInput() {
        const DIRECT_API_BASE = import.meta.env.VITE_DIRECT_API_BASE_URL ?? 'http://localhost:5000';
        return this.request(`${DIRECT_API_BASE}/standard-backtest/input`, {
            method: 'GET',
            skipAuth: true
        });
    }
    updateStandardBacktestSample(parameters) {
        const DIRECT_API_BASE = import.meta.env.VITE_DIRECT_API_BASE_URL ?? 'http://localhost:5000';
        return this.request(`${DIRECT_API_BASE}/standard-backtest/update-sample`, {
            method: 'POST',
            body: JSON.stringify(parameters),
            skipAuth: true
        });
    }
    updateStandardBacktestPortfolio(parameters) {
        const DIRECT_API_BASE = import.meta.env.VITE_DIRECT_API_BASE_URL ?? 'http://localhost:5000';
        return this.request(`${DIRECT_API_BASE}/standard-backtest/update-portfolio`, {
            method: 'POST',
            body: JSON.stringify(parameters),
            skipAuth: true
        });
    }
}
