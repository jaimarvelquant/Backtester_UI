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

    btResultFileExcel = os.path.join(folderPath, f"FRONTENDTV {datetimealias}.xlsx")
    btResultFileJson = os.path.join(folderPath, f"FRONTENDTV {datetimealias}.json")

    try:

        Util.runNeccesaryFunctionsBeforeStartingBT()

        mainparadict = Util.getTVMainParametersFromFrontendTV(inputJson=btParaToTest)

        if not mainparadict['TvExitApplicable']:

            if mainparadict['DoRollover']:
                return {"status": "error", "version": config.VERSION_NO['FRONTENDTV'], "message": "Cann't run backtest when TvExitApplicable is no and DoRollover is yes."}

            elif not mainparadict['IntradaySqOffApplicable']:
                return {"status": "error", "version": config.VERSION_NO['FRONTENDTV'], "message": "Cann't run backtest when TvExitApplicable is no and IntradaySqOffApplicable is no."}
            
            elif mainparadict['ManualTradeEntryTime'] != 0:
                return {"status": "error", "version": config.VERSION_NO['FRONTENDTV'], "message": "Cann't run backtest when TvExitApplicable is no and ManualTradeEntryTime is given."}

        if mainparadict['DoRollover'] and mainparadict['IntradaySqOffApplicable']:
            return {"status": "error", "version": config.VERSION_NO['FRONTENDTV'], "message": "Cann't run backtest when both DoRollover and IntradaySqOffApplicable are yes. Please re-check parameters again."}
    
        if (mainparadict['FirstTradeEntryTime'] != 0) and (mainparadict['ManualTradeEntryTime'] != 0):
            return {"status": "error", "version": config.VERSION_NO['FRONTENDTV'], "message": "Cann't run backtest when both FirstTradeEntryTime & ManualTradeEntryTime is required."}
            
        __indexRunning = []

        for settingname in ['longportfoliosetting', 'shortportfoliosetting']:
            if not btParaToTest[settingname]:
                continue

            __indexRunning += [stgysetting['index'] for stgysetting in btParaToTest[settingname]['strategiessetting']]

        __indexRunning = set(__indexRunning)

        if mainparadict['DoRollover'] and (len(__indexRunning) != 1):
            return {"status": "error", "version": config.VERSION_NO['FRONTENDTV'], "message": f"Cann't run backtest when DoRollover is yes and multiple indice(s) are given i.e. {__indexRunning}."}
        
        tvSignalDict = Util.getTVIntraSignals(
            rolloverIndex=list(__indexRunning)[0] if mainparadict['DoRollover'] else "",  uPara=mainparadict, 
            signalDf=Util.getTVSignalsInDf(signalfilepath="", signals=btParaToTest['tvsignals'])
        )
        if len(tvSignalDict) == 0:
            return {"status": "error", "version": config.VERSION_NO['FRONTENDTV'], "message": "no tv signal found"}

        transactionDict = {}
        dailyMaxProfitLossDict = {"strategy_profits": {}, "strategy_losses": {}}

        for __signalType in tvSignalDict:
            for __signal in tvSignalDict[__signalType]:

                if ((__signalType == "LONG") and (not btParaToTest['longportfoliosetting'])) or ((__signalType == "SHORT") and (not btParaToTest['shortportfoliosetting'])):
                    continue

                portfolioForBt = {
                    1: Util.convertFrontendJsonToBtRequiredJson(inputJson=btParaToTest[f'{__signalType.lower()}portfoliosetting'], tvSignalInfoo=__signal)
                }

                for __pNo in portfolioForBt:

                    __btResp = Util.getBacktestResults(btPara=portfolioForBt[__pNo])
                    if (not __btResp) or (not __btResp['strategies']['orders']):
                        continue

                    if __signalType not in transactionDict:
                        transactionDict[__signalType] = {}

                    if __pNo not in transactionDict[__signalType]:
                        transactionDict[__signalType][__pNo] = []
                    
                    transactionDict[__signalType][__pNo] += __btResp['strategies']['orders']

                    for __tradingdate in __btResp['strategies']['strategy_profits']:
                        
                        if __tradingdate not in dailyMaxProfitLossDict['strategy_profits']:
                            dailyMaxProfitLossDict['strategy_profits'][__tradingdate] = {}
                        
                        if __tradingdate not in dailyMaxProfitLossDict['strategy_losses']:
                            dailyMaxProfitLossDict['strategy_losses'][__tradingdate] = {}

                        for __tradingtime in __btResp['strategies']['strategy_profits'][__tradingdate]:

                            if __tradingtime not in dailyMaxProfitLossDict['strategy_profits'][__tradingdate]:
                                dailyMaxProfitLossDict['strategy_profits'][__tradingdate][__tradingtime] = __btResp['strategies']['strategy_profits'][__tradingdate][__tradingtime]
                            else:
                                dailyMaxProfitLossDict['strategy_profits'][__tradingdate][__tradingtime] += __btResp['strategies']['strategy_profits'][__tradingdate][__tradingtime]
                            
                        for __tradingtime in __btResp['strategies']['strategy_losses'][__tradingdate]:
                            
                            if __tradingtime not in dailyMaxProfitLossDict['strategy_losses'][__tradingdate]:
                                dailyMaxProfitLossDict['strategy_losses'][__tradingdate][__tradingtime] = __btResp['strategies']['strategy_losses'][__tradingdate][__tradingtime]
                            else:
                                dailyMaxProfitLossDict['strategy_losses'][__tradingdate][__tradingtime] += __btResp['strategies']['strategy_losses'][__tradingdate][__tradingtime]

        portfolioPnLDf, finalStatsDf = pd.DataFrame(), pd.DataFrame()
        stgywiseTransactionDf, stgyDayWiseStats, stgyMonthWiseStats, stgyMarginPercentageWiseStats, marginReqByEachStgy = {"portfolio": pd.DataFrame()}, {}, {}, {}, {}
        
        for __signalType in transactionDict:
            for __pNoo in transactionDict[__signalType]:
                
                parsedOrderDf, stgyMarginn, __ = Util.parseBacktestingResponse(
                    btResponse={"orders": transactionDict[__signalType][__pNoo], "strategy_profits": {}, "strategy_losses": {}}, 
                    slippagePercent=portfolioForBt[__pNoo]['slippage_percent']
                )
                if parsedOrderDf.empty:
                    continue

                marginReqByEachStgy.update(stgyMarginn)

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
                    
            dailyMaxProfitLossDf = Util.convertTickPnlDictToDaywiseDf(toConvert=dailyMaxProfitLossDict)

            Util.prepareOutputJson(
                btResultFile=btResultFileJson, btStatsTableData=finalStatsDf, stgywiseTransactionDf=stgywiseTransactionDf, stgyDayWiseStats=stgyDayWiseStats, 
                stgyMonthWiseStats=stgyMonthWiseStats, stgyMarginPercentageWiseStats=stgyMarginPercentageWiseStats
            )
            
            Util.prepareOutputFile(
                btResultFile=btResultFileExcel, btStatsTableData=finalStatsDf, stgywiseTransactionDf=stgywiseTransactionDf, stgyDayWiseStats=stgyDayWiseStats, 
                stgyMonthWiseStats=stgyMonthWiseStats, stgyMarginPercentageWiseStats=stgyMarginPercentageWiseStats, onlyStgyResults=STRATEGYWISE_RESULTS, 
                excelFileExists=False, dailyMaxProfitLossDf=dailyMaxProfitLossDf
            )

            if os.path.exists(btResultFileJson):
                with open(btResultFileJson, "+r") as f:
                    dta = json.loads(f.read())

                return {"status": "success", "version": config.VERSION_NO['FRONTENDTV'], "data": dta}
    
    except Exception as errormsg:
        logging.error(traceback.format_exc())
        return {"status": "error", "version": config.VERSION_NO['FRONTENDTV'], "message": str(errormsg)}
    
    return {"status": "error", "version": config.VERSION_NO['FRONTENDTV'], "message": "no trade generated on given parameters."}

