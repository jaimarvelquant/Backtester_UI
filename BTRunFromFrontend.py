############################################################################## importing libraries
from flask import Flask, request
from datetime import datetime
from Util import Util
import pandas as pd
import traceback
import logging
import config
import json
import os

pd.set_option('mode.chained_assignment', None)
STRATEGYWISE_RESULTS = True # if True, strategy wise transaction and result sheet will be generated

app = Flask(__name__)

def getBtOutputJson(btParaToTest: dict) -> dict:
    
    folderPath = "Trades"
    os.makedirs(folderPath, exist_ok=True)
    
    datetimealias = datetime.now().strftime("%d%m%Y %H%M%S.%f")

    btResultFileExcel = os.path.join(folderPath, f"FRONTEND {datetimealias}.xlsx")
    btResultFileJson = os.path.join(folderPath, f"FRONTEND {datetimealias}.json")

    try:

        btParaToTest = Util.convertFrontendJsonToBtRequiredJson(inputJson=btParaToTest)

        Util.runNeccesaryFunctionsBeforeStartingBT()

        with open("frontendbtpara.json", "+w") as ff:
            ff.write(json.dumps(btParaToTest, indent=4))
        
        btResp = Util.getBacktestResults(btPara=btParaToTest)
        if (len(btResp) == 0) or (len(btResp['strategies']['orders']) == 0):
            return {"status": "error", "version": config.VERSION_NO['FRONTEND'], "message": "no trade generated on given parameters."}

        parsedOrderDf, marginReqByEachStgy, maxProfitLossDf = Util.parseBacktestingResponse(btResponse=btResp['strategies'], slippagePercent=btParaToTest['slippage_percent'])
        if parsedOrderDf.empty:
            return {"status": "error", "version": config.VERSION_NO['FRONTEND'], "message": "no trade generated on given parameters."}

        portfolioPnLDf, finalStatsDf = pd.DataFrame(), pd.DataFrame()
        stgywiseTransactionDf, stgyDayWiseStats, stgyMonthWiseStats, stgyMarginPercentageWiseStats = {"portfolio": pd.DataFrame()}, {}, {}, {}

        parsedOrderDf = parsedOrderDf.sort_values(by=['entry_datetime'])
        parsedOrderDf = parsedOrderDf.reset_index(drop=True)

        for strategyName in sorted(parsedOrderDf['strategy'].unique()):

            strategyOrderDf = parsedOrderDf[parsedOrderDf['strategy'] == strategyName]

            stgyPnL = strategyOrderDf[['entry_datetime', 'netPnlAfterExpenses']].copy()
            stgyPnL['entry_datetime'] = stgyPnL['entry_datetime'].dt.date
            stgyPnL = stgyPnL.groupby(by=['entry_datetime'], as_index=False).sum()
            stgyPnL = stgyPnL.rename(columns={"entry_datetime": "entryDate", 'netPnlAfterExpenses': "bookedPnL"})

            portfolioPnLDf = pd.concat([stgyPnL, portfolioPnLDf])
            portfolioPnLDf = portfolioPnLDf.reset_index(drop=True)

            statsdf = Util.getBacktestStats(tradesDf=stgyPnL, initialCapital=marginReqByEachStgy.get(strategyName, 0))
            statsdf = pd.DataFrame.from_dict(statsdf, orient="index").reset_index().rename(columns={"index": "Particulars", 0: strategyName})

            if finalStatsDf.empty:
                finalStatsDf = statsdf.copy()
            else:
                finalStatsDf = pd.merge(left=finalStatsDf, right=statsdf, left_on="Particulars", right_on="Particulars")
            
            stgywiseTransactionDf[strategyName] = strategyOrderDf.copy()
            
            oldTrans = stgywiseTransactionDf['portfolio'].copy()
            oldTrans = pd.concat([oldTrans, strategyOrderDf])
            oldTrans = oldTrans.reset_index(drop=True)

            stgywiseTransactionDf['portfolio'] = oldTrans.copy()

            if STRATEGYWISE_RESULTS:
                stgyDayWiseStats[strategyName] = Util.getDayWiseStats(tradesDf=stgyPnL)
                stgyMonthWiseStats[strategyName] = Util.getMonthWiseStats(tradesDf=stgyPnL)

                marginn = marginReqByEachStgy.get(strategyName, 0)

                marginWiseDf = stgyPnL[["entryDate", "bookedPnL"]]
                if marginn != 0:
                    marginWiseDf['bookedPnL'] = marginWiseDf['bookedPnL'] / marginn
                    marginWiseDf['bookedPnL'] *= 100
                else:
                    marginWiseDf['bookedPnL'] = 0

                stgyMarginPercentageWiseStats[strategyName] = Util.getMonthWiseStats(tradesDf=marginWiseDf)

        ############################################################################################################################################ for portfolio stats
        if not portfolioPnLDf.empty:

            portfolioPnLDf = portfolioPnLDf.groupby(by=['entryDate'], as_index=False).sum()

            statsdf = Util.getBacktestStats(tradesDf=portfolioPnLDf, initialCapital=sum(list(marginReqByEachStgy.values())))
            statsdf = pd.DataFrame.from_dict(statsdf, orient="index").reset_index().rename(columns={"index": "Particulars", 0: "Combined"})

            portfolioPl = stgywiseTransactionDf['portfolio'][['entry_datetime', 'netPnlAfterExpenses']].copy()
            portfolioPl['entry_datetime'] = portfolioPl['entry_datetime'].dt.date
            portfolioPl = portfolioPl.groupby(by=['entry_datetime'], as_index=False).sum()
            portfolioPl = portfolioPl.rename(columns={"entry_datetime": "entryDate", 'netPnlAfterExpenses': "bookedPnL"})

            stgyDayWiseStats['portfolio'] = Util.getDayWiseStats(tradesDf=portfolioPl)
            stgyMonthWiseStats['portfolio'] = Util.getMonthWiseStats(tradesDf=portfolioPl)

            marginn = sum(list(marginReqByEachStgy.values()))
            marginWiseDf = portfolioPl[["entryDate", "bookedPnL"]]
            if marginn != 0:
                marginWiseDf['bookedPnL'] = marginWiseDf['bookedPnL'] / marginn
                marginWiseDf['bookedPnL'] *= 100
            else:
                marginWiseDf['bookedPnL'] = 0

            stgyMarginPercentageWiseStats['portfolio'] = Util.getMonthWiseStats(tradesDf=marginWiseDf)

        if not finalStatsDf.empty:

            finalStatsDf = pd.merge(left=statsdf, right=finalStatsDf, left_on="Particulars", right_on="Particulars")
            
            Util.prepareOutputJson(
                btResultFile=btResultFileJson, btStatsTableData=finalStatsDf, stgywiseTransactionDf=stgywiseTransactionDf, stgyDayWiseStats=stgyDayWiseStats, 
                stgyMonthWiseStats=stgyMonthWiseStats, stgyMarginPercentageWiseStats=stgyMarginPercentageWiseStats
            )
        
            Util.prepareOutputFile(
                btResultFile=btResultFileExcel, btStatsTableData=finalStatsDf, stgywiseTransactionDf=stgywiseTransactionDf, stgyDayWiseStats=stgyDayWiseStats, 
                stgyMonthWiseStats=stgyMonthWiseStats, stgyMarginPercentageWiseStats=stgyMarginPercentageWiseStats, onlyStgyResults=STRATEGYWISE_RESULTS, 
                excelFileExists=False, dailyMaxProfitLossDf=maxProfitLossDf
            )
        
        if os.path.exists(btResultFileJson):
            with open(btResultFileJson, "+r") as f:
                dta = json.loads(f.read())
            return {"status": "success", "version": config.VERSION_NO['FRONTEND'], "data": dta}
    
    except Exception as errormsg:
        logging.error(traceback.format_exc())
        return {"status": "error", "version": config.VERSION_NO['FRONTEND'], "message": str(errormsg)}
    
    return {"status": "error", "version": config.VERSION_NO['FRONTEND'], "message": "no trade generated on given parameters."}

