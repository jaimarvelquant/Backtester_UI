# Strategy Analysis Platform

A comprehensive web-based backtesting platform that integrates Python backend services with a modern React frontend for trading strategy analysis.

## Architecture

### Backend Services
- **`BTRunFromFrontend.py`** - Flask service for standard backtesting (port 8009)
- **`BTTVFromFrontend.py`** - Flask service for TradingView-based backtesting (port 8011)
- **`api_gateway.py`** - API Gateway service that proxies requests to the Python backends (port 5000)

### Frontend
- **React 18 + TypeScript** - Modern web application with Vite build tool
- **React Query** - Data fetching and state management
- **React Router** - Client-side routing
- **Pure CSS** - No external UI framework dependencies

## Features

- **Portfolio Management**: Create, save, and manage trading portfolios
- **Backtest Configuration**: Interactive interface for configuring backtest parameters
- **TradingView Integration**: Support for TradingView signal-based backtesting
- **Real-time Results**: Execute backtests and view results instantly
- **User Authentication**: Secure login system
- **Master Data Management**: Centralized configuration data

## Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm or yarn

### Backend Setup

1. **Install Python dependencies:**
   ```bash
   cd D:\strategy
   pip install -r requirements.txt
   ```

2. **Start the Python backtest services:**

   Open two separate terminals and run:

   **Terminal 1 - Standard Backtest Service:**
   ```bash
   python BTRunFromFrontend.py
   ```

   **Terminal 2 - TradingView Backtest Service:**
   ```bash
   python BTTVFromFrontend.py
   ```

3. **Start the API Gateway:**

   **Terminal 3 - API Gateway:**
   ```bash
   python api_gateway.py
   ```

### Frontend Setup

1. **Navigate to webapp directory:**
   ```bash
   cd webapp
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to `http://localhost:5173`

## API Endpoints

### Direct Backtest Endpoints (via API Gateway)

- **`POST /api/backtest/run`** - Run standard backtest
- **`POST /api/tradingview/run`** - Run TradingView backtest
- **`POST /api/backtest/save`** - Save portfolio configuration
- **`POST /api/portfolio/search`** - Search portfolios

### Original Backend Services

- **Standard Backtest**: `http://192.168.173.180:8009/backtest`
- **TradingView Backtest**: `http://192.168.173.180:8011/backtest`

## Configuration

### Environment Variables

Create a `.env` file in the webapp directory:

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_PUBLIC_BASE_URL=http://localhost:5000/public
VITE_DIRECT_API_BASE_URL=http://localhost:5000
```

### Network Configuration

The Python services are configured to run on `192.168.173.180`. Update the host addresses in the Python files if needed:

- `BTRunFromFrontend.py`: Line ~`app.run(host="192.168.173.180", port="8009")`
- `BTTVFromFrontend.py`: Line ~`app.run(host="192.168.173.180", port="8011")`

## Usage

### Running a Backtest

1. **Navigate to Backtest Configuration:**
   - Click "Configure BT" in the sidebar
   - Or go to `/backtesting/configure`

2. **Choose Backtest Type:**
   - **Simple Backtest**: Standard strategy backtesting
   - **TradingView Backtest**: TV signal-based backtesting

3. **Configure Parameters:**
   - Strategy name and type
   - Symbol and timeframe
   - Date range
   - Capital and position sizing
   - Target, stop loss, and trailing settings

4. **Execute:**
   - Click "Run Backtest" to start
   - Results will appear in the results section below

### Viewing Results

Backtest results are displayed in JSON format containing:
- Trade details and transactions
- Performance metrics
- Profit/loss analysis
- Strategy statistics

## Development

### Project Structure

```
strategy/
├── webapp/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API client
│   │   └── styles/        # Global styles
│   └── package.json
├── BTRunFromFrontend.py   # Standard backtest service
├── BTTVFromFrontend.py    # TradingView backtest service
├── api_gateway.py         # API Gateway
├── requirements.txt       # Python dependencies
└── README.md             # This file
```

### Adding New Features

1. **Backend**: Add new endpoints to `api_gateway.py`
2. **Frontend**:
   - Add API methods to `src/services/ApiClient.ts`
   - Create new pages in `src/pages/`
   - Update routing in `src/App.tsx`
   - Add navigation items in `src/components/layout/Sidebar.tsx`

## Troubleshooting

### Common Issues

1. **Services won't start:**
   - Check if ports 8009, 8011, and 5000 are available
   - Verify Python dependencies are installed

2. **Frontend can't connect to backend:**
   - Ensure API Gateway is running on port 5000
   - Check network configuration and firewall settings

3. **Missing Python modules:**
   - The backend services depend on `Util.py` and `config.py`
   - These modules need to be located or created for full functionality

### Logs

- **API Gateway**: Console output shows proxy requests and errors
- **Python Services**: Flask development server logs
- **Frontend**: Browser console and Vite dev server logs

## License

This project is for educational and development purposes.