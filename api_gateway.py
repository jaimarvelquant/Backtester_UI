from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
import logging
import os
import pandas as pd
import json
from werkzeug.utils import secure_filename
import tempfile

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Backend service URLs
BACKTEST_SERVICE_URL = "http://localhost:8009"
TRADINGVIEW_SERVICE_URL = "http://localhost:8011"
SIMPLE_BACKTEST_SERVICE_URL = "http://localhost:8012"

@app.route('/', methods=['GET'])
def serve_root():
    """Serve the simple test interface from API Gateway"""
    return send_from_directory(BASE_DIR, 'simple_test.html')

@app.route('/simple_test.html', methods=['GET'])
def serve_simple_test():
    """Serve the simple test interface"""
    return send_from_directory(BASE_DIR, 'simple_test.html')

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "service": "API Gateway"})

@app.route('/public/login', methods=['POST'])
def login():
    """Mock login endpoint for testing"""
    try:
        data = request.get_json()
        username = data.get('username', '')
        password = data.get('password', '')

        logger.info(f"Login attempt for user: {username}")

        # Accept any non-empty username/password for demo purposes
        if username and password:
            return jsonify({
                "status": "success",
                "data": {
                    "authToken": "demo-token-12345",
                    "userId": 1,
                    "username": username,
                    "name": f"Demo User ({username})",
                    "email": f"{username}@demo.com"
                }
            })
        else:
            return jsonify({
                "status": "error",
                "message": "Username and password are required"
            }), 400

    except Exception as e:
        logger.error(f"Error in login: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/backtest/run', methods=['POST'])
def run_backtest():
    """Proxy to the main backtest service"""
    try:
        data = request.get_json()
        logger.info(f"Forwarding backtest request to {BACKTEST_SERVICE_URL}")

        response = requests.post(
            f"{BACKTEST_SERVICE_URL}/backtest",
            json={"parameters": data},
            timeout=300  # 5 minute timeout
        )

        return jsonify(response.json()), response.status_code

    except requests.exceptions.Timeout:
        return jsonify({"status": "error", "message": "Backtest service timeout"}), 408
    except requests.exceptions.ConnectionError:
        return jsonify({"status": "error", "message": "Backtest service unavailable"}), 503
    except Exception as e:
        logger.error(f"Error in run_backtest: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/tradingview/run', methods=['POST'])
def run_tradingview_backtest_legacy():
    """Proxy to the TradingView backtest service"""
    try:
        data = request.get_json()
        logger.info(f"Forwarding TradingView backtest request to {TRADINGVIEW_SERVICE_URL}")

        response = requests.post(
            f"{TRADINGVIEW_SERVICE_URL}/backtest",
            json={"parameters": data},
            timeout=300  # 5 minute timeout
        )

        return jsonify(response.json()), response.status_code

    except requests.exceptions.Timeout:
        return jsonify({"status": "error", "message": "TradingView service timeout"}), 408
    except requests.exceptions.ConnectionError:
        return jsonify({"status": "error", "message": "TradingView service unavailable"}), 503
    except Exception as e:
        logger.error(f"Error in run_tradingview_backtest: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/backtest/save', methods=['POST'])
def save_portfolio():
    """Mock portfolio save - returns success for demo purposes"""
    try:
        data = request.get_json()
        logger.info(f"Saving portfolio configuration")

        # For demo purposes, just return success with a mock ID
        return jsonify({
            "status": "success",
            "data": {
                "id": 12345,
                "name": data.get("name", "Untitled Portfolio"),
                "created_at": "2024-01-01T00:00:00Z"
            }
        })
    except Exception as e:
        logger.error(f"Error in save_portfolio: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/portfolio/search', methods=['POST'])
def search_portfolios():
    """Mock portfolio search - returns sample data for demo purposes"""
    try:
        data = request.get_json()
        logger.info(f"Searching portfolios")

        # For demo purposes, return empty results
        return jsonify({
            "status": "success",
            "data": {
                "items": [],
                "total": 0,
                "page": 1,
                "limit": 10
            }
        })
    except Exception as e:
        logger.error(f"Error in search_portfolios: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

# Simple Backtest Service Endpoints
@app.route('/simple-backtest/run', methods=['POST'])
def run_simple_backtest():
    """Run simple backtest using JSON files"""
    try:
        response = requests.post(f"{SIMPLE_BACKTEST_SERVICE_URL}/simple-backtest/run",
                               json=request.get_json(), timeout=300)
        return jsonify(response.json()), response.status_code
    except requests.exceptions.RequestException as e:
        logger.error(f"Error connecting to Simple Backtest service: {str(e)}")
        return jsonify({"status": "error", "message": "Simple Backtest service unavailable"}), 503
    except Exception as e:
        logger.error(f"Error in run_simple_backtest: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/simple-backtest/create-template', methods=['POST'])
def create_input_template():
    """Create input template JSON file"""
    try:
        response = requests.post(f"{SIMPLE_BACKTEST_SERVICE_URL}/simple-backtest/create-template", timeout=30)
        return jsonify(response.json()), response.status_code
    except requests.exceptions.RequestException as e:
        logger.error(f"Error connecting to Simple Backtest service: {str(e)}")
        return jsonify({"status": "error", "message": "Simple Backtest service unavailable"}), 503
    except Exception as e:
        logger.error(f"Error in create_input_template: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/simple-backtest/results', methods=['GET'])
def get_backtest_results():
    """Get latest backtest results from output file"""
    try:
        response = requests.get(f"{SIMPLE_BACKTEST_SERVICE_URL}/simple-backtest/results", timeout=30)
        return jsonify(response.json()), response.status_code
    except requests.exceptions.RequestException as e:
        logger.error(f"Error connecting to Simple Backtest service: {str(e)}")
        return jsonify({"status": "error", "message": "Simple Backtest service unavailable"}), 503
    except Exception as e:
        logger.error(f"Error in get_backtest_results: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/simple-backtest/input', methods=['GET'])
def get_input_parameters():
    """Get current input parameters"""
    try:
        response = requests.get(f"{SIMPLE_BACKTEST_SERVICE_URL}/simple-backtest/input", timeout=30)
        return jsonify(response.json()), response.status_code
    except requests.exceptions.RequestException as e:
        logger.error(f"Error connecting to Simple Backtest service: {str(e)}")
        return jsonify({"status": "error", "message": "Simple Backtest service unavailable"}), 503
    except Exception as e:
        logger.error(f"Error in get_input_parameters: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/simple-backtest/update-input', methods=['POST'])
def update_input_parameters():
    """Update input parameters"""
    try:
        response = requests.post(f"{SIMPLE_BACKTEST_SERVICE_URL}/simple-backtest/update-input",
                               json=request.get_json(), timeout=30)
        return jsonify(response.json()), response.status_code
    except requests.exceptions.RequestException as e:
        logger.error(f"Error connecting to Simple Backtest service: {str(e)}")
        return jsonify({"status": "error", "message": "Simple Backtest service unavailable"}), 503
    except Exception as e:
        logger.error(f"Error in update_input_parameters: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/simple-backtest/load-sample', methods=['POST'])
def load_sample_backtest():
    """Load and run sample backtest data"""
    try:
        response = requests.post(f"{SIMPLE_BACKTEST_SERVICE_URL}/simple-backtest/load-sample", timeout=300)
        return jsonify(response.json()), response.status_code
    except requests.exceptions.RequestException as e:
        logger.error(f"Error connecting to Simple Backtest service: {str(e)}")
        return jsonify({"status": "error", "message": "Simple Backtest service unavailable"}), 503
    except Exception as e:
        logger.error(f"Error in load_sample_backtest: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/simple-backtest/run-with-data', methods=['POST'])
def run_backtest_with_data():
    """Run backtest with provided data"""
    try:
        response = requests.post(f"{SIMPLE_BACKTEST_SERVICE_URL}/simple-backtest/run-with-data",
                               json=request.get_json(), timeout=300)
        return jsonify(response.json()), response.status_code
    except requests.exceptions.RequestException as e:
        logger.error(f"Error connecting to Simple Backtest service: {str(e)}")
        return jsonify({"status": "error", "message": "Simple Backtest service unavailable"}), 503
    except Exception as e:
        logger.error(f"Error in run_backtest_with_data: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/simple-backtest/load-strategy-parameters', methods=['GET'])
def load_strategy_parameters():
    """Load strategy parameters from sample JSON file"""
    try:
        sample_file_path = r"C:\Users\Calin Jasper\Downloads\input json\sample backtest.json"

        if not os.path.exists(sample_file_path):
            return jsonify({
                "status": "error",
                "message": "Sample backtest JSON file not found"
            }), 404

        with open(sample_file_path, 'r', encoding='utf-8') as f:
            strategy_data = json.load(f)

        # Add option to strategy options list
        new_option = {
            "value": "CUSTOM_STRATEGY",
            "label": "Custom Strategy - Sample Backtest"
        }

        return jsonify({
            "status": "success",
            "data": {
                "strategy_option": new_option,
                "strategy_parameters": strategy_data
            }
        })

    except json.JSONDecodeError as e:
        logger.error(f"Error parsing JSON file: {str(e)}")
        return jsonify({"status": "error", "message": "Invalid JSON file format"}), 400
    except Exception as e:
        logger.error(f"Error in load_strategy_parameters: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

# Standard Backtest Service Endpoints
@app.route('/standard-backtest/run', methods=['POST'])
def run_standard_backtest():
    """Run standard backtest using JSON files"""
    try:
        response = requests.post(f"{BACKTEST_SERVICE_URL}/standard-backtest/run", timeout=300)
        return jsonify(response.json()), response.status_code
    except requests.exceptions.RequestException as e:
        logger.error(f"Error connecting to Standard Backtest service: {str(e)}")
        return jsonify({"status": "error", "message": "Standard Backtest service unavailable"}), 503
    except Exception as e:
        logger.error(f"Error in run_standard_backtest: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/standard-backtest/input', methods=['GET'])
def get_standard_input():
    """Get current input parameters for standard backtest"""
    try:
        response = requests.get(f"{BACKTEST_SERVICE_URL}/standard-backtest/input", timeout=30)
        return jsonify(response.json()), response.status_code
    except requests.exceptions.RequestException as e:
        logger.error(f"Error connecting to Standard Backtest service: {str(e)}")
        return jsonify({"status": "error", "message": "Standard Backtest service unavailable"}), 503
    except Exception as e:
        logger.error(f"Error in get_standard_input: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/standard-backtest/update-sample', methods=['POST'])
def update_sample_backtest():
    """Update sample backtest parameters"""
    try:
        response = requests.post(f"{BACKTEST_SERVICE_URL}/standard-backtest/update-sample",
                               json=request.get_json(), timeout=30)
        return jsonify(response.json()), response.status_code
    except requests.exceptions.RequestException as e:
        logger.error(f"Error connecting to Standard Backtest service: {str(e)}")
        return jsonify({"status": "error", "message": "Standard Backtest service unavailable"}), 503
    except Exception as e:
        logger.error(f"Error in update_sample_backtest: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/standard-backtest/update-portfolio', methods=['POST'])
def update_input_portfolio():
    """Update input portfolio parameters"""
    try:
        response = requests.post(f"{BACKTEST_SERVICE_URL}/standard-backtest/update-portfolio",
                               json=request.get_json(), timeout=30)
        return jsonify(response.json()), response.status_code
    except requests.exceptions.RequestException as e:
        logger.error(f"Error connecting to Standard Backtest service: {str(e)}")
        return jsonify({"status": "error", "message": "Standard Backtest service unavailable"}), 503
    except Exception as e:
        logger.error(f"Error in update_input_portfolio: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

# TradingView Backtest Service Endpoints
@app.route('/tradingview-backtest/run', methods=['POST'])
def run_tradingview_backtest():
    """Run TradingView backtest using JSON files"""
    try:
        response = requests.post(f"{TRADINGVIEW_SERVICE_URL}/tradingview-backtest/run", timeout=300)
        return jsonify(response.json()), response.status_code
    except requests.exceptions.RequestException as e:
        logger.error(f"Error connecting to TradingView Backtest service: {str(e)}")
        return jsonify({"status": "error", "message": "TradingView Backtest service unavailable"}), 503
    except Exception as e:
        logger.error(f"Error in run_tradingview_backtest: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/tradingview-backtest/input', methods=['GET'])
def get_tradingview_input():
    """Get current input parameters for TradingView backtest"""
    try:
        response = requests.get(f"{TRADINGVIEW_SERVICE_URL}/tradingview-backtest/input", timeout=30)
        return jsonify(response.json()), response.status_code
    except requests.exceptions.RequestException as e:
        logger.error(f"Error connecting to TradingView Backtest service: {str(e)}")
        return jsonify({"status": "error", "message": "TradingView Backtest service unavailable"}), 503
    except Exception as e:
        logger.error(f"Error in get_tradingview_input: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/tradingview-backtest/update', methods=['POST'])
def update_tradingview_file():
    """Update specific TradingView input file"""
    try:
        response = requests.post(f"{TRADINGVIEW_SERVICE_URL}/tradingview-backtest/update",
                               json=request.get_json(), timeout=30)
        return jsonify(response.json()), response.status_code
    except requests.exceptions.RequestException as e:
        logger.error(f"Error connecting to TradingView Backtest service: {str(e)}")
        return jsonify({"status": "error", "message": "TradingView Backtest service unavailable"}), 503
    except Exception as e:
        logger.error(f"Error in update_tradingview_file: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/tradingview-backtest/upload-excel', methods=['POST'])
def upload_excel_file():
    """Upload Excel/CSV file and convert to JSON for TradingView configuration"""
    try:
        if 'file' not in request.files:
            return jsonify({"status": "error", "message": "No file provided"}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({"status": "error", "message": "No file selected"}), 400

        # Get target configuration type from form data
        config_type = request.form.get('config_type', 'input_tv')

        if not allowed_file(file.filename):
            return jsonify({"status": "error", "message": "File type not allowed. Please upload CSV or Excel files."}), 400

        logger.info(f"Processing file upload: {file.filename} for config type: {config_type}")

        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='_' + secure_filename(file.filename)) as temp_file:
            file.save(temp_file.name)
            temp_file_path = temp_file.name

        try:
            # Convert Excel/CSV to JSON
            json_data = convert_excel_to_json(temp_file_path, config_type)

            # Clean up temp file
            os.unlink(temp_file_path)

            return jsonify({
                "status": "success",
                "data": {
                    "config_type": config_type,
                    "json_data": json_data,
                    "original_filename": file.filename
                }
            })

        except Exception as conversion_error:
            # Clean up temp file on error
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
            raise conversion_error

    except Exception as e:
        logger.error(f"Error in upload_excel_file: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in {'csv', 'xlsx', 'xls', 'xlsm'}

def convert_excel_to_json(file_path, config_type):
    """Convert Excel/CSV file to JSON based on configuration type"""
    try:
        # Read the Excel/CSV file
        if file_path.endswith('.csv'):
            df = pd.read_csv(file_path)
        else:
            df = pd.read_excel(file_path)

        # Convert based on configuration type
        if config_type == 'input_tv':
            return convert_input_tv_format(df)
        elif config_type == 'portfolio_long':
            return convert_portfolio_format(df, 'long')
        elif config_type == 'portfolio_short':
            return convert_portfolio_format(df, 'short')
        elif config_type == 'tbs_long':
            return convert_tbs_format(df, 'long')
        elif config_type == 'tbs_short':
            return convert_tbs_format(df, 'short')
        elif config_type == 'tradingview_backtest':
            return convert_tradingview_backtest_format(df)
        else:
            # Generic conversion - just return as JSON
            return df.to_dict('records')

    except Exception as e:
        logger.error(f"Error converting Excel to JSON: {str(e)}")
        raise Exception(f"Failed to convert file: {str(e)}")

def convert_input_tv_format(df):
    """Convert DataFrame to input_tv format"""
    try:
        # Create basic input_tv structure
        result = {
            "Name": "Uploaded Configuration",
            "StartDate": "01_01_2024",
            "EndDate": "01_01_2025",
            "Enabled": "yes",
            "TvExitApplicable": "yes",
            "DoRollover": "no",
            "SignalDateFormat": "%d-%m-%Y %H:%M",
            "ManualTradeLots": 1,
            "ManualTradeEntryTime": 0,
            "IntradayExitTime": 151500,
            "ExpiryDayExitTime": 151500,
            "RolloverTime": 151500,
            "IntradaySqOffApplicable": "no"
        }

        # Try to extract data from DataFrame
        if not df.empty:
            # Use first row for signal file path if available
            if 'SignalFilePath' in df.columns:
                result["SignalFilePath"] = str(df.iloc[0]['SignalFilePath'])
            elif 'signal_file' in df.columns:
                result["SignalFilePath"] = str(df.iloc[0]['signal_file'])

            # Portfolio file paths
            if 'LongPortfolioFilePath' in df.columns:
                result["LongPortfolioFilePath"] = str(df.iloc[0]['LongPortfolioFilePath'])
            if 'ShortPortfolioFilePath' in df.columns:
                result["ShortPortfolioFilePath"] = str(df.iloc[0]['ShortPortfolioFilePath'])

        return result
    except Exception as e:
        logger.error(f"Error in convert_input_tv_format: {str(e)}")
        # Return basic structure on error
        return {
            "Name": "Uploaded Configuration",
            "StartDate": "01_01_2024",
            "EndDate": "01_01_2025",
            "Enabled": "yes"
        }

def convert_portfolio_format(df, direction):
    """Convert DataFrame to portfolio format"""
    try:
        result = {
            "portfolio_name": f"Uploaded {direction.title()} Portfolio",
            "positions": []
        }

        for _, row in df.iterrows():
            position = {
                "symbol": str(row.get('symbol', row.get('Symbol', ''))),
                "quantity": int(row.get('quantity', row.get('Quantity', 1))),
                "direction": direction
            }
            result["positions"].append(position)

        return result
    except Exception as e:
        logger.error(f"Error in convert_portfolio_format: {str(e)}")
        return {"portfolio_name": f"Uploaded {direction.title()} Portfolio", "positions": []}

def convert_tbs_format(df, direction):
    """Convert DataFrame to TBS (TradingView Backtest Strategy) format"""
    try:
        result = {
            "strategy_name": f"Uploaded {direction.title()} Strategy",
            "legs": []
        }

        for _, row in df.iterrows():
            leg = {
                "symbol": str(row.get('symbol', row.get('Symbol', 'NIFTY'))),
                "action": str(row.get('action', row.get('Action', 'BUY'))),
                "strike_type": str(row.get('strike_type', row.get('StrikeType', 'ATM'))),
                "call_put": str(row.get('call_put', row.get('CallPut', 'CALL'))),
                "ratio": int(row.get('ratio', row.get('Ratio', 1)))
            }
            result["legs"].append(leg)

        return result
    except Exception as e:
        logger.error(f"Error in convert_tbs_format: {str(e)}")
        return {"strategy_name": f"Uploaded {direction.title()} Strategy", "legs": []}

def convert_tradingview_backtest_format(df):
    """Convert DataFrame to tradingview_backtest format"""
    try:
        result = {
            "backtest_name": "Uploaded TradingView Backtest",
            "configurations": []
        }

        for _, row in df.iterrows():
            config = {
                "parameter": str(row.get('parameter', row.get('Parameter', ''))),
                "value": str(row.get('value', row.get('Value', '')))
            }
            result["configurations"].append(config)

        return result
    except Exception as e:
        logger.error(f"Error in convert_tradingview_backtest_format: {str(e)}")
        return {"backtest_name": "Uploaded TradingView Backtest", "configurations": []}

if __name__ == "__main__":
    print("Starting API Gateway on http://localhost:5000")
    print("This will proxy requests to the Python backtest services")
    app.run(host="0.0.0.0", port=5000, debug=True)