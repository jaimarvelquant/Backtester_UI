import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';
import { AppLayout } from '@components/layout/AppLayout';
import { AlertBanner } from '@components/feedback/AlertBanner';
import { LoadingOverlay } from '@components/feedback/LoadingOverlay';
import LoginPage from '@pages/Login/LoginPage';
import DashboardPage from '@pages/Dashboard/DashboardPage';
import PortfolioListPage from '@pages/Portfolio/PortfolioListPage';
import PortfolioDetailPage from '@pages/Portfolio/PortfolioDetailPage';
import TradingViewListPage from '@pages/TradingView/TradingViewListPage';
import TradingViewDetailPage from '@pages/TradingView/TradingViewDetailPage';
import BacktestingListPage from '@pages/Backtesting/BacktestingListPage';
import BacktestingResultPage from '@pages/Backtesting/BacktestingResultPage';
import BacktestConfigurationPage from '@pages/Backtesting/BacktestConfigurationPage';
import MasterDataPage from '@pages/MasterData/MasterDataPage';
import UserManagementPage from '@pages/Users/UserManagementPage';
import NotFoundPage from '@pages/NotFound/NotFoundPage';

const App: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <>
      <AlertBanner />
      <LoadingOverlay />
      <Routes>
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />}
        />
        <Route
          path="/"
          element={isAuthenticated ? <AppLayout /> : <Navigate to="/login" replace />}
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />

          <Route path="portfolio">
            <Route index element={<Navigate to="/portfolio/list" replace />} />
            <Route path="list" element={<PortfolioListPage />} />
            <Route path=":id" element={<PortfolioDetailPage />} />
          </Route>

          <Route path="backtesting">
            <Route index element={<Navigate to="/backtesting/list" replace />} />
            <Route path="list" element={<BacktestingListPage />} />
            <Route path="configure" element={<BacktestConfigurationPage />} />
            <Route path="result/:id" element={<BacktestingResultPage />} />
          </Route>

          <Route path="trading-view">
            <Route index element={<Navigate to="/trading-view/list" replace />} />
            <Route path="list" element={<TradingViewListPage />} />
            <Route path=":id" element={<TradingViewDetailPage />} />
          </Route>

          <Route path="backtesting-tradingview">
            <Route index element={<Navigate to="/backtesting-tradingview/list" replace />} />
            <Route path="list" element={<BacktestingListPage />} />
            <Route path="result/:id" element={<BacktestingResultPage />} />
          </Route>

          <Route path="master-data" element={<MasterDataPage />} />
          <Route path="user" element={<UserManagementPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
      </Routes>
    </>
  );
};

export default App;