@app.route('/')
def mainPage():
    return 'Hello!'

# File paths for TradingView Backtest
TBS_LONG_PATH = r"C:\Users\Calin Jasper\Downloads\input json\input tbs long.json"
TBS_SHORT_PATH = r"C:\Users\Calin Jasper\Downloads\input json\input tbs short.json"
PORTFOLIO_SHORT_PATH = r"C:\Users\Calin Jasper\Downloads\input json\input portfolio short.json"
PORTFOLIO_LONG_PATH = r"C:\Users\Calin Jasper\Downloads\input json\input portfolio long.json"
INPUT_TV_PATH = r"C:\Users\Calin Jasper\Downloads\input json\input tv.json"
TRADINGVIEW_BACKTEST_PATH = r"C:\Users\Calin Jasper\Downloads\input json\tradingview backtest.json"

@app.route('/tradingview-backtest/run', methods=['POST'])
def run_tradingview_backtest():
    """Run TradingView backtest using JSON files"""
    try:
        # Load all TradingView input files
        files_data = {}
        file_paths = {
            "tbs_long": TBS_LONG_PATH,
            "tbs_short": TBS_SHORT_PATH,
            "portfolio_short": PORTFOLIO_SHORT_PATH,
            "portfolio_long": PORTFOLIO_LONG_PATH,
            "input_tv": INPUT_TV_PATH,
            "tradingview_backtest": TRADINGVIEW_BACKTEST_PATH
        }

        missing_files = []
        for file_name, file_path in file_paths.items():
            if os.path.exists(file_path):
                with open(file_path, 'r') as f:
                    files_data[file_name] = json.load(f)
            else:
                missing_files.append(f"{file_name}: {file_path}")

        if missing_files:
            return {
                "status": "error",
                "message": f"Missing input files: {', '.join(missing_files)}"
            }

        # Combine all parameters
        combined_params = {
            **files_data,
            "all_files_loaded": True
        }

        # Run backtest with combined parameters
        return getBtOutputJson(btParaToTest=combined_params)

    except Exception as e:
        logging.error(f"Error in run_tradingview_backtest: {str(e)}")
        return {"status": "error", "message": f"Error running TradingView backtest: {str(e)}"}

