import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@components': path.resolve(__dirname, 'src/components'),
      '@context': path.resolve(__dirname, 'src/context'),
      '@hooks': path.resolve(__dirname, 'src/hooks'),
      '@pages': path.resolve(__dirname, 'src/pages'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@app-types': path.resolve(__dirname, 'src/types'),
      '@styles': path.resolve(__dirname, 'src/styles'),
      '@data': path.resolve(__dirname, 'src/data')
    }
  },
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      },
      '/public': {
        target: 'http://localhost:5000',
        changeOrigin: true
      },
      '/strategy/backtest': {
        target: 'http://localhost:8080',
        changeOrigin: true
      },
      '/simple-backtest': {
        target: 'http://localhost:5000',
        changeOrigin: true
      },
      '/tradingview-backtest': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
});