@app.route('/')
def mainPage():
    return 'Hello!'

# File paths for Standard Backtest
SAMPLE_BACKTEST_PATH = r"C:\Users\Calin Jasper\Downloads\input json\sample backtest.json"
INPUT_PORTFOLIO_PATH = r"C:\Users\Calin Jasper\Downloads\input json\input portfolio.json"

@app.route('/standard-backtest/run', methods=['POST'])
def run_standard_backtest():
    """Run standard backtest using JSON files"""
    try:
        # Load backtest parameters from files
        sample_backtest = {}
        input_portfolio = {}

        # Load sample backtest file
        if os.path.exists(SAMPLE_BACKTEST_PATH):
            with open(SAMPLE_BACKTEST_PATH, 'r') as f:
                sample_backtest = json.load(f)
        else:
            return {"status": "error", "message": f"Sample backtest file not found: {SAMPLE_BACKTEST_PATH}"}

        # Load input portfolio file
        if os.path.exists(INPUT_PORTFOLIO_PATH):
            with open(INPUT_PORTFOLIO_PATH, 'r') as f:
                input_portfolio = json.load(f)
        else:
            return {"status": "error", "message": f"Input portfolio file not found: {INPUT_PORTFOLIO_PATH}"}

        # Combine parameters
        combined_params = {
            "sample_backtest": sample_backtest,
            "input_portfolio": input_portfolio
        }

        # Run backtest with combined parameters
        return getBtOutputJson(btParaToTest=combined_params)

    except Exception as e:
        logging.error(f"Error in run_standard_backtest: {str(e)}")
        return {"status": "error", "message": f"Error running backtest: {str(e)}"}

