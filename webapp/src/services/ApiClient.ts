import type {
  ApiResponse,
  LoginCredentials,
  LoginResponseData,
  MasterData,
  PaginatedResponse,
  Portfolio,
  PortfolioSearchRequest,
  ShareRequest,
  TradingView,
  TradingViewSearchRequest,
  User
} from '@types/api';

export class ApiError<T = unknown> extends Error {
  readonly status: number;
  readonly payload?: T;

  constructor(message: string, status: number, payload?: T) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';
const PUBLIC_BASE = import.meta.env.VITE_PUBLIC_BASE_URL ?? '/public';

type RequestOptions = RequestInit & { skipAuth?: boolean };

export class ApiClient {
  constructor(private readonly getToken: () => string | null) {}

  private buildHeaders(init?: RequestInit, skipAuth?: boolean): Headers {
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

  private async handleResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type') ?? '';

    if (!response.ok) {
      let payload: unknown;
      try {
        if (contentType.includes('application/json')) {
          payload = await response.json();
        } else {
          payload = await response.text();
        }
      } catch (error) {
        payload = undefined;
      }
      throw new ApiError(response.statusText || 'Request failed', response.status, payload);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    if (contentType.includes('application/json')) {
      return (await response.json()) as T;
    }

    return (await response.blob()) as unknown as T;
  }

  private async request<T>(input: RequestInfo | URL, options: RequestOptions = {}): Promise<T> {
    const { skipAuth, ...init } = options;
    const headers = this.buildHeaders(init, skipAuth);
    const response = await fetch(input, { ...init, headers });
    return this.handleResponse<T>(response);
  }

  // Authentication
  login(body: LoginCredentials) {
    return this.request<ApiResponse<LoginResponseData>>(`${PUBLIC_BASE}/login`, {
      method: 'POST',
      body: JSON.stringify(body),
      skipAuth: true
    });
  }

  // User management
  saveUser(body: User) {
    return this.request<ApiResponse<User>>(`${API_BASE}/user/save`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  getUser(id: number) {
    return this.request<ApiResponse<User>>(`${API_BASE}/user/id/${id}`);
  }

  searchUser(body: Record<string, unknown>) {
    return this.request<ApiResponse<PaginatedResponse<User>>>(`${API_BASE}/user/search`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  getAllUsers() {
    return this.request<ApiResponse<User[]>>(`${API_BASE}/user/all`);
  }

  // Master data
  saveMasterData(body: MasterData) {
    return this.request<ApiResponse<MasterData>>(`${API_BASE}/master-data/save`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  getMasterData(id: number) {
    return this.request<ApiResponse<MasterData>>(`${API_BASE}/master-data/id/${id}`);
  }

  searchMasterData(body: Record<string, unknown>) {
    return this.request<ApiResponse<PaginatedResponse<MasterData>>>(`${API_BASE}/master-data/search`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  getAllMasterData() {
    return this.request<ApiResponse<MasterData[]>>(`${API_BASE}/master-data/all`);
  }

  // Portfolio
  savePortfolio(body: Portfolio) {
    return this.request<ApiResponse<Portfolio>>(`${API_BASE}/portfolio/save`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  getPortfolio(id: number) {
    return this.request<ApiResponse<Portfolio>>(`${API_BASE}/portfolio/id/${id}`);
  }

  getPortfolioTransaction(id: number) {
    return this.request<ApiResponse<unknown>>(`${API_BASE}/portfolio/transaction/${id}`);
  }

  searchPortfolio(body: PortfolioSearchRequest) {
    return this.request<ApiResponse<PaginatedResponse<Portfolio>>>(`${API_BASE}/portfolio/search`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  searchAllPortfolio(body: Record<string, unknown>) {
    return this.request<ApiResponse<Portfolio[]>>(`${API_BASE}/portfolio/search/all`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  runPortfolio(id: number) {
    return this.request<ApiResponse<unknown>>(`${API_BASE}/portfolio/run/${id}`);
  }

  deletePortfolio(id: number) {
    return this.request<ApiResponse<boolean>>(`${API_BASE}/portfolio/id/${id}`, {
      method: 'DELETE'
    });
  }

  portfolioTransactionSearch(body: Record<string, unknown>) {
    return this.request<ApiResponse<unknown>>(`${API_BASE}/portfolio/transaction/search`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  downloadPortfolio(ids: number[], fileType: string) {
    return this.request<Blob>(`${API_BASE}/portfolio/download/${fileType}`, {
      method: 'POST',
      body: JSON.stringify(ids)
    });
  }

  uploadPortfolio(formData: FormData, userId: number, strategyType: string) {
    return this.request<ApiResponse<unknown>>(`${API_BASE}/portfolio/upload/${userId}/${strategyType}`, {
      method: 'POST',
      body: formData
    });
  }

  downloadPortfolioTransactions(ids: number[]) {
    return this.request<Blob>(`${API_BASE}/portfolio/transaction/download`, {
      method: 'POST',
      body: JSON.stringify(ids)
    });
  }

  getSharedPortfolio(userId: number) {
    return this.request<ApiResponse<Portfolio[]>>(`${API_BASE}/portfolio/shared/${userId}`);
  }

  saveSharedPortfolio(body: ShareRequest[], userId: number, portfolioId: number) {
    return this.request<ApiResponse<boolean>>(`${API_BASE}/portfolio/shared/save/${userId}/${portfolioId}`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  // Trading view
  searchTradingView(body: TradingViewSearchRequest) {
    return this.request<ApiResponse<PaginatedResponse<TradingView>>>(`${API_BASE}/trading-view/search`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  getTradingView(id: number) {
    return this.request<ApiResponse<TradingView>>(`${API_BASE}/trading-view/id/${id}`);
  }

  getTradingViewTransaction(id: number) {
    return this.request<ApiResponse<unknown>>(`${API_BASE}/trading-view/transaction/${id}`);
  }

  saveTradingView(body: TradingView) {
    return this.request<ApiResponse<TradingView>>(`${API_BASE}/trading-view/save`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  deleteTradingView(id: number) {
    return this.request<ApiResponse<boolean>>(`${API_BASE}/trading-view/id/${id}`, {
      method: 'DELETE'
    });
  }

  runTradingView(id: number) {
    return this.request<ApiResponse<unknown>>(`${API_BASE}/trading-view/run/${id}`);
  }

  getSharedTradingView(userId: number) {
    return this.request<ApiResponse<TradingView[]>>(`${API_BASE}/trading-view/shared/${userId}`);
  }

  saveSharedTradingView(body: ShareRequest[], userId: number, tradingViewId: number) {
    return this.request<ApiResponse<boolean>>(`${API_BASE}/trading-view/shared/save/${userId}/${tradingViewId}`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  downloadTradingView(ids: number[], fileType: string) {
    return this.request<Blob>(`${API_BASE}/trading-view/download/${fileType}`, {
      method: 'POST',
      body: JSON.stringify(ids)
    });
  }

  uploadTradingView(formData: FormData, userId: number) {
    return this.request<ApiResponse<unknown>>(`${API_BASE}/trading-view/upload/${userId}`, {
      method: 'POST',
      body: formData
    });
  }

  downloadTradingViewTransactions(ids: number[]) {
    return this.request<Blob>(`${API_BASE}/trading-view/transaction/download`, {
      method: 'POST',
      body: JSON.stringify(ids)
    });
  }

  tradingViewTransactionSearch(body: Record<string, unknown>) {
    return this.request<ApiResponse<unknown>>(`${API_BASE}/trading-view/transaction/search`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  // Direct backtest execution methods
  runDirectBacktest(parameters: Record<string, unknown>) {
    const DIRECT_API_BASE = import.meta.env.VITE_DIRECT_API_BASE_URL ?? 'http://localhost:5000';
    return this.request<ApiResponse<unknown>>(`${DIRECT_API_BASE}/api/backtest/run`, {
      method: 'POST',
      body: JSON.stringify(parameters),
      skipAuth: true
    });
  }

  runDirectTradingViewBacktest(parameters: Record<string, unknown>) {
    const DIRECT_API_BASE = import.meta.env.VITE_DIRECT_API_BASE_URL ?? 'http://localhost:5000';
    return this.request<ApiResponse<unknown>>(`${DIRECT_API_BASE}/api/tradingview/run`, {
      method: 'POST',
      body: JSON.stringify(parameters),
      skipAuth: true
    });
  }
}
