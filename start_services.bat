@echo off
echo Starting Strategy Analysis Platform Services...
echo.

echo 1. Starting Standard Backtest Service (Port 8009)...
start "Standard Backtest" cmd /k "python BTRunFromFrontend.py"

echo 2. Starting TradingView Backtest Service (Port 8011)...
start "TradingView Backtest" cmd /k "python BTTVFromFrontend.py"

echo 3. Starting API Gateway (Port 5000)...
start "API Gateway" cmd /k "python api_gateway.py"

echo.
echo All services started in separate windows.
echo Next steps:
echo 1. Navigate to the webapp directory: cd webapp
echo 2. Install dependencies: npm install
echo 3. Start the frontend: npm run dev
echo 4. Open browser to: http://localhost:5173
echo.
pause