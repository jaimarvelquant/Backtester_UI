# Sample Backtest Integration Guide

This guide explains how to use the sample backtest data extracted from `simple_test.html` and integrated into your main backtest system.

## 📁 Files Created

### 1. Sample Data Files

- **`sample_backtest_input.json`** - Raw sample data from HTML form (web format)
- **`btpara_sample.json`** - Sample data formatted for SimpleBacktestService

### 2. Integration Scripts

- **`load_sample_backtest.py`** - Utility script to load sample data into main system

### 3. Updated Services

- **`SimpleBacktestService.py`** - Enhanced with sample data loading capabilities
- **`api_gateway.py`** - New endpoints for sample data operations

## 🚀 Quick Start

### Method 1: Using the Load Script (Recommended)

```bash
# Load sample data into main system
python load_sample_backtest.py load

# Run backtest with sample data
curl -X POST http://localhost:5000/simple-backtest/run

# View current configuration
python load_sample_backtest.py show

# Restore original configuration (if needed)
python load_sample_backtest.py restore
```

### Method 2: Direct API Calls

```bash
# Load and run sample backtest directly
curl -X POST http://localhost:5000/simple-backtest/load-sample

# Run backtest with custom data
curl -X POST http://localhost:5000/simple-backtest/run-with-data \
  -H "Content-Type: application/json" \
  -d @sample_backtest_input.json

# View results
curl http://localhost:5000/simple-backtest/results
```

### Method 3: Web Interface

1. Open `http://localhost:5000/simple_test.html`
2. The form is pre-populated with sample values
3. Click "Run Simple Backtest"

## 📊 Sample Configuration Details

### Portfolio Settings
- **Name**: CRUDE_STRATEGY
- **Initial Capital**: ₹100,000
- **Symbol**: NIFTY
- **Strategy**: Iron Butterfly (4-leg options strategy)

### Risk Management
- **Stop Loss**: 1%
- **Target**: 2%
- **Square Off Time**: 23:30:00
- **Slippage**: 0.5%

### Strategy Parameters
- **Strategy Name**: N1
- **Entry Time**: 09:55
- **Exit Time**: 14:00
- **Days to Expiry**: 10
- **Trading Days**: Monday-Friday

### Leg Configuration (Iron Butterfly)
1. **Leg 1**: Sell Call (Delta 0.5)
2. **Leg 2**: Sell Put (Delta -0.5)
3. **Leg 3**: Buy Call (ATM + 5)
4. **Leg 4**: Buy Put (ATM + 5)

## 🔧 API Endpoints

### Simple Backtest Service (Port 8012)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/simple-backtest/run` | POST | Run standard backtest |
| `/simple-backtest/load-sample` | POST | Load and run sample data |
| `/simple-backtest/run-with-data` | POST | Run with provided data |
| `/simple-backtest/results` | GET | Get latest results |
| `/simple-backtest/input` | GET | Get current input params |
| `/simple-backtest/update-input` | POST | Update input parameters |
| `/simple-backtest/create-template` | POST | Create input template |

### API Gateway (Port 5000)

All endpoints above are accessible through the API gateway at `http://localhost:5000`

## 📁 File Locations

### Input Files
- **Main Input**: `D:\Ajay\BT Portfolio\btpara.json`
- **Sample Input**: `D:\strategy\btpara_sample.json`
- **Web Format**: `D:\strategy\sample_backtest_input.json`

### Output Files
- **Results**: `D:\Ajay\BT Portfolio\output.json`

## 🛠 Service Management

### Start Services

```bash
# Terminal 1: Start API Gateway
python api_gateway.py

# Terminal 2: Start Simple Backtest Service
python SimpleBacktestService.py
```

### Service URLs
- **API Gateway**: http://localhost:5000
- **Simple Backtest Service**: http://localhost:8012
- **Web Interface**: http://localhost:5000/simple_test.html

## 📈 Expected Results

When you run the sample backtest, you should see:

### Basic Metrics
- **Trading Days**: ~250
- **Win Rate**: ~54%
- **Total P&L**: ~15% of capital
- **Sharpe Ratio**: ~1.25

### Sample Output Structure
```json
{
  "success": true,
  "statistics": {
    "total_trades": 250,
    "winning_trades": 135,
    "losing_trades": 115,
    "win_rate": 0.54,
    "total_pnl": 15000,
    "net_pnl": 14750,
    "max_profit": 8000,
    "max_loss": -5000
  },
  "metrics": [...],
  "trades": [...],
  "daily_pnl": [...]
}
```

## 🔍 Troubleshooting

### Common Issues

1. **Service Not Running**
   ```bash
   # Check if services are running
   curl http://localhost:5000/health
   curl http://localhost:8012/simple-backtest/results
   ```

2. **File Path Issues**
   - Ensure `D:\Ajay\BT Portfolio\` directory exists
   - Check file permissions for JSON files

3. **Port Conflicts**
   - API Gateway: Port 5000
   - Simple Backtest Service: Port 8012
   - Make sure ports are available

### Error Messages

- **"Simple Backtest service unavailable"**: Service not running on port 8012
- **"No input file found"**: Run `load_sample_backtest.py load` first
- **"Failed to load input parameters"**: Check JSON file format

## 🎯 Customization

### Modify Sample Parameters

1. Edit `sample_backtest_input.json` for web format changes
2. Edit `btpara_sample.json` for service format changes
3. Reload using `python load_sample_backtest.py load`

### Add New Strategies

1. Create new leg configurations in the sample files
2. Follow the existing parameter structure
3. Test with `/simple-backtest/run-with-data` endpoint

## 📚 Next Steps

1. **Run the sample backtest** using any method above
2. **Review the results** in the output file or via API
3. **Customize parameters** for your specific requirements
4. **Integrate with your existing workflow** using the API endpoints

## 📞 Support

If you encounter issues:

1. Check service logs for error messages
2. Verify file paths and permissions
3. Ensure all services are running on correct ports
4. Review JSON file format for syntax errors

---

**🎉 Congratulations!** You now have a fully functional sample backtest configuration integrated into your main system, ready for testing and customization.