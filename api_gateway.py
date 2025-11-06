from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import logging

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Backend service URLs
BACKTEST_SERVICE_URL = "http://localhost:8009"
TRADINGVIEW_SERVICE_URL = "http://localhost:8011"

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
def run_tradingview_backtest():
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

if __name__ == "__main__":
    print("Starting API Gateway on http://localhost:5000")
    print("This will proxy requests to the Python backtest services")
    app.run(host="0.0.0.0", port=5000, debug=True)