@app.route('/tradingview-backtest/input', methods=['GET'])
def get_tradingview_input():
    """Get current input parameters for TradingView backtest"""
    try:
        result = {}
        file_paths = {
            "tbs_long": TBS_LONG_PATH,
            "tbs_short": TBS_SHORT_PATH,
            "portfolio_short": PORTFOLIO_SHORT_PATH,
            "portfolio_long": PORTFOLIO_LONG_PATH,
            "input_tv": INPUT_TV_PATH,
            "tradingview_backtest": TRADINGVIEW_BACKTEST_PATH
        }

        for file_name, file_path in file_paths.items():
            if os.path.exists(file_path):
                with open(file_path, 'r') as f:
                    result[file_name] = json.load(f)
            else:
                result[file_name] = {"error": f"File not found: {file_path}"}

        return {"status": "success", "data": result}

    except Exception as e:
        return {"status": "error", "message": f"Error reading TradingView input files: {str(e)}"}

@app.route('/tradingview-backtest/update', methods=['POST'])
def update_tradingview_file():
    """Update specific TradingView input file"""
    try:
        data = request.json
        file_type = data.get('file_type')
        file_content = data.get('content')

        if not file_type or not file_content:
            return {"status": "error", "message": "file_type and content are required"}

        # Map file types to paths
        file_path_map = {
            "tbs_long": TBS_LONG_PATH,
            "tbs_short": TBS_SHORT_PATH,
            "portfolio_short": PORTFOLIO_SHORT_PATH,
            "portfolio_long": PORTFOLIO_LONG_PATH,
            "input_tv": INPUT_TV_PATH,
            "tradingview_backtest": TRADINGVIEW_BACKTEST_PATH
        }

        if file_type not in file_path_map:
            return {"status": "error", "message": f"Invalid file_type. Valid types: {', '.join(file_path_map.keys())}"}

        file_path = file_path_map[file_type]

        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(file_path), exist_ok=True)

        with open(file_path, 'w') as f:
            json.dump(file_content, f, indent=4)

        return {"status": "success", "message": f"{file_type} file updated successfully"}

    except Exception as e:
        return {"status": "error", "message": f"Error updating TradingView file: {str(e)}"}

@app.route("/backtest", methods=['POST'])
def backtest():

    reqpara = request.json.get("parameters")
    if reqpara is None:
        return {"status": "error", "version": config.VERSION_NO['FRONTENDTV'], "message": "backtest parameters missing"}
    else:
        return getBtOutputJson(btParaToTest=reqpara)

if __name__ == "__main__":
    app.run(host="localhost", port=8011)
