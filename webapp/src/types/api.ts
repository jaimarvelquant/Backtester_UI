export interface ApiResponse<T> {
  status: boolean;
  data: T;
  errorMessage?: string;
  localizedMessage?: string;
}

export interface PaginatedResponse<T> {
  totalItems: number;
  data: T[];
}

export interface UserAccess {
  id?: number;
  accessName: string;
  active: boolean;
}

export interface User {
  id?: number;
  username: string;
  displayName: string;
  email?: string;
  mobileNumber?: string;
  active?: boolean;
  accessList: UserAccess[];
  [key: string]: unknown;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponseData extends User {
  authToken: string;
  refreshToken?: string;
  expiryTime?: number;
}

export interface MasterDataItem {
  id?: number;
  name: string | null;
  desc: string;
}

export interface MasterData {
  id?: number;
  masterDataEnum?: string;
  masterDataDesc?: string;
  masterDataItemList: MasterDataItem[];
}

export interface PortfolioStrategyLeg {
  legID?: number;
  id?: number;
  [key: string]: unknown;
}

export interface PortfolioStrategySetting {
  strategyID?: number;
  strategyName?: string;
  legsSettings?: PortfolioStrategyLeg[];
  [key: string]: unknown;
}

export interface Portfolio {
  portfolioID?: number;
  portfolioName?: string;
  strategyType?: string;
  startDate?: string | null;
  endDate?: string | null;
  ran?: boolean;
  portfolioTarget?: number | null;
  portfolioStoploss?: number | null;
  profitReaches?: number | null;
  portfolioTrailingType?: string | null;
  createdBy?: User;
  strategiesSetting?: PortfolioStrategySetting[];
  [key: string]: unknown;
}

export interface TradingViewSignal {
  id?: number;
  datetime?: string;
  [key: string]: unknown;
}

export interface TradingView {
  id?: number;
  name?: string;
  startdate?: string | null;
  enddate?: string | null;
  tvexitapplicable?: string | null;
  dorollover?: string | null;
  createdBy?: User;
  tvsignals?: TradingViewSignal[];
  [key: string]: unknown;
}

export interface SearchRequest {
  page?: number;
  size?: number;
  [key: string]: unknown;
}

export interface PortfolioSearchRequest extends SearchRequest {
  userId?: number;
  ran?: boolean;
}

export interface TradingViewSearchRequest extends SearchRequest {
  userId?: number;
}

export interface ShareRequest {
  sharedToId?: number;
  [key: string]: unknown;
}

export type FileType = 'XLSX' | 'JSON' | 'CSV';
