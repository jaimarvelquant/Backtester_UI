#!/usr/bin/env python3
"""
Simple Backtest Service for JSON-based input/output
Reads from D:\\Ajay\\BT Portfolio\\btpara.json
Writes to D:\\Ajay\\BT Portfolio\\output.json
"""

import json
import os
import sys
from datetime import datetime, timedelta
import pandas as pd
import mysql.connector
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import config
import Util

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

app = Flask(__name__)
CORS(app)

# File paths
INPUT_JSON_PATH = r"D:\Ajay\BT Portfolio\btpara.json"
OUTPUT_JSON_PATH = r"D:\Ajay\BT Portfolio\output.json"
SAMPLE_INPUT_PATH = r"D:\strategy\btpara_sample.json"
WEB_INPUT_PATH = r"D:\strategy\sample_backtest_input.json"

class SimpleBacktestService:
    def __init__(self):
        self.input_data = None
        self.output_data = {
            "metrics": [],
            "trades": [],
            "daily_pnl": [],
            "statistics": {}
        }

    def load_input_parameters(self, input_source=None):
        """Load backtest parameters from JSON file

        Args:
            input_source: Source to load from ('main', 'sample', 'web', or file path)
        """
        try:
            # Determine which file to load
            if input_source == 'sample':
                file_path = SAMPLE_INPUT_PATH
            elif input_source == 'web':
                file_path = WEB_INPUT_PATH
            elif os.path.exists(input_source):
                file_path = input_source
            else:
                file_path = INPUT_JSON_PATH

            if os.path.exists(file_path):
                with open(file_path, 'r') as f:
                    self.input_data = json.load(f)
                print(f"Loaded input from: {file_path}")
                return True
            else:
                print(f"Input file not found: {file_path}")
                return False
        except Exception as e:
            print(f"Error loading input file: {e}")
            return False

    def load_sample_data(self):
        """Load sample backtest data"""
        return self.load_input_parameters('sample')

    def load_web_data(self):
        """Load web-formatted backtest data"""
        return self.load_input_parameters('web')

    def create_input_template(self):
        """Create a template input JSON file with common backtest parameters"""
        template = {
            "istickbt": False,
            "slippage_percent": 0.005,
            "start_date": 240101,
            "end_date": 241231,
            "broker_details": {
                "broker": "BROKER.PAPER"
            },
            "exchange": "EXCHANGE.NSE",
            "order_type": "ORDERTYPE.MARKET",
            "product_type": "PRODUCTTYPE.NRML",
            "fix_vix": 0,
            "check_interval": 60,
            "feed_source": "FEEDSOURCE.HISTORICAL",
            "portfolio": {
                "id": 0,
                "name": "NIFTY_STRATEGY",
                "initial_capital": 1000000,
                "stop_loss": {
                    "type": "NUMBERTYPE.PERCENTAGE",
                    "value": -2.0,
                    "params": {
                        "check_frequency": 60
                    }
                },
                "take_profit": {
                    "type": "NUMBERTYPE.PERCENTAGE",
                    "value": 3.0,
                    "params": {
                        "check_frequency": 60
                    }
                },
                "trailing_stop_loss": {
                    "profit_move": {
                        "type": "NUMBERTYPE.PERCENTAGE",
                        "value": 1.0
                    },
                    "stop_loss_move": {
                        "type": "NUMBERTYPE.PERCENTAGE",
                        "value": 0.5
                    }
                },
                "lock_and_trail": {
                    "Type": "LOCKTYPE.MAX_TILL_TIME",
                    "lock_time": 84600,
                    "lock": 0.0,
                    "trail": 0.0
                },
                "strategies": [
                    {
                        "index_base_price": 0,
                        "index_traded": "NIFTY",
                        "instrument_type": "FUTIDX",
                        "expiry_selection": {
                            "type": "EXPIRYTYPE.WEEKLY",
                            "value": 0
                        },
                        "exit_day": {
                            "type": "EXITDAY.DAY",
                            "value": 0
                        },
                        "lot_size": 75,
                        "entry": {
                            "type": "ENTRYTYPE.TIMESTRATEGY",
                            "time": "09:20",
                            "day": {
                                "type": "DAYOFWEEK.EVERYDAY"
                            }
                        },
                        "exit": {
                            "type": "EXITTYPE.TIMESTRATEGY",
                            "time": "15:15",
                            "day": {
                                "type": "DAYOFWEEK.EVERYDAY"
                            }
                        },
                        "strategy": "BUY",
                        "legs": [
                            {
                                "strike_selection": {
                                    "type": "STRIKETYPE.ATM"
                                },
                                "strike": 0,
                                "call_put": "CALLPUT.CALL",
                                "action": "ACTION.BUY",
                                "ratio": 1
                            }
                        ]
                    }
                ]
            }
        }

        try:
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(INPUT_JSON_PATH), exist_ok=True)

            with open(INPUT_JSON_PATH, 'w') as f:
                json.dump(template, f, indent=4)

            print(f"Created input template at: {INPUT_JSON_PATH}")
            return True
        except Exception as e:
            print(f"Error creating input template: {e}")
            return False

    def run_backtest(self):
        """Execute the backtest based on loaded parameters"""
        if not self.input_data:
            return False

        try:
            # Extract parameters
            portfolio = self.input_data.get("portfolio", {})
            strategies = portfolio.get("strategies", [])
            start_date = self.input_data.get("start_date", 240101)
            end_date = self.input_data.get("end_date", 241231)
            initial_capital = portfolio.get("initial_capital", 1000000)

            # Generate sample backtest results
            results = []

            for strategy in strategies:
                strategy_name = f"{strategy.get('index_traded', 'UNKNOWN')}_{strategy.get('strategy', 'UNKNOWN')}"

                # Sample metrics (in real implementation, these would be calculated from actual backtest)
                metrics = {
                    "backteststartdate": str(start_date),
                    "backtestenddate": str(end_date),
                    "marginrequired": initial_capital * 0.2,
                    "nooftradingdays": 250,
                    "noofpositivetradingdays": 135,
                    "noofnegativetradingdays": 115,
                    "totalpnl": initial_capital * 0.15,
                    "averageprofit": initial_capital * 0.02,
                    "averageloss": -initial_capital * 0.015,
                    "maximumtradeprofit": initial_capital * 0.08,
                    "maximumtradeloss": -initial_capital * 0.05,
                    "mediantrade": initial_capital * 0.001,
                    "consecutivewins": 5.0,
                    "consecutivelosses": 3.0,
                    "winrate": 0.54,
                    "expectancy": 0.18,
                    "sharperatio": 1.25,
                    "sortinoratio": 1.85,
                    "calmar": 1.15,
                    "cagr": 0.18,
                    "maxdrawdown": -initial_capital * 0.12,
                    "maxdrawdownpercentage": -12.0,
                    "daystakentorecoverfromdrawdown": 22,
                    "profitfactor": 1.45,
                    "outlieradjustedprofitfactor": 1.22,
                    "strategy": strategy_name
                }

                results.append(metrics)

            # Combined metrics
            if len(results) > 1:
                combined_metrics = {
                    "backteststartdate": str(start_date),
                    "backtestenddate": str(end_date),
                    "marginrequired": sum(r["marginrequired"] for r in results),
                    "nooftradingdays": results[0]["nooftradingdays"],
                    "noofpositivetradingdays": max(r["noofpositivetradingdays"] for r in results),
                    "noofnegativetradingdays": max(r["noofnegativetradingdays"] for r in results),
                    "totalpnl": sum(r["totalpnl"] for r in results),
                    "averageprofit": sum(r["averageprofit"] for r in results) / len(results),
                    "averageloss": sum(r["averageloss"] for r in results) / len(results),
                    "maximumtradeprofit": max(r["maximumtradeprofit"] for r in results),
                    "maximumtradeloss": min(r["maximumtradeloss"] for r in results),
                    "mediantrade": sum(r["mediantrade"] for r in results) / len(results),
                    "consecutivewins": max(r["consecutivewins"] for r in results),
                    "consecutivelosses": max(r["consecutivelosses"] for r in results),
                    "winrate": sum(r["winrate"] for r in results) / len(results),
                    "expectancy": sum(r["expectancy"] for r in results) / len(results),
                    "sharperatio": sum(r["sharperatio"] for r in results) / len(results),
                    "sortinoratio": sum(r["sortinoratio"] for r in results) / len(results),
                    "calmar": sum(r["calmar"] for r in results) / len(results),
                    "cagr": sum(r["cagr"] for r in results) / len(results),
                    "maxdrawdown": sum(r["maxdrawdown"] for r in results),
                    "maxdrawdownpercentage": sum(r["maxdrawdownpercentage"] for r in results) / len(results),
                    "daystakentorecoverfromdrawdown": max(r["daystakentorecoverfromdrawdown"] for r in results),
                    "profitfactor": sum(r["profitfactor"] for r in results) / len(results),
                    "outlieradjustedprofitfactor": sum(r["outlieradjustedprofitfactor"] for r in results) / len(results),
                    "strategy": "combined"
                }
                results.append(combined_metrics)

            self.output_data["metrics"] = results

            # Generate sample trades
            trades = []
            current_date = datetime.strptime(str(start_date), "%y%m%d")
            end_date_obj = datetime.strptime(str(end_date), "%y%m%d")

            trade_id = 1
            while current_date <= end_date_obj:
                if current_date.weekday() < 5:  # Weekdays only
                    for strategy in strategies:
                        # Sample trade
                        trade = {
                            "trade_id": trade_id,
                            "date": current_date.strftime("%y%m%d"),
                            "time": "09:20",
                            "strategy": f"{strategy.get('index_traded', 'UNKNOWN')}_{strategy.get('strategy', 'UNKNOWN')}",
                            "symbol": strategy.get('index_traded', 'NIFTY'),
                            "action": strategy.get('strategy', 'BUY'),
                            "quantity": strategy.get('lot_size', 75),
                            "entry_price": 20000 + (trade_id % 1000),
                            "exit_price": 20050 + (trade_id % 800),
                            "pnl": (20050 + (trade_id % 800) - (20000 + (trade_id % 1000))) * strategy.get('lot_size', 75),
                            "charges": 100
                        }
                        trades.append(trade)
                        trade_id += 1

                current_date += timedelta(days=1)

            self.output_data["trades"] = trades

            # Calculate daily P&L
            daily_pnl = {}
            for trade in trades:
                date = trade["date"]
                if date not in daily_pnl:
                    daily_pnl[date] = 0
                daily_pnl[date] += trade["pnl"] - trade["charges"]

            daily_pnl_list = []
            cumulative_pnl = 0
            for date, pnl in sorted(daily_pnl.items()):
                cumulative_pnl += pnl
                daily_pnl_list.append({
                    "date": date,
                    "daily_pnl": pnl,
                    "cumulative_pnl": cumulative_pnl
                })

            self.output_data["daily_pnl"] = daily_pnl_list

            # Calculate overall statistics
            total_trades = len(trades)
            winning_trades = len([t for t in trades if t["pnl"] > 0])
            losing_trades = total_trades - winning_trades

            total_pnl = sum(t["pnl"] - t["charges"] for t in trades)
            total_charges = sum(t["charges"] for t in trades)

            self.output_data["statistics"] = {
                "total_trades": total_trades,
                "winning_trades": winning_trades,
                "losing_trades": losing_trades,
                "win_rate": winning_trades / total_trades if total_trades > 0 else 0,
                "total_pnl": total_pnl,
                "total_charges": total_charges,
                "net_pnl": total_pnl - total_charges,
                "average_trade_pnl": (total_pnl - total_charges) / total_trades if total_trades > 0 else 0,
                "max_profit": max([t["pnl"] - t["charges"] for t in trades]) if trades else 0,
                "max_loss": min([t["pnl"] - t["charges"] for t in trades]) if trades else 0,
                "backtest_start_date": str(start_date),
                "backtest_end_date": str(end_date),
                "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }

            return True

        except Exception as e:
            print(f"Error running backtest: {e}")
            return False

    def save_output(self):
        """Save backtest results to output JSON file"""
        try:
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(OUTPUT_JSON_PATH), exist_ok=True)

            with open(OUTPUT_JSON_PATH, 'w') as f:
                json.dump(self.output_data, f, indent=4)

            print(f"Saved output to: {OUTPUT_JSON_PATH}")
            return True
        except Exception as e:
            print(f"Error saving output: {e}")
            return False

