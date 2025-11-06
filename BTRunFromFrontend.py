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

@app.route("/backtest", methods=['POST'])
def backtest():

    reqpara = request.json.get("parameters")
    if reqpara is None:
        return {"status": "error", "version": config.VERSION_NO['FRONTEND'], "message": "backtest parameters missing"}
    else:
        return getBtOutputJson(btParaToTest=reqpara)


if __name__ == "__main__":
    app.run(host="localhost", port=8009)