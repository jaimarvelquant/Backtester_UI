import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { AuthProvider } from '@context/AuthContext';
import { AlertProvider } from '@context/AlertContext';
import { LoadingProvider } from '@context/LoadingContext';

import '@styles/global.css';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AlertProvider>
          <LoadingProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </LoadingProvider>
        </AlertProvider>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