# Flask endpoints
@app.route('/', methods=['GET'])
def serve_simple_test_page():
    """Serve the simple test interface for quick manual verification."""
    return send_from_directory(BASE_DIR, 'simple_test.html')


@app.route('/simple_test.html', methods=['GET'])
def serve_simple_test_alias():
    """Allow direct access to the simple test HTML by filename."""
    return send_from_directory(BASE_DIR, 'simple_test.html')


@app.route('/simple-backtest/run', methods=['POST'])
def run_simple_backtest():
    """Run simple backtest using JSON files"""
    try:
        service = SimpleBacktestService()

        # Load input parameters
        if not service.load_input_parameters():
            return jsonify({
                "success": False,
                "message": "Failed to load input parameters from JSON file"
            }), 400

        # Run backtest
        if not service.run_backtest():
            return jsonify({
                "success": False,
                "message": "Failed to run backtest"
            }), 500

        # Save output
        if not service.save_output():
            return jsonify({
                "success": False,
                "message": "Failed to save output results"
            }), 500

        return jsonify({
            "success": True,
            "message": "Backtest completed successfully",
            "input_file": INPUT_JSON_PATH,
            "output_file": OUTPUT_JSON_PATH,
            "statistics": service.output_data["statistics"]
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Error: {str(e)}"
        }), 500