@app.route('/standard-backtest/input', methods=['GET'])
def get_standard_input():
    """Get current input parameters for standard backtest"""
    try:
        result = {}

        # Load sample backtest file
        if os.path.exists(SAMPLE_BACKTEST_PATH):
            with open(SAMPLE_BACKTEST_PATH, 'r') as f:
                result["sample_backtest"] = json.load(f)
        else:
            result["sample_backtest"] = {"error": f"File not found: {SAMPLE_BACKTEST_PATH}"}

        # Load input portfolio file
        if os.path.exists(INPUT_PORTFOLIO_PATH):
            with open(INPUT_PORTFOLIO_PATH, 'r') as f:
                result["input_portfolio"] = json.load(f)
        else:
            result["input_portfolio"] = {"error": f"File not found: {INPUT_PORTFOLIO_PATH}"}

        return {"status": "success", "data": result}

    except Exception as e:
        return {"status": "error", "message": f"Error reading input files: {str(e)}"}

@app.route('/standard-backtest/update-sample', methods=['POST'])
def update_sample_backtest():
    """Update sample backtest parameters"""
    try:
        new_params = request.json

        if not new_params:
            return {"status": "error", "message": "No parameters provided"}

        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(SAMPLE_BACKTEST_PATH), exist_ok=True)

        with open(SAMPLE_BACKTEST_PATH, 'w') as f:
            json.dump(new_params, f, indent=4)

        return {"status": "success", "message": "Sample backtest updated successfully"}

    except Exception as e:
        return {"status": "error", "message": f"Error updating sample backtest: {str(e)}"}

@app.route('/standard-backtest/update-portfolio', methods=['POST'])
def update_input_portfolio():
    """Update input portfolio parameters"""
    try:
        new_params = request.json

        if not new_params:
            return {"status": "error", "message": "No parameters provided"}

        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(INPUT_PORTFOLIO_PATH), exist_ok=True)

        with open(INPUT_PORTFOLIO_PATH, 'w') as f:
            json.dump(new_params, f, indent=4)

        return {"status": "success", "message": "Input portfolio updated successfully"}

    except Exception as e:
        return {"status": "error", "message": f"Error updating input portfolio: {str(e)}"}

@app.route("/backtest", methods=['POST'])
def backtest():

    reqpara = request.json.get("parameters")
    if reqpara is None:
        return {"status": "error", "version": config.VERSION_NO['FRONTEND'], "message": "backtest parameters missing"}
    else:
        return getBtOutputJson(btParaToTest=reqpara)


if __name__ == "__main__":
    app.run(host="localhost", port=8009)