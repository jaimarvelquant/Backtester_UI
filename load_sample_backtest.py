#!/usr/bin/env python3
"""
Load Sample Backtest Data into Main System
This script copies the sample backtest input data to the expected location
for the SimpleBacktestService to consume.
"""

import json
import os
import shutil
from datetime import datetime

def load_sample_data():
    """Load sample backtest data into the main system"""

    # Define file paths
    sample_file = "D:\\strategy\\btpara_sample.json"
    target_file = "D:\\Ajay\\BT Portfolio\\btpara.json"
    backup_file = "D:\\Ajay\\BT Portfolio\\btpara_backup.json"

    print("=" * 60)
    print("Loading Sample Backtest Data into Main System")
    print("=" * 60)

    try:
        # Check if sample file exists
        if not os.path.exists(sample_file):
            print(f"❌ Sample file not found: {sample_file}")
            return False

        # Create target directory if it doesn't exist
        target_dir = os.path.dirname(target_file)
        if not os.path.exists(target_dir):
            print(f"📁 Creating target directory: {target_dir}")
            os.makedirs(target_dir, exist_ok=True)

        # Backup existing file if it exists
        if os.path.exists(target_file):
            print(f"💾 Backing up existing file to: {backup_file}")
            shutil.copy2(target_file, backup_file)

        # Copy sample file to target location
        print(f"📋 Copying sample data to: {target_file}")
        shutil.copy2(sample_file, target_file)

        # Load and display sample data summary
        with open(sample_file, 'r') as f:
            data = json.load(f)

        portfolio = data.get("portfolio", {})
        strategies = portfolio.get("strategies", [])

        print("\n" + "=" * 40)
        print("📊 SAMPLE BACKTEST CONFIGURATION")
        print("=" * 40)
        print(f"📈 Portfolio Name: {portfolio.get('name', 'N/A')}")
        print(f"💰 Initial Capital: {portfolio.get('initial_capital', 0):,.0f}")
        print(f"📅 Start Date: {data.get('start_date', 'N/A')}")
        print(f"📅 End Date: {data.get('end_date', 'N/A')}")
        print(f"🎯 Stop Loss: {portfolio.get('stop_loss', {}).get('value', 0)}%")
        print(f"🏆 Take Profit: {portfolio.get('take_profit', {}).get('value', 0)}%")
        print(f"📊 Number of Strategies: {len(strategies)}")

        for i, strategy in enumerate(strategies, 1):
            print(f"\n🔄 Strategy {i}:")
            print(f"   - Index: {strategy.get('index_traded', 'N/A')}")
            print(f"   - Type: {strategy.get('strategy', 'N/A')}")
            print(f"   - Legs: {len(strategy.get('legs', []))}")

            # Show leg details
            for j, leg in enumerate(strategy.get('legs', []), 1):
                action = leg.get('action', 'N/A')
                instrument = leg.get('call_put', 'N/A')
                strike_type = leg.get('strike_selection', {}).get('type', 'N/A')
                print(f"     Leg {j}: {action} {instrument} ({strike_type})")

        print("\n" + "=" * 40)
        print("✅ Sample data loaded successfully!")
        print("=" * 40)
        print("🚀 You can now run the backtest using:")
        print("   1. Web Interface: http://localhost:5000/simple_test.html")
        print("   2. API Call: POST http://localhost:5000/simple-backtest/run")
        print("   3. Direct Service: POST http://localhost:8012/simple-backtest/run")

        return True

    except Exception as e:
        print(f"❌ Error loading sample data: {str(e)}")
        return False

def restore_original():
    """Restore the original backtest configuration from backup"""

    backup_file = "D:\\Ajay\\BT Portfolio\\btpara_backup.json"
    target_file = "D:\\Ajay\\BT Portfolio\\btpara.json"

    print("🔄 Restoring original configuration...")

    try:
        if os.path.exists(backup_file):
            shutil.copy2(backup_file, target_file)
            print("✅ Original configuration restored successfully!")
            return True
        else:
            print("❌ No backup file found to restore from.")
            return False
    except Exception as e:
        print(f"❌ Error restoring original configuration: {str(e)}")
        return False

def show_current_config():
    """Display current backtest configuration"""

    target_file = "D:\\Ajay\\BT Portfolio\\btpara.json"

    print("📋 Current Backtest Configuration:")
    print("-" * 40)

    try:
        if os.path.exists(target_file):
            with open(target_file, 'r') as f:
                data = json.load(f)

            portfolio = data.get("portfolio", {})
            strategies = portfolio.get("strategies", [])

            print(f"Portfolio: {portfolio.get('name', 'N/A')}")
            print(f"Capital: {portfolio.get('initial_capital', 0):,.0f}")
            print(f"Start Date: {data.get('start_date', 'N/A')}")
            print(f"End Date: {data.get('end_date', 'N/A')}")
            print(f"Strategies: {len(strategies)}")

        else:
            print("❌ No configuration file found.")

    except Exception as e:
        print(f"❌ Error reading configuration: {str(e)}")

if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1:
        command = sys.argv[1].lower()

        if command == "load":
            load_sample_data()
        elif command == "restore":
            restore_original()
        elif command == "show":
            show_current_config()
        else:
            print("Usage:")
            print("  python load_sample_backtest.py load     - Load sample data")
            print("  python load_sample_backtest.py restore  - Restore original")
            print("  python load_sample_backtest.py show     - Show current config")
    else:
        # Default action: load sample data
        load_sample_data()