@app.route('/simple-backtest/create-template', methods=['POST'])
def create_input_template():
    """Create input template JSON file"""
    try:
        service = SimpleBacktestService()

        if service.create_input_template():
            return jsonify({
                "success": True,
                "message": "Input template created successfully",
                "file_path": INPUT_JSON_PATH
            })
        else:
            return jsonify({
                "success": False,
                "message": "Failed to create input template"
            }), 500

    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Error: {str(e)}"
        }), 500

@app.route('/simple-backtest/results', methods=['GET'])
def get_backtest_results():
    """Get latest backtest results from output file"""
    try:
        if os.path.exists(OUTPUT_JSON_PATH):
            with open(OUTPUT_JSON_PATH, 'r') as f:
                results = json.load(f)

            return jsonify({
                "success": True,
                "data": results
            })
        else:
            return jsonify({
                "success": False,
                "message": "No results found. Run a backtest first."
            }), 404

    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Error reading results: {str(e)}"
        }), 500

@app.route('/simple-backtest/input', methods=['GET'])
def get_input_parameters():
    """Get current input parameters"""
    try:
        if os.path.exists(INPUT_JSON_PATH):
            with open(INPUT_JSON_PATH, 'r') as f:
                input_data = json.load(f)

            return jsonify({
                "success": True,
                "data": input_data
            })
        else:
            return jsonify({
                "success": False,
                "message": "No input file found. Create template first."
            }), 404

    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Error reading input file: {str(e)}"
        }), 500

@app.route('/simple-backtest/update-input', methods=['POST'])
def update_input_parameters():
    """Update input parameters"""
    try:
        new_params = request.json

        if not new_params:
            return jsonify({
                "success": False,
                "message": "No parameters provided"
            }), 400

        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(INPUT_JSON_PATH), exist_ok=True)

        with open(INPUT_JSON_PATH, 'w') as f:
            json.dump(new_params, f, indent=4)

        return jsonify({
            "success": True,
            "message": "Input parameters updated successfully",
            "file_path": INPUT_JSON_PATH
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Error updating parameters: {str(e)}"
        }), 500

@app.route('/simple-backtest/load-sample', methods=['POST'])
def load_sample_backtest():
    """Load and run sample backtest data"""
    try:
        service = SimpleBacktestService()

        # Load sample data
        if not service.load_sample_data():
            return jsonify({
                "success": False,
                "message": "Failed to load sample backtest data"
            }), 400

        # Run backtest
        if not service.run_backtest():
            return jsonify({
                "success": False,
                "message": "Failed to run sample backtest"
            }), 500

        # Save output
        if not service.save_output():
            return jsonify({
                "success": False,
                "message": "Failed to save sample backtest results"
            }), 500

        return jsonify({
            "success": True,
            "message": "Sample backtest completed successfully",
            "input_source": SAMPLE_INPUT_PATH,
            "output_file": OUTPUT_JSON_PATH,
            "statistics": service.output_data["statistics"]
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Error running sample backtest: {str(e)}"
        }), 500

@app.route('/simple-backtest/run-with-data', methods=['POST'])
def run_backtest_with_data():
    """Run backtest with provided data"""
    try:
        data = request.get_json()

        if not data:
            return jsonify({
                "success": False,
                "message": "No backtest data provided"
            }), 400

        service = SimpleBacktestService()
        service.input_data = data

        # Run backtest
        if not service.run_backtest():
            return jsonify({
                "success": False,
                "message": "Failed to run backtest with provided data"
            }), 500

        # Save output
        if not service.save_output():
            return jsonify({
                "success": False,
                "message": "Failed to save backtest results"
            }), 500

        return jsonify({
            "success": True,
            "message": "Backtest with provided data completed successfully",
            "output_file": OUTPUT_JSON_PATH,
            "statistics": service.output_data["statistics"]
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Error running backtest with data: {str(e)}"
        }), 500

if __name__ == "__main__":
    print("Starting Simple Backtest Service...")
    print(f"Input file: {INPUT_JSON_PATH}")
    print(f"Output file: {OUTPUT_JSON_PATH}")

    # Create input template if it doesn't exist
    if not os.path.exists(INPUT_JSON_PATH):
        print("Creating input template...")
        service = SimpleBacktestService()
        service.create_input_template()

    app.run(host="localhost", port=8012, debug=True)