############################################################################## importing libraries
from dateutil.relativedelta import relativedelta
from datetime import datetime, timedelta
from typing import Optional
import mysql.connector as mysql
import pandas as pd
import torch
import simplejson
import subprocess
import traceback
import warnings
import requests
import logging
import shutil
import config
import math
import time
import json
import os
import numpy as np
# from btrun.infrastructure import is_feature_enabled

LOG_FILE_PATH = os.path.join(config.LOG_FILE_FOLDER, datetime.now().strftime("%d%m%Y, %H%M%S")+".log")

os.makedirs(config.LOG_FILE_FOLDER, exist_ok=True)
logging.basicConfig(filename=LOG_FILE_PATH, format="%(asctime)s: [BTRUN] %(message)s", level=logging.DEBUG)

pd.set_option('mode.chained_assignment', None)
warnings.simplefilter('ignore')

# Configure PyTorch to use GPU if available
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
torch.set_default_device(device)

class Util:

    COLUMN_RENAME_MAPPING = {
        'leg_id': "ID", 'index_entry_price':'Index At Entry', 'index_exit_price':'Index At Exit', 'entry_date':"Entry Date", 'entry_time' : "Enter On", 
        'entry_day': "Entry Day", 'exit_date':"Exit Date", 'exit_time': "Exit On", 'exit_day':"Exit Day", 'symbol':"Index", 'expiry':"Expiry", 
        'strike':"Strike", 'instrument_type':"CE/PE", 'side':"Trade", 'filled_quantity':"Qty", 'entry_price':"Entry at", 'exit_price':"Exit at", 
        'pnl':"PNL", 'pnlAfterSlippage':"AfterSlippage", 'expenses':"Taxes", 'netPnlAfterExpenses':"Net PNL", 're_entry_no':"Re-entry No", 
        'reason':"Reason", 'max_profit':"MaxProfit", 'max_loss': "MaxLoss", "strategy_entry_number": "Strategy Entry No", "strategy": "Strategy Name",
        "stop_loss_entry_number": "SL Re-entry No", "take_profit_entry_number": "TGT Re-entry No", "points": "Points", "pointsAfterSlippage": 'Points After Slippage',
        "portfolio_name": "Portfolio Name",
        # Additional annotations for TV flow
        "original_tv_entry": "Original TV Entry",
        "original_tv_exit": "Original TV Exit"
    }
    COLUMN_ORDER = [
        'portfolio_name', 'strategy', 'leg_id', 'entry_date', 'entry_time', 'original_tv_entry', 'entry_day', 'exit_date', 'exit_time', 'original_tv_exit', 'exit_day', 'symbol', 'expiry', 'strike', 
        'instrument_type', 'side', 'filled_quantity', 'entry_price', 'exit_price', 'points', 'pointsAfterSlippage', 'pnl', 'pnlAfterSlippage', 'expenses', 
        'netPnlAfterExpenses', 're_entry_no', 'stop_loss_entry_number', 'take_profit_entry_number', 'reason', 'strategy_entry_number', 'index_entry_price', 
        'index_exit_price', 'max_profit', 'max_loss'
    ]
    EXPIRY_ALIAS = {
        "CURRENT": "WEEKLY", "NEXT": "NEXT_WEEKLY", "MONTHLY": "MONTHLY"
    }
    RE_ENTRY_ALIAS = {
        "INSTANT SAME STRIKE": "IMMIDIATE", "ORIGINAL": "AS_ORIGINAL", "COST": "RE_COST", "INSTANT NEW STRIKE": "IMMIDIATE_NC"
    }
    TGT_SL_ALIAS = {
        "POINT": "POINT", "POINTS": "POINT", "PERCENT": "PERCENTAGE", "PERCENTAGE": "PERCENTAGE", "INDEX POINT": "INDEX_POINTS", 
        "INDEX PERCENTAGE": "INDEX_PERCENTAGE", "ABSOLUTE": "PREMIUM", "DELTA": "ABSOLUTE_DELTA"
    }
    UNDERLYING_ALIAS = {
        "SPOT": "CASH", "FUTURE": "FUTURE"
    }
    STGY_STR_PARA_COLUMN_NAME_UPPER = [
        "StrategyName", "Index", "TgtTrackingFrom", "TgtRegisterPriceFrom", "SlTrackingFrom", "SlRegisterPriceFrom", "PnLCalculationFrom", 
        "ConsiderHedgePnLForStgyPnL", "CheckPremiumDiffCondition", "PremiumDiffType", "PremiumDiffChangeStrike", "PremiumDiffDoForceEntry", 
        "PremiumDiffForceEntryConsiderPremium", "Underlying", "Tradertype", "MoveSlToCost", "ChangeStrikeForIndicatorBasedReEntry", 
        "OnExpiryDayTradeNextExpiry", "ConsiderVwapForEntry", "ConsiderVwapForExit", "ConsiderEMAForEntry", "ConsiderEMAForExit", "ConsiderSTForEntry", 
        "ConsiderSTForExit", "ConsiderRSIForEntry", "ConsiderRSIForExit", "ConsiderVolSmaForEntry", "ConsiderVolSmaForExit", "StrategyType"
    ]
    STGY_STR_PARA_COLUMN_NAME_LOWER = [
        "EntryCombination", 'ExitCombination', "VwapEntryCondition", "VwapExitCondition", "EmaEntryCondition", "EmaExitCondition", "StEntryCondition",
        "StExitCondition", "RsiEntryCondition", "RsiExitCondition", "VolSmaEntryCondition", "VolSmaExitCondition", "StrategyTrailingType"
    ]
    LEG_IDS_COLUMN_NAME = [
        'LegID', 'OnEntry_OpenTradeOn', 'OnEntry_SqOffTradeOff', 'OnExit_OpenTradeOn', 'OnExit_SqOffTradeOff', 
    ]
    LEG_STR_PARA_COLUMN_NAME = [
        'StrategyName', 'Instrument', 'Transaction', 'W&Type', 'StrikeMethod', 'MatchPremium', 'SLType', 'TGTType', 'TrailSLType', 'Expiry', 'SL_ReEntryType', 
        'TGT_ReEntryType', 'OpenHedge', 'HedgeStrikeMethod', 'IsIdle', 'OnEntry_SqOffAllLegs', 'OnExit_SqOffAllLegs', 'ReEntryType', 'TrailW&T', 'OnExit_OpenAllLegs'
    ]
    MARGIN_REQ_HEADERS = {
        "authority": "margin-calc-arom-prod.angelbroking.com", "origin": "https://www.angelone.in", "referer": "https://www.angelone.in/",
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15", 
        "content-type": "application/json", "path": "/margin-calculator/SPAN"
    }
    VALID_BT_TYPE_FOR_USER = [
        "TBS", "ORB", "VWAP", "HEIKIN_RSI_EMA", "HEIKIN_RSI_ST", "5_EMA", "OI", "INDICATOR"
    ]
    USER_BT_TYPE_ENGINE_MAPPING = {
        "TBS": "Tbs", "ORB": "Orb", "VWAP": "Vwap", "HEIKIN_RSI_EMA": "Heikin", "HEIKIN_RSI_ST": "Heikin", "5_EMA": "five_ema", "INDICATOR": "INDICATOR", 
        "OI": "Tbs"
    }
    FIELDS_TO_MULTIPLY_BY_PORTFOLIO_MULTIPLIER = {
        "GeneralParameter": ["StrategyProfit", "StrategyLoss", "ProfitReaches", "LockMinProfitAt", "IncreaseInProfit", "TrailMinProfitBy"],
        "LegParameter": ["Lots"]
    }
    MCX_SYMBOLS = [
        'COPPER', 'CRUDEOIL', 'CRUDEOILM', 'GOLD', 'GOLDM', 'NATGASMINI', 'NATURALGAS', 'NICKEL', 'SILVER', 'SILVERM', 'ZINC'
    ]
    US_SYMBOLS = [
        "QQQ", "SPX", "SPY"
    ]
    NON_MCX_SYMBOLS = [
        "NIFTY", "BANKNIFTY", "FINNIFTY", "MIDCPNIFTY", "SENSEX", "BANKEX"
    ]

    MARGIN_SYMBOL_INFO_FILE_PATH = "marginSymbolInfo.json"
    MARGIN_INFO = {}

    LOTSIZE_FILE_PATH = "LOTSIZE.csv"

    BT_FIELDS = {
        'VwapExitCondition', 'TgtTrackingFrom', 'StartTime', 'OnExpiryDayTradeNextExpiry', 'EntryCombination', 'ConsiderVolSmaForEntry', 'Expiry', 
        'ConsiderSTForExit', 'EmaEntryCondition', 'TGT_ReEntryNo', 'LockMinProfitAt', 'StrategyLossReExecuteNo', 'StrikeSelectionTime', 
        'HedgeStrikePremiumCondition', 'StrikeMethod', 'MatchPremium', 'StrategyTrailingType', 'Timeframe', 'SL_TrailBy', 'ConsiderHedgePnLForStgyPnL', 
        'OrbRangeEnd', 'StrategyID', 'Underlying', 'PortfolioTarget', 'EndTime', 'RsiExitCondition', 'LegID', 'TGTValue', 'Tradertype', 'Index', 
        'PortfolioTrailingType', 'PnLCalculationFrom', 'PortfolioID', 'EndDate', 'StrategyName', 'StrategiesSetting', 'LastEntryTime', 'HedgeStrikeValue', 
        'STPeriod', 'VolSmaEntryCondition', 'SLType', 'ConsiderEMAForEntry', 'Instrument', 'Transaction', 'ChangeStrikeForIndicatorBasedReEntry', 
        'TrailMinProfitBy', 'ConsiderVwapForEntry', 'SL_ReEntryType', 'StoplossCheckingInterval', 'StrategyType', 'EMAPeriod', 'LegsSettings', 'SlTrackingFrom', 
        'OrbRangeStart', 'SL_TrailAt', 'PortfolioStoploss', 'ConsiderRSIForEntry', 'ProfitReaches', 'TGTType', 'Lots', 'ConsiderSTForEntry', 'DTE', 
        'StrategyProfitReExecuteNo', 'StartDate', 'TrailSLType', 'SL_ReEntryNo', 'IndicatorBasedReEntry', 'TgtRegisterPriceFrom', 'ExitCombination', 
        'PortfolioName', 'StrikePremiumCondition', 'ConsiderVwapForExit', 'STMultiplier', 'SLValue', 'IncreaseInProfit', 'SlRegisterPriceFrom', 
        'ReEntryCheckingInterval', 'EmaExitCondition', 'Weekdays', 'StrategyLoss', 'StrikeValue', 'TradeStrikeValue', 'ConsiderVolSmaForExit', 
        'TargetCheckingInterval', 'RsiPeriod', 'VolSMAPeriod', 'StrategyProfit', 'StEntryCondition', 'TGT_ReEntryType', 'W&Type', 'MoveSlToCost', 
        'ConsiderEMAForExit', 'HedgeStrikeMethod', 'VwapEntryCondition', 'RsiEntryCondition', 'VolSmaExitCondition', 'W&TValue', 'OpenHedge', 'StExitCondition', 
        'ConsiderRSIForExit', 'IsIdle', 'ReEnteriesCount', 'OnEntry_SqOffAllLegs', 'OnExit_SqOffAllLegs', 'isTickBt', 'TrailW&T', 'PnLCalTime', 'LockPercent', 
        'TrailPercent', 'SqOff1Time', 'SqOff1Percent', 'SqOff2Time', 'SqOff2Percent', 'MaxOpenPositions', 'OiThreshold', 'OnExit_OpenAllLegs'
    }
    BT_FIELDS = {__i.lower(): __i for __i in BT_FIELDS}

    METRICS_KEY_NAME = {
        'Backtest Start Date': 'backteststartdate', 'Backtest End Date': 'backtestenddate', 'Margin Required': 'marginrequired', 
        'Number of Trading Days': 'nooftradingdays', 'Number of +ve days': 'noofpositivetradingdays', 'Number of -ve days': 'noofnegativetradingdays', 
        'Total PnL': 'totalpnl', 'Average Profit': 'averageprofit', 'Average Loss': 'averageloss', 'Maximum Trade Profit': 'maximumtradeprofit', 
        'Maximum Trade Loss': 'maximumtradeloss', 'Median Trade': 'mediantrade', 'Consecutive Wins': 'consecutivewins', 
        'Consecutive Losses': 'consecutivelosses', 'Win Rate': 'winrate', 'Expectancy': 'expectancy', 'Sharpe Ratio': 'sharperatio', 
        'Sortino Ratio': 'sortinoratio', 'Calmar': 'calmar', 'CAGR': 'cagr', 'Max Drawdown': 'maxdrawdown', 'Max Drawdown Percent': 'maxdrawdownpercentage', 
        'Days Taken to Recover From Drawdown': 'daystakentorecoverfromdrawdown', 'Profit Factor (Amount of Profit per unit of Loss)': 'profitfactor', 
        'Outlier Adjusted Profit Factor': 'outlieradjustedprofitfactor'
    }
    
    @staticmethod
    def runNeccesaryFunctionsBeforeStartingBT():
        
        Util.populateSymbolInfoForMargin()
        Util.populateLotSize()
    
    @staticmethod
    def to_tensor(data):
        """Convert numpy arrays or pandas objects to PyTorch tensors on GPU if available."""
        if isinstance(data, pd.DataFrame):
            return torch.tensor(data.values, dtype=torch.float32, device=device)
        elif isinstance(data, pd.Series):
            return torch.tensor(data.values, dtype=torch.float32, device=device)
        elif isinstance(data, np.ndarray):
            return torch.tensor(data, dtype=torch.float32, device=device)
        elif isinstance(data, (int, float)):
            return torch.tensor([data], dtype=torch.float32, device=device)
        elif isinstance(data, list):
            return torch.tensor(data, dtype=torch.float32, device=device)
        elif isinstance(data, torch.Tensor):
            return data.to(device)
        else:
            raise TypeError(f"Unsupported data type for tensor conversion: {type(data)}")
    
    @staticmethod
    def from_tensor(tensor):
        """Convert PyTorch tensor back to numpy array."""
        if isinstance(tensor, torch.Tensor):
            return tensor.cpu().numpy()
        return tensor
    
    @staticmethod
    def populateLotSize() -> None:

        if not os.path.exists(Util.LOTSIZE_FILE_PATH):
            logging.error(f"Unable to get lot size file path. File path: {Util.LOTSIZE_FILE_PATH}")
            raise ValueError(f"Unable to get lot size file path. File path: {Util.LOTSIZE_FILE_PATH}")
        
        lotsizedf = pd.read_csv(Util.LOTSIZE_FILE_PATH)
        if lotsizedf.empty:
            logging.error("Empty file content from lot size file path.")
            raise ValueError("Empty file content from lot size file path.")
        
        lotsizedf = lotsizedf[~pd.isnull(lotsizedf['underlyingname'])]
        if lotsizedf.empty:
            logging.error("Empty file content from lot size file path.")
            raise ValueError("Empty file content from lot size file path.")
        
        lotsizedf['underlyingname'] = lotsizedf['underlyingname'].str.upper()
        config.LOT_SIZE = lotsizedf.set_index("underlyingname").to_dict()["lotsize"]
    
    @staticmethod
    def getTVMainParametersFromFrontendTV(inputJson: dict) -> dict:

        return {
            "StartDate": datetime.strptime(str(int(inputJson['startdate'])), "%y%m%d").strftime('%d_%m_%Y'), 
            "EndDate": datetime.strptime(str(int(inputJson['enddate'])), "%y%m%d").strftime('%d_%m_%Y'),  
            "Name": inputJson['name'], "SignalDateFormat": inputJson['signaldatetimeformat'], "ManualTradeEntryTime": inputJson['manualtradeentrytime'],
            "ManualTradeLots": inputJson["manualtradelots"],
            "FirstTradeEntryTime": inputJson['firsttradeentrytime'], "TvExitApplicable": inputJson['tvexitapplicable'].upper() == "YES", 
            "IncreaseEntrySignalTimeBy": inputJson['increaseentrysignaltimeby'], "IncreaseExitSignalTimeBy": inputJson['increaseexitsignaltimeby'], 
            "IntradaySqOffApplicable": inputJson['intradaysqoffapplicable'].upper() == "YES", "IntradayExitTime": inputJson['intradayexittime'], 
            "ExpiryDayExitTime": inputJson['expirydayexittime'], "DoRollover": inputJson['dorollover'].upper() == "YES", "RolloverTime": ['rollovertime']
        }
    
    @staticmethod
    def copyFilesIntoMergeFolder(filePath: list) -> None:
        
        mergeFolder = os.path.join(os.getcwd(), "merge")
        if not os.path.exists(mergeFolder):
            logging.info(f"Unable to get merge folder, folder path: {mergeFolder}")
            return
        
        pyOutputFolder = os.path.join(mergeFolder, "py_output")
        if not os.path.exists(pyOutputFolder):
            logging.info(f"Unable to get py_output folder, folder path: {pyOutputFolder}")
            return
        
        shutil.rmtree(pyOutputFolder)
        os.mkdir(pyOutputFolder)

        [shutil.copy(filetocopy, os.path.join(pyOutputFolder, os.path.basename(filetocopy))) for filetocopy in filePath]

        os.chdir(mergeFolder)
        subprocess.run(os.path.join(mergeFolder, "run_me.bat"))

    @staticmethod
    def getDateInfoForRollver(indexTraded: str) -> dict:

        for __delay in range(1,6):

            try:
        
                mydb = mysql.connect(host="106.51.63.60", user="mahesh", password="mahesh_123", database="historicaldb")
                cursorObj = mydb.cursor()

                cursorObj.execute(f"select * from {indexTraded.lower()}_expiry")

                expiryDict = cursorObj.fetchall()
                expiryDict = {expiryEntry[0]: [expDate for expDate in expiryEntry[1:] if expDate is not None] for expiryEntry in expiryDict}

                return {"expirys": expiryDict, "tradingdates": sorted(expiryDict.keys())}
            
            except Exception:
                logging.error(traceback.format_exc())
                time.sleep(__delay)
        
        return {}

    @staticmethod
    def writeParametersToTvOutputFile(tvMainPara: dict, mainParaColumnName: list, outputExcelFilePath: str, tvSignalsDf: pd.DataFrame) -> dict:

        toReturn, settingToDump = {}, {}
        
        tvmainparadf = pd.DataFrame(tvMainPara).transpose()
        settingToDump['tvsetting'] = tvmainparadf.copy()
        
        del tvmainparadf

        if tvMainPara['LongPortfolioFilePath'] != "":
            settingToDump["long"] = Util.getPortfolioJson(excelFilePath=tvMainPara['LongPortfolioFilePath'])[1]
        
        if tvMainPara['ShortPortfolioFilePath'] != "":
            settingToDump["short"] = Util.getPortfolioJson(excelFilePath=tvMainPara['ShortPortfolioFilePath'])[1]
        
        if tvMainPara['ManualPortfolioFilePath'] != "":
            settingToDump["manual"] = Util.getPortfolioJson(excelFilePath=tvMainPara['ManualPortfolioFilePath'])[1]

        excelObjj = pd.ExcelWriter(outputExcelFilePath, engine='openpyxl', mode="w")
        with excelObjj as writer:
            settingToDump['tvsetting'].to_excel(writer, sheet_name="Tv Setting", index=False)
            tvSignalsDf.to_excel(writer, sheet_name="Tv Signals", index=False)

            for porttype in ["long", "short", "manual"]:
                if porttype not in settingToDump:
                    continue

                toReturn[porttype] = {}

                for shtName in ["PortfolioParameter", "GeneralParameter", "LegParameter"]:
                    
                    toDump = pd.DataFrame()
                    for keyy in settingToDump[porttype]:
                        
                        if shtName not in settingToDump[porttype][keyy]:
                            continue

                        toDump = pd.concat([toDump, settingToDump[porttype][keyy][shtName]])
                        toDump = toDump.reset_index(drop=True)
                    
                    if toDump.empty:
                        continue

                    if shtName == "GeneralParameter":
                        toReturn[porttype].update({"index": sorted(toDump['Index'].str.lower().unique())})

                    toDump.to_excel(writer, sheet_name=f"{porttype.title()}{shtName}", index=False)
        
        del settingToDump

        return toReturn

    @staticmethod
    def reFormatFrontendDict(input_dict: dict) -> dict:
        
        result = {}
        for key, value in input_dict.items():

            formatted_key = Util.BT_FIELDS.get(key.lower())
            if formatted_key is None:
                continue

            if isinstance(value, dict):
                result[formatted_key] = Util.reFormatFrontendDict(value)
            elif isinstance(value, list):
                result[formatted_key] = Util.reFormatFrontendList(value)
            elif value is not None:
                result[formatted_key] = value

        return result

    @staticmethod
    def reFormatFrontendList(input_list: list) -> list:

        result = []
        for item in input_list:

            if isinstance(item, dict):
                result.append(Util.reFormatFrontendDict(item))
            elif isinstance(item, list):
                result.append(Util.reFormatFrontendList(item))
        
        return result

    @staticmethod
    def reFormatFrontendJson(jsonToFormat: dict) -> dict:
        
        result = {}
        for key, value in jsonToFormat.items():

            formatted_key = Util.BT_FIELDS.get(key.lower())
            if formatted_key is None:
                continue

            if isinstance(value, dict):
                result[formatted_key] = Util.reFormatFrontendDict(value)
            elif isinstance(value, list):
                result[formatted_key] = Util.reFormatFrontendList(value)
            elif value is not None:
                result[formatted_key] = value

        return result
    
    @staticmethod
    def getFormattedId(userInputtedId: str) -> str:

        if pd.isnull(userInputtedId):
            return ""
        
        try:
            return str(int(userInputtedId))
        except Exception:
            return str(userInputtedId) 
    
    @staticmethod
    def convertFrontendJsonToBtRequiredJson(inputJson: dict, tvSignalInfoo: dict={}) -> dict:

        inputJson = Util.reFormatFrontendJson(jsonToFormat=inputJson)
        isTickBt = inputJson['isTickBt']
        checkfreq = 1 if isTickBt else 60
        isTvBasedPortfolio = len(tvSignalInfoo) != 0

        stgysJson = []
        for stgySetting in inputJson['StrategiesSetting']:

            for __col in stgySetting: # formating frontend input

                if __col in ['StartTime', 'StrikeSelectionTime', 'EndTime', 'LastEntryTime']:
                    stgySetting[__col] = f"{stgySetting[__col]}00"
                
                if isTvBasedPortfolio and (__col in ['StrikeSelectionTime', 'StartTime', 'LastEntryTime', 'EndTime']):
                    stgySetting[__col] = tvSignalInfoo['entrytime'] if __col in ['StrikeSelectionTime', 'StartTime'] else tvSignalInfoo['exittime']
            
                if __col in Util.STGY_STR_PARA_COLUMN_NAME_LOWER:
                    stgySetting[__col] = stgySetting[__col].lower()
                
                if __col in Util.STGY_STR_PARA_COLUMN_NAME_UPPER:
                    stgySetting[__col] = stgySetting[__col].upper()
                    
            stgySetting.update({
                "evaluator": Util.USER_BT_TYPE_ENGINE_MAPPING[stgySetting['StrategyType']], 
                "ExpiryDayExitTime": tvSignalInfoo['ExpiryDayExitTime'] if isTvBasedPortfolio else stgySetting['EndTime'], "isTickBt": isTickBt
            })

            parsedLegInfo, validLegIds = [], []

            for __legPara in stgySetting['LegsSettings']:

                for __col in __legPara:
                    if __col in Util.LEG_STR_PARA_COLUMN_NAME:
                        __legPara[__col] = str(__legPara[__col]).upper()
                    elif __col in Util.LEG_IDS_COLUMN_NAME:
                        __legPara[__col] = Util.getFormattedId(userInputtedId=__col)
                    
                    if __col == "LegID":
                        validLegIds.append(__legPara[__col])
                    elif isTvBasedPortfolio and (__col == "Lots"):
                        __legPara[__col] = tvSignalInfoo['lots']
            
            for __legPara in stgySetting['LegsSettings']:

                legparaaa = Util.getBackendLegJson(isTickBt=isTickBt, frontendLegParameters=__legPara.copy(), frontendStgyParameters=stgySetting.copy(), isRolloverTrade=False, validLegIds=validLegIds)
                if len(legparaaa) == 0:
                    continue

                parsedLegInfo.append(legparaaa)
            
            if len(parsedLegInfo) == 0:
                continue

            stgyJsonToAdd = Util.getBackendStrategyJson(isTickBt=isTickBt, frontendStgyParameters=stgySetting.copy(), parsedLegInfo=parsedLegInfo)
            if not stgyJsonToAdd:
                continue

            if isTvBasedPortfolio:
                stgyJsonToAdd.update({"entry_date": tvSignalInfoo['entrydate'], "exit_date": tvSignalInfoo['exitdate']})
                # Pass signal entry price for DB Entry functionality if available
                if 'entry_price' in tvSignalInfoo:
                    stgyJsonToAdd.update({"signal_entry_price": tvSignalInfoo['entry_price']})
                # Pass signal exit price for DB Exit functionality if available
                if 'exit_price' in tvSignalInfoo:
                    stgyJsonToAdd.update({"signal_exit_price": tvSignalInfoo['exit_price']})

            stgysJson.append(stgyJsonToAdd)
        
        if len(stgysJson) == 0:
            return {}
        
        indicesForStgyJson = set([__settingDict['index'].split(".")[-1] for __settingDict in stgysJson])
        
        isMcxSymbol = any([ss in Util.MCX_SYMBOLS for ss in indicesForStgyJson])
        isNonMcxSymbol = any([ss in Util.NON_MCX_SYMBOLS for ss in indicesForStgyJson])
        isUsSymbol = any([ss in Util.US_SYMBOLS for ss in indicesForStgyJson])
        
        if sum([isMcxSymbol, isNonMcxSymbol, isUsSymbol]) > 1:
            logging.info("Please run either US or MCX or NSE&BSE indices.")
            return {}
        
        if isUsSymbol:
            exchange = "EXCHANGE.US"
        elif isMcxSymbol:
            exchange = "EXCHANGE.MCX"
        else:
            exchange = "EXCHANGE.NSE"
        
        toReturn = {
            "istickbt": isTickBt,
            "slippage_percent": 0.0,
            "start_date": tvSignalInfoo['entrydate'] if isTvBasedPortfolio else inputJson['StartDate'],
            "end_date": tvSignalInfoo['exitdate'] if isTvBasedPortfolio else inputJson['EndDate'],
            "broker_details": {"broker": "BROKER.PAPER"},
            "exchange": exchange,
            "order_type": "ORDERTYPE.MARKET",
            "product_type": "PRODUCTTYPE.NRML",
            "fix_vix": config.FIXED_VALUE_FOR_DYNAMIC_FACTOR.get("vix", 0), 
            "check_interval": checkfreq, 
            "feed_source": "FEEDSOURCE.HISTORICAL",
            "portfolio": {
                "id": inputJson['PortfolioID'],
                "name": inputJson['PortfolioName'],
                "stop_loss": {
                    "type": "NUMBERTYPE.POINT", 
                    "value": float(inputJson["PortfolioStoploss"])*-1, 
                    "params": {
                        "check_frequency": checkfreq
                    }
                },
                "take_profit": {
                    "type": "NUMBERTYPE.POINT", 
                    "value": float(inputJson["PortfolioTarget"]), 
                    "params": {
                        "check_frequency": checkfreq
                    }
                },
                "trailing_stop_loss": {
                    "profit_move": {
                        "type": "NUMBERTYPE.POINT","value": 0
                    }, 
                    "stop_loss_move": {
                        "type": "NUMBERTYPE.POINT", "value": 0
                    }
                },
                "lock_and_trail": {
                    "Type": "LOCKTYPE.REGULAR", "lock": 0, "trail": 0
                },
                "strategies": stgysJson
            }
        }

        if inputJson['PortfolioTrailingType'].lower() == 'trail profits':
            toReturn['portfolio'].update({
                "trailing_stop_loss": {
                    "profit_move": {
                        "type": "NUMBERTYPE.POINT", "value": float(inputJson['IncreaseInProfit'])
                    },
                    "stop_loss_move": {
                        "type": "NUMBERTYPE.POINT", "value": float(inputJson['TrailMinProfitBy'])
                    }
                },
                "lock_and_trail": {
                    "Type": "LOCKTYPE.REGULAR", "lock": float(inputJson['IncreaseInProfit']), "trail": float(inputJson['TrailMinProfitBy'])
                }
            })

        elif inputJson['PortfolioTrailingType'].lower() == 'lock minimum profit':
            toReturn['portfolio'].update({
                "lock_and_trail": {
                    "Type": "LOCKTYPE.REGULAR", "lock": float(inputJson['ProfitReaches']), "trail": float(inputJson['LockMinProfitAt'])
                }
            })

        elif inputJson['PortfolioTrailingType'].lower() == 'lock & trail profits':
            toReturn['portfolio'].update({
                "trailing_stop_loss": {
                    "profit_move": {
                        "type": "NUMBERTYPE.POINT","value": float(inputJson['IncreaseInProfit'])
                    },
                    "stop_loss_move": {
                        "type": "NUMBERTYPE.POINT", "value": float(inputJson['TrailMinProfitBy'])
                    }
                },
                "lock_and_trail": {
                    "Type": "LOCKTYPE.REGULAR", "lock": float(inputJson['ProfitReaches']), "trail": float(inputJson['LockMinProfitAt'])
                }
            })
        
        elif inputJson['PortfolioTrailingType'].lower() == 'portfolio lock trail':
            toReturn['portfolio'].update({
                "lock_and_trail": {
                    "Type": "LOCKTYPE.MAX_TILL_TIME", "lock_time": Util.getSeconds(timesting=inputJson["PnLCalTime"]), 
                    "lock": float(inputJson['LockPercent']), "trail": float(inputJson['TrailPercent'])
                }
            })
        
        elif inputJson['PortfolioTrailingType'].lower() == 'max possible profit':
            toReturn['portfolio'].update({
                "lock_and_trail": {
                    "Type": "LOCKTYPE.MAX_POSSIBLE_PROFIT", "lock_time": Util.getSeconds(timesting=inputJson["PnLCalTime"]), 
                    "lock": 0, "next_check_time": Util.getSeconds(timesting=inputJson["SqOff1Time"]), "trail": float(inputJson['SqOff1Percent']),
                    "final_trail_time": Util.getSeconds(timesting=inputJson["SqOff2Time"]), "final_trail": float(inputJson['SqOff2Percent'])
                }
            })
        
        return toReturn

    @staticmethod
    def populateSymbolInfoForMargin() -> dict:

        if not os.path.exists(Util.MARGIN_SYMBOL_INFO_FILE_PATH):
            fetchLatest = True
        else:
            fetchLatest = (datetime.strptime(time.ctime(os.path.getmtime(Util.MARGIN_SYMBOL_INFO_FILE_PATH)), "%a %b %d %H:%M:%S %Y").date() != datetime.now().date())
        
        if fetchLatest:

            for ii in range(1,6):

                try:
                    
                    r1 = requests.get("https://margin-calc-arom-prod.angelbroking.com/exchange/BFO/product/OPTION/contract")
                    r1 = pd.DataFrame(r1.json()['contract'])
                    r1 = r1[r1['symbol'].str.contains("SENSEX-|BANKEX-")]
                    r1['exchange'] = "BFO"

                    r2 = requests.get("https://margin-calc-arom-prod.angelbroking.com/exchange/NFO/product/OPTION/contract")
                    r2 = pd.DataFrame(r2.json()['contract'])
                    r2 = r2[r2['symbol'].str.contains("NIFTY-")]
                    r2['exchange'] = "NFO"

                    r3 = requests.get("https://margin-calc-arom-prod.angelbroking.com/exchange/MCX/product/OPTION/contract")
                    r3 = pd.DataFrame(r3.json()['contract'])
                    r3['exchange'] = "MCX"

                    r0 = pd.concat([r1, r2, r3])
                    r0 = r0.reset_index(drop=True)

                    r0['underlyingname'] = r0['symbol'].apply(lambda x: x.split("-")[0])
                    r0['expiry'] = r0['symbol'].apply(lambda x: x.split("-")[-1])
                    r0 = r0[['symbol', 'instrumentType', 'underlyingname', 'expiry', 'exchange']]
                    r0['expiry'] = pd.to_datetime(r0['expiry'], format="%d%b%y")

                    toReturn = {}
                    for underlyingName in r0['underlyingname'].unique():
                        underlyingSymbol = r0[r0['underlyingname'] == underlyingName]
                        underlyingSymbol = underlyingSymbol.sort_values(by=['expiry'])
                        toReturn[underlyingName] = {ii: {"contract": underlyingSymbol['symbol'].iloc[ii], "exchange": underlyingSymbol['exchange'].iloc[ii]} for ii in range(underlyingSymbol.shape[0])}
                    
                    with open(Util.MARGIN_SYMBOL_INFO_FILE_PATH, "+w") as f:
                        f.write(json.dumps(toReturn, indent=4))

                    Util.MARGIN_INFO = toReturn
                    return
                
                except Exception:
                    logging.error(traceback.format_exc())
                    time.sleep(ii)
                    
        else:

            with open(Util.MARGIN_SYMBOL_INFO_FILE_PATH, "+r") as f:
                dtaa = json.loads(f.read())
            
            Util.MARGIN_INFO = {indice: {int(jj): dtaa[indice][jj] for jj in dtaa[indice]} for indice in dtaa}
            return 
        
    @staticmethod
    def getTVSignalsInDf(signalfilepath: str, signals: list) -> pd.DataFrame:
        
        if (signalfilepath == "") and (not signals):
            return pd.DataFrame()
        
        if signalfilepath != "":
        
            if not os.path.exists(signalfilepath):
                logging.info(f"Unable to find TV signal file, given location: {signalfilepath}")
                return pd.DataFrame()
            
            signalDf = pd.read_excel(signalfilepath, sheet_name="List of trades")
            # Handle different column names for contracts/position size
            if 'Contracts' in signalDf.columns:
                contracts_column = 'Contracts'
            elif 'Position size (qty)' in signalDf.columns:
                contracts_column = 'Position size (qty)'
            else:
                logging.error("Neither 'Contracts' nor 'Position size (qty)' column found in signal file")
                return pd.DataFrame()
            
            # Include Price INR column if it exists (for DB Exit functionality)
            columns_to_read = ['Trade #', 'Type', 'Date/Time', contracts_column]
            column_names = ["tradeno", "signal", "datetime", "lots"]
            
            if 'Price INR' in signalDf.columns:
                columns_to_read.append('Price INR')
                column_names.append('exit_price')
                logging.info(f"Found 'Price INR' column in signal file - will use for DB Exit searches")
            else:
                logging.info(f"No 'Price INR' column found - DB Exit will use default logic")
            
            signalDf = signalDf[columns_to_read]
            signalDf.columns = column_names
        
        else:

            signalDf = pd.DataFrame(signals)
            signalDf = signalDf.drop(columns=['signal'])
            signalDf = signalDf.rename(columns={"trade": "tradeno", "contracts": "lots", "type": "signal"})
        
        # Return all columns including exit_price if it exists
        base_columns = ["tradeno", "signal", "datetime", "lots"]
        if 'exit_price' in signalDf.columns:
            return signalDf[base_columns + ['exit_price']].dropna(subset=base_columns).reset_index(drop=True)
        else:
            return signalDf[base_columns].dropna(how="any").reset_index(drop=True)
    
    @staticmethod
    def getTVIntraSignals(rolloverIndex: str, uPara: dict, signalDf: pd.DataFrame) -> dict:

        if signalDf.empty:
            logging.error("No signal found.")
            return {}
        
        if uPara['DoRollover']:
            
            rolloverInfo = Util.getDateInfoForRollver(indexTraded=rolloverIndex)
            if not rolloverInfo:
                logging.error("Unable to get expiry dates required for rollover. Hence, cann't run.")
                return {}
            
            rolloverTime = str(int(uPara['RolloverTime']))
            
        else:
            rolloverInfo = {}
        
        signalDf['datetime'] = pd.to_datetime(signalDf['datetime'], format=uPara['SignalDateFormat'])
        
        entrySignalCount = signalDf[signalDf['signal'].str.contains("Entry ")]
        entrySignalCount['datetime'] = entrySignalCount['datetime'].dt.strftime("%y%m%d").astype(int)
        entrySignalCount = entrySignalCount[['datetime']]
        entrySignalCount = entrySignalCount['datetime'].value_counts().to_dict()
        
        # Debug: Log date filtering
        # Handle both formats: with underscores (01_01_2024) and as integer (1012024)
        start_date_str = str(uPara['StartDate'])
        end_date_str = str(uPara['EndDate'])
        
        if '_' in start_date_str:
            # Format: 01_01_2024
            start_date = datetime.strptime(start_date_str, "%d_%m_%Y").date()
            end_date = datetime.strptime(end_date_str, "%d_%m_%Y").date()
        else:
            # Format: integer like 1012024 (should be 01012024)
            # Pad with zeros to ensure 8 digits DDMMYYYY
            start_date_str = start_date_str.zfill(8)
            end_date_str = end_date_str.zfill(8)
            start_date = datetime.strptime(start_date_str, "%d%m%Y").date()
            end_date = datetime.strptime(end_date_str, "%d%m%Y").date()
        before_filter = len(signalDf)
        
        # Debug: Log parsed dates
        logging.info(f"Date parsing debug: StartDate={uPara['StartDate']} -> {start_date}, EndDate={uPara['EndDate']} -> {end_date}")
        
        # Count Jan 1 signals before filtering
        jan1_before = len(signalDf[signalDf['datetime'].dt.date == datetime(2024, 1, 1).date()])
        logging.info(f"Jan 1, 2024 signals BEFORE date filter: {jan1_before}")
        
        # Show the first few Jan 1 signals before filtering
        jan1_signals_before = signalDf[signalDf['datetime'].dt.date == datetime(2024, 1, 1).date()]
        if not jan1_signals_before.empty:
            for idx, row in jan1_signals_before.head(3).iterrows():
                logging.info(f"  Trade #{row['tradeno']}: {row['datetime']} - {row['signal']}")
        
        signalDf = signalDf[
            (signalDf['datetime'].dt.date >= start_date) & 
            (signalDf['datetime'].dt.date <= end_date)
        ]
        
        after_filter = len(signalDf)
        logging.info(f"Date filter: {uPara['StartDate']} to {uPara['EndDate']}")
        logging.info(f"Signals before filter: {before_filter}, after filter: {after_filter}")
        
        # Check Jan 1 specifically after filtering
        jan1_count = len(signalDf[signalDf['datetime'].dt.date == datetime(2024, 1, 1).date()])
        logging.info(f"Jan 1, 2024 signals AFTER date filter: {jan1_count}")
        
        # Show the Jan 1 signals after filtering
        jan1_signals_after = signalDf[signalDf['datetime'].dt.date == datetime(2024, 1, 1).date()]
        if not jan1_signals_after.empty:
            for idx, row in jan1_signals_after.head(3).iterrows():
                logging.info(f"  Trade #{row['tradeno']}: {row['datetime']} - {row['signal']}")
        signalDf = signalDf.sort_values(by=['datetime'])
        signalDf = signalDf.reset_index(drop=True)
        # Store original signal for debugging before transformation
        signalDf['original_signal'] = signalDf['signal']
        signalDf['signal'] = signalDf['signal'].str.upper().apply(lambda x: x.split(" ")[1] if len(x.split(" ")) > 1 else x).str.strip()

        if uPara['ManualTradeEntryTime'] != 0:

            starttradenofrom = signalDf['tradeno'].max()

            manualsignalentrytime = datetime.strptime(str(int(uPara['ManualTradeEntryTime'])), "%H%M%S").time()
            manualsignallasttime = datetime.strptime(str(int(uPara['IntradayExitTime'])), "%H%M%S").time()

            uniquedts = sorted(signalDf['datetime'].dt.date.unique())
            manipulatedsignalafterconsideringmanualsignal = []

            for udate in uniquedts:

                ckdf = signalDf[signalDf['datetime'].dt.date == udate]
                datewisesignals = ckdf.to_dict("records")

                if manualsignalentrytime < ckdf.iloc[0]['datetime'].time(): # creating manual signal incase signal is after manual signal entry time

                    starttradenofrom += 1
                    datewisesignals.insert(0, {
                        "tradeno": starttradenofrom, 
                        "signal": "MANUAL",
                        "original_signal": "Entry MANUAL",  # Add original_signal for proper entry/exit detection
                        "datetime": datetime(udate.year, udate.month, udate.day, manualsignalentrytime.hour, manualsignalentrytime.minute, manualsignalentrytime.second), 
                        "lots": uPara['ManualTradeLots']
                    })
                    datewisesignals.insert(1, {
                        "tradeno": starttradenofrom, 
                        "signal": "MANUAL",
                        "original_signal": "Exit MANUAL",  # Add original_signal for proper entry/exit detection
                        "datetime": datetime(udate.year, udate.month, udate.day, ckdf.iloc[0]['datetime'].hour, ckdf.iloc[0]['datetime'].minute, ckdf.iloc[0]['datetime'].second), 
                        "lots": uPara['ManualTradeLots']
                    })
                
                if manualsignallasttime > ckdf.iloc[-1]['datetime'].time(): # creating manual signal incase signal is exited before exit time

                    starttradenofrom += 1
                    datewisesignals.insert(len(datewisesignals), {
                        "tradeno": starttradenofrom, 
                        "signal": "MANUAL",
                        "original_signal": "Entry MANUAL",  # Add original_signal for proper entry/exit detection
                        "datetime": datetime(udate.year, udate.month, udate.day, ckdf.iloc[-1]['datetime'].hour, ckdf.iloc[-1]['datetime'].minute, ckdf.iloc[-1]['datetime'].second), 
                        "lots": uPara['ManualTradeLots']
                    })
                    datewisesignals.insert(len(datewisesignals), {
                        "tradeno": starttradenofrom, 
                        "signal": "MANUAL",
                        "original_signal": "Exit MANUAL",  # Add original_signal for proper entry/exit detection
                        "datetime": datetime(udate.year, udate.month, udate.day, manualsignallasttime.hour, manualsignallasttime.minute, manualsignallasttime.second), 
                        "lots": uPara['ManualTradeLots']
                    })
                
                manipulatedsignalafterconsideringmanualsignal += datewisesignals

            signalDf = pd.DataFrame(manipulatedsignalafterconsideringmanualsignal)
            del manipulatedsignalafterconsideringmanualsignal
            
        finalSignal = {"LONG": [], "SHORT": [], "MANUAL": []}

        for tradeno in signalDf['tradeno'].unique():
            signals = signalDf[signalDf['tradeno'] == tradeno]
            if (signals.shape[0] % 2 != 0):
                continue

            # Identify which row is entry vs exit based on original signal type
            # Use original_signal column if available to properly identify entry vs exit
            entry_idx = None
            exit_idx = None
            for i in range(min(2, len(signals))):
                # Use original_signal if available, otherwise use signal
                if 'original_signal' in signals.columns:
                    signal_type = signals.iloc[i]['original_signal'].upper()
                else:
                    signal_type = signals.iloc[i]['signal'].upper()
                
                if 'ENTRY' in signal_type:
                    if entry_idx is None:
                        entry_idx = i
                elif 'EXIT' in signal_type:
                    if exit_idx is None:
                        exit_idx = i
            
            # Fallback to original logic if we can't determine from signal type
            if entry_idx is None or exit_idx is None:
                # Check datetime order - entry should be before exit
                if signals['datetime'].iloc[0] < signals['datetime'].iloc[1]:
                    entry_idx, exit_idx = 0, 1
                else:
                    entry_idx, exit_idx = 1, 0

            entrydate = int(signals['datetime'].iloc[entry_idx].date().strftime('%y%m%d'))
            entrytime = signals['datetime'].iloc[entry_idx].time().strftime("%H%M%S")

            if (entrydate in entrySignalCount) and (uPara['FirstTradeEntryTime'] != 0):
                entrytime = str(int(uPara['FirstTradeEntryTime']))
                entrySignalCount.pop(entrydate)
            
            exitdate = int(signals['datetime'].iloc[exit_idx].date().strftime('%y%m%d'))
            exittime = signals['datetime'].iloc[exit_idx].time().strftime("%H%M%S")

            if uPara['IncreaseEntrySignalTimeBy'] != 0:
                entrytime = (datetime.strptime(entrytime, "%H%M%S") + relativedelta(seconds=uPara['IncreaseEntrySignalTimeBy'])).strftime("%H%M%S")
            
            if uPara['IncreaseExitSignalTimeBy'] != 0:
                exittime = (datetime.strptime(exittime, "%H%M%S") + relativedelta(seconds=uPara['IncreaseExitSignalTimeBy'])).strftime("%H%M%S")

            addEntry = True

            if uPara['DoRollover']:

                currentexpiry = rolloverInfo['expirys'].get(entrydate)
                if currentexpiry is None:
                    continue

                currentexpiry = currentexpiry[0]
            
                if exitdate > currentexpiry: # exit date is after current expiry

                    addEntry = False
                    logging.info(f"Rollover required for tradeno: {tradeno}")

                    finalSignal[signals['signal'].iloc[0]].append({
                        "entrydate": entrydate, "entrytime": entrytime, "exitdate": currentexpiry, "exittime": rolloverTime, 
                        "lots": int(signals['lots'].iloc[0]), "ExpiryDayExitTime": rolloverTime, "isrollovertrade": False
                    })

                    loopTime = math.ceil((signals['datetime'].iloc[1].date() - signals['datetime'].iloc[0].date()).days / 5)
                    for __ in range(loopTime):

                        nexttradingdate = rolloverInfo['tradingdates'][rolloverInfo['tradingdates'].index(currentexpiry)+1]
                        nextexitdate = rolloverInfo['expirys'][nexttradingdate][0]

                        if nextexitdate >= exitdate:

                            finalSignal[signals['signal'].iloc[0]].append({
                                "entrydate": currentexpiry, "entrytime": rolloverTime, "exitdate": exitdate, "exittime": exittime, 
                                "lots": int(signals['lots'].iloc[0]), "ExpiryDayExitTime": exittime, "isrollovertrade": True
                            })
                            break

                        finalSignal[signals['signal'].iloc[0]].append({
                            "entrydate": currentexpiry, "entrytime": rolloverTime, "exitdate": nextexitdate, "exittime": rolloverTime, 
                            "lots": int(signals['lots'].iloc[0]), "ExpiryDayExitTime": rolloverTime, "isrollovertrade": True
                        })
                        currentexpiry = rolloverInfo['expirys'].get(nextexitdate)[0]

            if (not uPara['TvExitApplicable']) and uPara['IntradaySqOffApplicable']:

                if (exitdate != entrydate) or (int(exittime) > int(uPara['IntradayExitTime'])):
                    exittime = str(int(uPara['IntradayExitTime']))
                    exitdate = entrydate

            if not addEntry:
                continue

            signal_info = {
                "entrydate": entrydate, "entrytime": entrytime, "exitdate": exitdate, "exittime": exittime, "lots": int(signals['lots'].iloc[entry_idx]), 
                "ExpiryDayExitTime": str(int(uPara['ExpiryDayExitTime'])), "isrollovertrade": False,
                "original_tv_exittime": exittime,  # Preserve original TV exit time for DB Exit display
                "tradeno": tradeno  # Add trade number to track individual trades
            }
            
            # Add entry price if available (for DB Entry functionality) 
            # Note: Price INR column contains price for both entry and exit signals
            if 'exit_price' in signals.columns and entry_idx is not None and not pd.isna(signals['exit_price'].iloc[entry_idx]):
                signal_info['entry_price'] = float(signals['exit_price'].iloc[entry_idx])  # 'exit_price' column name but contains price for both signals
                logging.info(f"Added entry_price {signal_info['entry_price']} for trade {tradeno}")
            else:
                logging.debug(f"No entry_price for trade {tradeno}")
            
            # Add exit price if available (for DB Exit functionality)
            if 'exit_price' in signals.columns and exit_idx is not None and not pd.isna(signals['exit_price'].iloc[exit_idx]):
                signal_info['exit_price'] = float(signals['exit_price'].iloc[exit_idx])
                logging.info(f"Added exit_price {signal_info['exit_price']} for trade {tradeno} (entry: {entrydate} {entrytime}, exit: {exitdate} {exittime})")
            else:
                logging.debug(f"No exit_price for trade {tradeno} - columns: {signals.columns.tolist() if hasattr(signals, 'columns') else 'N/A'}, exit_idx: {exit_idx}")
                
            finalSignal[signals['signal'].iloc[entry_idx]].append(signal_info)

        # Debug: Log final signal counts
        logging.info(f"getTVIntraSignals returning signals:")
        for signal_type, signals_list in finalSignal.items():
            logging.info(f"  {signal_type}: {len(signals_list)} signals")
            # Count Jan 1 signals in final output
            jan1_in_type = sum(1 for s in signals_list if s['entrydate'] == 240101)
            if jan1_in_type > 0:
                logging.info(f"    Including {jan1_in_type} signals on Jan 1, 2024")
                # Show first Jan 1 signal details
                for s in signals_list:
                    if s['entrydate'] == 240101:
                        logging.info(f"      Jan 1 signal: entry={s['entrytime']}, exit={s['exittime']}, lots={s['lots']}")
                        break
        
        return finalSignal
    
    @staticmethod
    def getDbExitTiming(exitdate: str, exittime: str, signal_direction: str,
                        search_interval: int, price_source: str, index_name: str,
                        exit_price_level: float) -> Optional[str]:
        """
        Query database for more precise exit timing within TV candle window.
        
        Args:
            exitdate: Exit date in DD_MM_YYYY format
            exittime: Exit time in HHMMSS format
            signal_direction: LONG or SHORT
            search_interval: Minutes to search backward (e.g., 5, 15)
            price_source: SPOT or FUTURE
            index_name: Index name (e.g., NIFTY)
            exit_price_level: Price level to check for exit
            
        Returns:
            Precise exit time in HHMMSS format or None
        """
        import mysql.connector
        from datetime import datetime, timedelta
        
        try:
            # Parse date and time
            date_parts = exitdate.split('_')
            date_str = f"{date_parts[2]}-{date_parts[1]}-{date_parts[0]}"  # YYYY-MM-DD
            
            exit_dt = datetime.strptime(f"{date_str} {exittime[:2]}:{exittime[2:4]}:{exittime[4:6]}", 
                                       "%Y-%m-%d %H:%M:%S")
            start_dt = exit_dt - timedelta(minutes=search_interval)
            
            # Connect to database using environment variables or defaults
            import os
            conn = mysql.connector.connect(
                host=os.getenv('DB_HOST', '106.51.63.60'),
                user=os.getenv('DB_USER', 'mahesh'),
                password=os.getenv('DB_PASSWORD', 'mahesh_123'),
                database=os.getenv('DB_NAME', 'historicaldb')
            )
            cursor = conn.cursor()
            
            # Determine table based on price source
            table = f"{index_name.lower()}_cash" if price_source == "SPOT" else f"{index_name.lower()}_future"
            
            # Query for 1-minute data within search window
            query = f"""
                SELECT date, time, high, low, close 
                FROM {table}
                WHERE date = %s 
                AND time >= %s AND time <= %s
                ORDER BY time ASC
            """
            
            cursor.execute(query, (date_str, start_dt.strftime("%H:%M:%S"), 
                                  exit_dt.strftime("%H:%M:%S")))
            
            rows = cursor.fetchall()
            
            # Find exact exit based on signal direction
            for row in rows:
                time_val = str(row[1]).replace(':', '')  # Convert to HHMMSS
                high_val = float(row[2])
                low_val = float(row[3])
                
                if signal_direction == "LONG":
                    # For LONG, exit when low <= exit_price
                    if low_val <= exit_price_level:
                        cursor.close()
                        conn.close()
                        return time_val
                else:  # SHORT
                    # For SHORT, exit when high >= exit_price
                    if high_val >= exit_price_level:
                        cursor.close()
                        conn.close()
                        return time_val
            
            cursor.close()
            conn.close()
            
        except Exception as e:
            logging.error(f"Error in getDbExitTiming: {e}")
            
        return None  # Return None if no precise exit found
    
    @staticmethod
    def getPortfolioJson(excelFilePath: str, tvSignalInfoo: dict={}, strategyNamePrefix: str="") -> tuple:

        toReturnPortJson, toReturnStgyParaDf = {}, {}
        isTvBasedPortfolio = len(tvSignalInfoo) != 0

        # Resolve relative paths against this module's directory to support running from repo root
        _resolved_path = excelFilePath
        if not os.path.isabs(_resolved_path):
            _resolved_path = os.path.join(os.path.dirname(__file__), excelFilePath)
        if not os.path.exists(_resolved_path):
            logging.error(f"Unable to find input file, location: {excelFilePath}")
            return toReturnPortJson, toReturnStgyParaDf
        
        portfolioShtDf = pd.read_excel(_resolved_path, sheet_name="PortfolioSetting")
        portfolioShtDf = portfolioShtDf[portfolioShtDf['Multiplier'] > 0]
        portfolioShtDf = portfolioShtDf.reset_index(drop=True)
        
        for colName in ["Enabled", "PortfolioName"]:
            portfolioShtDf[colName] = portfolioShtDf[colName].str.upper()
        
        portfolioShtDf = portfolioShtDf[portfolioShtDf['Enabled'] == "YES"]
        # Override portfolio window to 5-day NIFTY slice for TV-007 evidence
        if str(os.environ.get('TV007_INDICATOR_EVIDENCE', '0')).strip().lower() in {'1','true','yes','on'} and not portfolioShtDf.empty:
            try:
                portfolioShtDf.loc[:, 'StartDate'] = '03_01_2022'
                portfolioShtDf.loc[:, 'EndDate'] = '07_01_2022'
                portfolioShtDf.loc[:, 'IsTickBT'] = 'no'
            except Exception:
                pass
        if portfolioShtDf.empty:
            return toReturnPortJson, toReturnStgyParaDf

        strategyShtDf = pd.read_excel(_resolved_path, sheet_name="StrategySetting")
        for colName in ["Enabled", "PortfolioName"]:
            strategyShtDf[colName] = strategyShtDf[colName].str.upper()
        
        # Resolve StrategyExcelFilePath entries relative to this module
        def _resolve_path(pth: str) -> str:
            try:
                pth = str(pth)
            except Exception:
                return pth
            return pth if os.path.isabs(pth) else os.path.join(os.path.dirname(__file__), pth)
        strategyShtDf['StrategyExcelFilePath'] = strategyShtDf['StrategyExcelFilePath'].apply(_resolve_path)
        strategyShtDf['fileExists'] = strategyShtDf['StrategyExcelFilePath'].apply(os.path.exists)
        # Fallback mapping for Windows-style absolute paths to local INPUT SHEETS by basename
        def _fallback_local(pth: str) -> str:
            if os.path.exists(pth):
                return pth
            base = os.path.basename(str(pth))
            cand = os.path.join(os.path.dirname(__file__), 'INPUT SHEETS', base)
            return cand if os.path.exists(cand) else pth
        strategyShtDf['StrategyExcelFilePath'] = strategyShtDf['StrategyExcelFilePath'].apply(_fallback_local)
        strategyShtDf['fileExists'] = strategyShtDf['StrategyExcelFilePath'].apply(os.path.exists)
        strategyShtDf = strategyShtDf[(strategyShtDf['Enabled'] == "YES") & strategyShtDf['fileExists']]
        strategyShtDf = strategyShtDf.drop(columns=['fileExists', 'Enabled'])
        strategyShtDf['StrategyType'] = strategyShtDf['StrategyType'].str.upper()
        strategyShtDf['StrategyType'] = np.where(strategyShtDf['StrategyType'] == "IBS", "VWAP", strategyShtDf['StrategyType'])
        # If explicit QA env set, uplift indicator-related rows even if not enabled in the Excel
        if str(os.environ.get('TV007_INDICATOR_EVIDENCE', '0')).strip().lower() in {'1','true','yes','on'}:
            # Re-read full sheet to find candidate rows and merge
            strategyShtDf_full = pd.read_excel(_resolved_path, sheet_name="StrategySetting")
            for colName in ["Enabled", "PortfolioName"]:
                strategyShtDf_full[colName] = strategyShtDf_full[colName].str.upper()
            strategyShtDf_full['StrategyExcelFilePath'] = strategyShtDf_full['StrategyExcelFilePath'].apply(_resolve_path)
            strategyShtDf_full['StrategyExcelFilePath'] = strategyShtDf_full['StrategyExcelFilePath'].apply(_fallback_local)
            strategyShtDf_full['fileExists'] = strategyShtDf_full['StrategyExcelFilePath'].apply(os.path.exists)
            # Focus evidence on INDICATOR workbook only
            mask = strategyShtDf_full['StrategyExcelFilePath'].str.contains(r"INPUT INDICATOR\.xlsx$", regex=True, na=False)
            uplift = strategyShtDf_full[mask & strategyShtDf_full['fileExists']].copy()
            if not uplift.empty:
                uplift['Enabled'] = 'YES'
                # Normalize StrategyType for INDICATOR workbook rows
                uplift.loc[uplift['StrategyExcelFilePath'].str.contains(r"INPUT INDICATOR\.xlsx$", regex=True), 'StrategyType'] = 'INDICATOR'
                uplift = uplift.drop(columns=['fileExists'])
                strategyShtDf = pd.concat([strategyShtDf, uplift], ignore_index=True)
                strategyShtDf = strategyShtDf.drop_duplicates()
            # Hard-restrict to INDICATOR workbook rows only for evidence
            strategyShtDf = strategyShtDf[strategyShtDf['StrategyExcelFilePath'].str.contains(r"INPUT INDICATOR\.xlsx$", regex=True, na=False)].copy()
            if not strategyShtDf.empty:
                strategyShtDf['StrategyType'] = 'INDICATOR'
        
        if strategyShtDf.empty:
            return toReturnPortJson, toReturnStgyParaDf
        
        for pIndex, pInfo in portfolioShtDf.iterrows():
            
            isTickBt = pInfo['IsTickBT'].lower() == "yes"
            checkfreq = 1 if isTickBt else 60

            pStrategyDf = strategyShtDf[strategyShtDf['PortfolioName'] == pInfo['PortfolioName']]
            if pStrategyDf.empty:
                continue

            if isTvBasedPortfolio:
                startDate, endDate = 0, 0
            else:
                startDate = int(datetime.strptime(pInfo["StartDate"], "%d_%m_%Y").strftime('%y%m%d'))
                endDate = int(datetime.strptime(pInfo["EndDate"], "%d_%m_%Y").strftime('%y%m%d'))

            strategiesLst = []
            for __, sInfo in pStrategyDf.iterrows():

                if sInfo['StrategyType'].upper() not in Util.VALID_BT_TYPE_FOR_USER:
                    logging.info(f"Invalid StrategyType received i.e. {sInfo['StrategyType']}. Valid options are: {Util.VALID_BT_TYPE_FOR_USER}")
                    continue

                strategyJsonn = Util.getStategyJson(
                    isTickBt=isTickBt, btType=sInfo['StrategyType'], excelFilePath=sInfo['StrategyExcelFilePath'], strategyNamePrefix=strategyNamePrefix, 
                    tvSignalInfoo=tvSignalInfoo, portfolioMultiplier=pInfo['Multiplier']
                )
                if len(strategyJsonn) == 0:
                    continue

                if isTvBasedPortfolio:
                    startDate = tvSignalInfoo['entrydate'] if startDate == 0 else min(startDate, tvSignalInfoo['entrydate'])
                    endDate = tvSignalInfoo['exitdate'] if endDate == 0 else max(endDate, tvSignalInfoo['exitdate'])

                strategiesLst += strategyJsonn

                if isTvBasedPortfolio: # for TV based signals
                    continue

                if pIndex not in toReturnStgyParaDf:
                    toReturnStgyParaDf[pIndex] = {
                        "PortfolioParameter": pd.DataFrame.from_dict(dict(pInfo), orient="index").reset_index().rename(columns={"index": "Head", 0: "Value"}), 
                        "GeneralParameter": pd.DataFrame(), "LegParameter": pd.DataFrame()
                    }

                for keyy in ["GeneralParameter", "LegParameter"]:
                    toReturnStgyParaDf[pIndex][keyy] = pd.concat([toReturnStgyParaDf[pIndex][keyy], pd.read_excel(sInfo['StrategyExcelFilePath'], sheet_name=keyy)])
                    toReturnStgyParaDf[pIndex][keyy] = toReturnStgyParaDf[pIndex][keyy].reset_index(drop=True)
            
            if len(strategiesLst) == 0:
                continue

            indicesForStgyJson = set([__settingDict['index'].split(".")[-1] for __settingDict in strategiesLst])

            isMcxSymbol = any([ss in Util.MCX_SYMBOLS for ss in indicesForStgyJson])
            isNonMcxSymbol = any([ss in Util.NON_MCX_SYMBOLS for ss in indicesForStgyJson])
            isUsSymbol = any([ss in Util.US_SYMBOLS for ss in indicesForStgyJson])
            
            if sum([isMcxSymbol, isNonMcxSymbol, isUsSymbol]) > 1:
                logging.info("Please run either US or MCX or NSE&BSE indices.")
                continue

            if isUsSymbol:
                exchange = "EXCHANGE.US"
            elif isMcxSymbol:
                exchange = "EXCHANGE.MCX"
            else:
                exchange = "EXCHANGE.NSE"
            
            toReturnPortJson[pIndex] = {
                "istickbt": isTickBt,
                "slippage_percent": pInfo['SlippagePercent']/100,
                "start_date": startDate,
                "end_date": endDate,
                "broker_details": {"broker": "BROKER.PAPER"}, 
                "exchange": exchange,
                "order_type": "ORDERTYPE.MARKET", 
                "product_type": "PRODUCTTYPE.NRML",
                "fix_vix": config.FIXED_VALUE_FOR_DYNAMIC_FACTOR.get("vix", 0), 
                "check_interval": checkfreq, 
                "feed_source": "FEEDSOURCE.HISTORICAL",
                "portfolio": {
                    "id": pIndex,
                    "name": pInfo['PortfolioName'],
                    "stop_loss": {
                        "type": "NUMBERTYPE.POINT", 
                        "value": float(pInfo["PortfolioStoploss"])*-1, 
                        "params": {
                            "check_frequency": checkfreq
                        }
                    },
                    "take_profit": {
                        "type": "NUMBERTYPE.POINT", 
                        "value": float(pInfo["PortfolioTarget"]), 
                        "params": {
                            "check_frequency": checkfreq
                        }
                    },
                    "trailing_stop_loss": {
                        "profit_move": {
                            "type": "NUMBERTYPE.POINT","value": 0
                        }, 
                        "stop_loss_move": {
                            "type": "NUMBERTYPE.POINT", "value": 0
                        }
                    },
                    "lock_and_trail": {
                        "Type": "LOCKTYPE.REGULAR", "lock": 0, "trail": 0
                    },
                    "strategies": strategiesLst
                }
            }

            # Handle both portfolio and strategy trailing types
            trailing_type_key = 'PortfolioTrailingType' if 'PortfolioTrailingType' in pInfo else 'StrategyTrailingType'
            
            if trailing_type_key in pInfo and pInfo[trailing_type_key].lower() == 'trail profits':
                toReturnPortJson[pIndex]['portfolio'].update({
                    "trailing_stop_loss": {
                        "profit_move": {
                            "type": "NUMBERTYPE.POINT","value": pInfo['IncreaseInProfit']
                        },
                        "stop_loss_move": {
                            "type": "NUMBERTYPE.POINT", "value": pInfo['TrailMinProfitBy']
                        }
                    },
                    "lock_and_trail": {
                        "Type": "LOCKTYPE.REGULAR", "lock": pInfo['IncreaseInProfit'], "trail": pInfo['TrailMinProfitBy']
                    }
                })

            elif trailing_type_key in pInfo and pInfo[trailing_type_key].lower() == 'lock minimum profit':
                toReturnPortJson[pIndex]['portfolio'].update({
                    "lock_and_trail": {
                        "Type": "LOCKTYPE.REGULAR", "lock": pInfo['ProfitReaches'], "trail": pInfo['LockMinProfitAt']
                    }
                })

            elif trailing_type_key in pInfo and pInfo[trailing_type_key].lower() == 'lock & trail profits':
                toReturnPortJson[pIndex]['portfolio'].update({
                    "trailing_stop_loss": {
                        "profit_move": {
                            "type": "NUMBERTYPE.POINT","value": pInfo['IncreaseInProfit']
                        },
                        "stop_loss_move": {
                            "type": "NUMBERTYPE.POINT", "value": pInfo['TrailMinProfitBy']
                        }
                    },
                    "lock_and_trail": {
                        "Type": "LOCKTYPE.REGULAR", "lock": pInfo['ProfitReaches'], "trail": pInfo['LockMinProfitAt']
                    }
                })
            
            elif trailing_type_key in pInfo and pInfo[trailing_type_key].lower() == 'portfolio lock trail':
                toReturnPortJson[pIndex]['portfolio'].update({
                    "lock_and_trail": {
                        "Type": "LOCKTYPE.MAX_TILL_TIME", "lock_time": Util.getSeconds(timesting=pInfo["PnLCalTime"]), 
                        "lock": float(pInfo['LockPercent']), "trail": float(pInfo['TrailPercent'])
                    }
                })
            
            elif trailing_type_key in pInfo and pInfo[trailing_type_key].lower() == 'max possible profit':
                toReturnPortJson[pIndex]['portfolio'].update({
                    "lock_and_trail": {
                        "Type": "LOCKTYPE.MAX_POSSIBLE_PROFIT", "lock_time": Util.getSeconds(timesting=pInfo["PnLCalTime"]), 
                        "lock": 0, "next_check_time": Util.getSeconds(timesting=pInfo["SqOff1Time"]), "trail": float(pInfo['SqOff1Percent']),
                        "final_trail_time": Util.getSeconds(timesting=pInfo["SqOff2Time"]), "final_trail": float(pInfo['SqOff2Percent'])
                    }
                })
            
        return toReturnPortJson, toReturnStgyParaDf
    
    @staticmethod
    def getSeconds(timesting: str):
        """This function is used to convert human readable time to system required time"""

        todayy = datetime.now()
        timee = datetime.strptime(str(int(timesting)), "%H%M%S")

        secondss = datetime(todayy.year, todayy.month, todayy.day, timee.hour, timee.minute, timee.second) - datetime(todayy.year, todayy.month, todayy.day)
        return int(secondss.total_seconds())
    
    @staticmethod
    def getStrikeValueAndMethod(strikeValue: float, strikeMethod: str, premiumCondition: str, matchPremium: str) -> tuple:
        
        strikeMethodd, strikeValuee = "", float(strikeValue)

        if strikeMethod == "PREMIUM VARIABLE2":
            strikeValuee = f"{premiumCondition}_{strikeValuee}"

        if strikeMethod == "ATM":
            strikeMethodd = "BY_ATM_STRIKE"

        if strikeMethod in ["ATM WIDTH", "STRADDLE WIDTH"]:
            strikeMethodd = "BY_ATM_STRADDLE"
        
        elif strikeMethod == "PREMIUM VARIABLE2":
            strikeMethodd = "BY_DYNAMIC_FACTOR"

        elif strikeMethod in ["PREMIUM", "DELTA"]:

            if premiumCondition == "=":
                strikeMethodd = f"BY_CLOSEST_{strikeMethod}"
            elif premiumCondition == ">":
                strikeMethodd = f"BY_GE_{strikeMethod}"
            elif premiumCondition == "<":
                strikeMethodd = f"BY_LE_{strikeMethod}"
        
        elif strikeMethod == "ATM MATCH":
            strikeMethodd = "BY_MATCH_PREMIUM"
            if matchPremium == "HIGH":
                strikeValuee = f"{premiumCondition}_1"
            elif matchPremium == "LOW":
                strikeValuee = f"{premiumCondition}_-1"
        
        elif strikeMethod == "ATM DIFF":
            strikeMethodd = "BY_MIN_STRIKE_DIFF"

        return (strikeMethodd, strikeValuee)

    @staticmethod
    def getLegJson(isTickBt: bool, legExcelDf: pd.DataFrame, stgyParameters: dict, isRolloverTrade: bool) -> list:

        if legExcelDf.empty:
            return []
        
        legsInfo = []

        validLegIds = list(legExcelDf['LegID'].unique())
        validLegIds = [ii for ii in validLegIds if not pd.isnull(ii)]

        for __, __info in legExcelDf.iterrows():

            __info = dict(__info)

            if any(pd.isnull(ii) for ii in __info.values()):
                logging.info(f"Empty field for {__info['StrategyName']} {__info['LegID']} {__info['Instrument']} found. Hence, cann't backtest")
                return []
            
            legparaa = Util.getBackendLegJson(
                isTickBt=isTickBt, frontendLegParameters=__info.copy(), frontendStgyParameters=stgyParameters.copy(), isRolloverTrade=isRolloverTrade, 
                validLegIds=validLegIds
            )
            if len(legparaa) == 0:
                continue

            legsInfo.append(legparaa)
        
        return legsInfo
    
    @staticmethod
    def getExecuteParameters(legParaDict: dict, fieldName: str, validLegIds: list) -> list:

        if fieldName == "OnExit":
            if legParaDict.get("OnExit_OpenAllLegs", "NO") == "YES":
                return [{"id": legid, "delay": float(legParaDict[f'{fieldName}_OpenTradeDelay']), "new_spawn": "True"} for legid in validLegIds]
        
        if f"{fieldName}_OpenTradeOn" not in legParaDict:
            return []
        
        __legids = legParaDict[f"{fieldName}_OpenTradeOn"].split(",")
        __legids = [ii.strip() for ii in __legids]

        return [{"id": ii, "delay": float(legParaDict[f'{fieldName}_OpenTradeDelay'])} for ii in __legids if ii in validLegIds]
    
    @staticmethod
    def getSquareParameters(legParaDict: dict, fieldName: str, validLegIds: list) -> list:

        if f"{fieldName}_SqOffTradeOff" not in legParaDict:
            return []
        
        __legids = legParaDict[f"{fieldName}_SqOffTradeOff"].split(",")
        __legids = [ii.strip() for ii in __legids]

        return [{"id": ii, "delay": float(legParaDict[f'{fieldName}_SqOffDelay'])} for ii in __legids if ii in validLegIds]
    
    @staticmethod
    def getBackendLegJson(isTickBt: bool, frontendLegParameters: dict, frontendStgyParameters: dict, isRolloverTrade: bool, validLegIds: list) -> dict:

        if "StrikeMethod" not in frontendLegParameters:
            logging.info("Strike selection method is missing.")
            return {}

        if (frontendLegParameters['StrikeMethod'].upper() == "DELTA"):
            
            if (frontendStgyParameters['Index'] in Util.MCX_SYMBOLS):
                logging.info("Strike selection based on DELTA is not applicable for MCX.")
                return {}
            
            if (frontendStgyParameters['Index'] in Util.US_SYMBOLS):
                logging.info("Strike selection based on DELTA is not applicable for US.")
                return {}
        
        if ('Transaction' not in frontendLegParameters): # adding transaction type based on trader type

            if (frontendStgyParameters['StrategyType'] == "VWAP") and ('Tradertype' in frontendStgyParameters):
                frontendLegParameters['Transaction'] = "SELL" if frontendStgyParameters['Tradertype'] == "SELLER" else "BUY"
            elif ("HEIKIN" in frontendStgyParameters['StrategyType']) or ("EMA" in frontendStgyParameters['StrategyType']):
                frontendLegParameters['Transaction'] = "SELL"

        if (frontendLegParameters.get('SL_TrailAt', 0) != 0) or (frontendLegParameters.get('SL_TrailBy', 0) != 0):

            if ("DELTA" in frontendLegParameters['SLType']):
                logging.info("Stoploss cann't be trail when stoploss type is DELTA.")
                return {}

            if (("INDEX" not in frontendLegParameters['SLType']) and ("INDEX" in frontendLegParameters['TrailSLType'])) or (("INDEX" in frontendLegParameters['SLType']) and ("INDEX" not in frontendLegParameters['TrailSLType'])):
                logging.info("Stoploss type and trail stoploss type cann't be different. Hence, will not backtest.")
                return {}

        if "W&TValue" in frontendLegParameters:
            waitTradeValue = abs(float(frontendLegParameters['W&TValue'])) if frontendLegParameters['Transaction'] == "BUY" else float(frontendLegParameters['W&TValue']) * -1
        else:
            waitTradeValue = 0

        slreentryMethod = Util.RE_ENTRY_ALIAS.get(frontendLegParameters["SL_ReEntryType"], "") if "SL_ReEntryType" in frontendLegParameters else "IMMIDIATE_NC"
        tgtreentryMethod = Util.RE_ENTRY_ALIAS.get(frontendLegParameters["TGT_ReEntryType"], "") if "TGT_ReEntryType" in frontendLegParameters else "IMMIDIATE_NC"
        slType = Util.TGT_SL_ALIAS.get(frontendLegParameters['SLType'], "") if "SLType" in frontendLegParameters else "POINT"
        tgtType = Util.TGT_SL_ALIAS.get(frontendLegParameters['TGTType'], "") if "TGTType" in frontendLegParameters else "POINT"
        isidleVariantReEntryMethod = Util.RE_ENTRY_ALIAS.get(frontendLegParameters["ReEntryType"], "") if "ReEntryType" in frontendLegParameters else "IMMIDIATE_NC"

        strikeMethodd, strikeValuee = Util.getStrikeValueAndMethod(strikeValue=frontendLegParameters['StrikeValue'], strikeMethod=frontendLegParameters['StrikeMethod'], premiumCondition=frontendLegParameters['StrikePremiumCondition'], matchPremium=frontendLegParameters['MatchPremium'])
        hedgestrikeMethodd, hedgestrikeValuee = Util.getStrikeValueAndMethod(strikeValue=frontendLegParameters['HedgeStrikeValue'], strikeMethod=frontendLegParameters['HedgeStrikeMethod'], premiumCondition=frontendLegParameters['HedgeStrikePremiumCondition'], matchPremium=frontendLegParameters['MatchPremium'])

        if strikeMethodd == "":
            logging.info("Invalid leg strike selection method received.")
            return {}
        
        if hedgestrikeMethodd == "":
            logging.info("Invalid hedge leg strike selection method received.")
            return {}
        
        if tgtreentryMethod == "":
            logging.info("Invalid target re-entry method received.")
            return {}
        
        if slreentryMethod == "":
            logging.info("Invalid stoploss re-entry method received.")
            return {}
        
        if isidleVariantReEntryMethod == "":
            logging.info("Invalid is_idle re-entry method received.")
            return {}
        
        if slType == "":
            logging.info("Invalid stoploss method received.")
            return {}
        
        if tgtType == "":
            logging.info("Invalid target method received.")
            return {}
        
        checkfreq = 1 if isTickBt else 60
        
        triggered_renetry_count = float(frontendLegParameters.get('ReEnteriesCount', 0))
        if triggered_renetry_count != 0:
            triggered_renetry_count += 1

        legParaa = {
            "id": frontendLegParameters['LegID'],
            "option_type": f"OPTIONTYPE.{frontendLegParameters['Instrument']}",
            "side": f"SIDE.{frontendLegParameters['Transaction']}",
            "expiry_type": f"EXPIRYTYPE.{Util.EXPIRY_ALIAS['NEXT']}" if isRolloverTrade else f"EXPIRYTYPE.{Util.EXPIRY_ALIAS.get(frontendLegParameters['Expiry'])}",
            "waitin": {
                "type": f"NUMBERTYPE.{frontendLegParameters.get('W&Type', 'POINT')}", 
                "value": waitTradeValue,
                "should_trail": "False" if frontendLegParameters.get("TrailW&T", 'NO') == "NO" else "True"
            },
            "strike_selection": {
                "type": f"STRIKESELECTIONTYPE.{strikeMethodd}", 
                "value": strikeValuee
            },
            "stop_loss_reentry": {
                "type": f"REENTRYTYPE.{slreentryMethod}", 
                "value": {
                    "count": float(frontendLegParameters.get('SL_ReEntryNo', 0)), 
                    "cutoff_time": Util.getSeconds(timesting=frontendStgyParameters["LastEntryTime"]),
                    "check_frequency": int(frontendStgyParameters["ReEntryCheckingInterval"]*checkfreq),
                    "cool_off_time": checkfreq
                }
            },
            "take_profit_reentry": {
                "type": f"REENTRYTYPE.{tgtreentryMethod}", 
                "value": {
                    "count": float(frontendLegParameters.get('TGT_ReEntryNo', 0)), 
                    "cutoff_time": Util.getSeconds(timesting=frontendStgyParameters["LastEntryTime"]),
                    "check_frequency": int(frontendStgyParameters["ReEntryCheckingInterval"]*checkfreq),
                    "cool_off_time": checkfreq
                }
            },
            "triggered_reentry": {
                "type": f"REENTRYTYPE.{isidleVariantReEntryMethod}",
                "value": {
                    "count": triggered_renetry_count,
                    "cutoff_time": Util.getSeconds(timesting=frontendStgyParameters["LastEntryTime"]),
                    "check_frequency": checkfreq,
                    "cool_off_time": checkfreq
                }
            },
            "is_idle": "True" if frontendLegParameters.get("IsIdle", "NO") == "YES" else "False",
            "on_entry": {
                "squareoffall": [{"delay": 0}],
                "execute": Util.getExecuteParameters(legParaDict=frontendLegParameters, fieldName="OnEntry", validLegIds=validLegIds), 
                "squareoff": Util.getSquareParameters(legParaDict=frontendLegParameters, fieldName="OnEntry", validLegIds=validLegIds)
            },
            "on_exit": {
                "squareoffall": [{"delay": 0}],
                "execute": Util.getExecuteParameters(legParaDict=frontendLegParameters, fieldName="OnExit", validLegIds=validLegIds), 
                "squareoff": Util.getSquareParameters(legParaDict=frontendLegParameters, fieldName="OnExit", validLegIds=validLegIds)
            },
            "stop_loss": {
                "type": f"NUMBERTYPE.{slType}", 
                "value": float(frontendLegParameters.get('SLValue', 0)),
                "params": {
                    "check_frequency": int(frontendStgyParameters["StoplossCheckingInterval"]*checkfreq)
                } 
            },
            "take_profit": {
                "type": f"NUMBERTYPE.{tgtType}", 
                "value": float(frontendLegParameters.get('TGTValue', 0)),
                "params": {
                    "check_frequency": int(frontendStgyParameters["TargetCheckingInterval"]*checkfreq)
                }
            },
            "trailing_stop_loss": {
                "profit_move": {
                    "type": f"NUMBERTYPE.{Util.TGT_SL_ALIAS.get(frontendLegParameters.get('TrailSLType', 'POINT'))}", 
                    "value": float(frontendLegParameters.get('SL_TrailAt', 0))
                },
                "stop_loss_move": {
                    "type": f"NUMBERTYPE.{Util.TGT_SL_ALIAS.get(frontendLegParameters.get('TrailSLType', 'POINT'))}", 
                    "value": float(frontendLegParameters.get('SL_TrailBy', 0))
                }
            },
            "quantity": config.LOT_SIZE.get(frontendStgyParameters['Index'], 0),
            "multiplier": int(frontendLegParameters['Lots']),
            "recost_cascade": "True", #"False" if waitTradeValue != 0 else "True",
            "recost_entry_on_crossover": "True" if config.TRAIL_COST_RE_ENTRY else "False",
            "hedge_pnl_effect": "True" if frontendStgyParameters['ConsiderHedgePnLForStgyPnL'] == "YES" else "False",
            "next_expiry_select": "True" if (frontendStgyParameters['OnExpiryDayTradeNextExpiry'] == "YES") and (frontendStgyParameters['Index'] not in Util.MCX_SYMBOLS) else "False"
        }

        if ('OnEntry_SqOffAllLegs' in frontendLegParameters) and (frontendLegParameters['OnEntry_SqOffAllLegs'] == "YES"):
            pass
        else:
            legParaa['on_entry'].pop("squareoffall")

        if ('OnExit_SqOffAllLegs' in frontendLegParameters) and (frontendLegParameters['OnExit_SqOffAllLegs'] == "YES"):
            pass
        else:
            legParaa['on_exit'].pop("squareoffall")
        
        if (frontendLegParameters['Transaction'] == "SELL") and (frontendLegParameters['OpenHedge'] == "YES"):
            legParaa.update({
                "hedge": {
                    "option_type": f"OPTIONTYPE.{frontendLegParameters['Instrument']}",
                    "side": "SIDE.BUY",
                    "expiry_type": f"EXPIRYTYPE.{Util.EXPIRY_ALIAS.get(frontendLegParameters['Expiry'])}",
                    "strike_selection": {
                        "type": f"STRIKESELECTIONTYPE.{hedgestrikeMethodd}", 
                        "value": hedgestrikeValuee
                    },
                    "next_expiry_select": "True" if (frontendStgyParameters['OnExpiryDayTradeNextExpiry'] == "YES") and (frontendStgyParameters['Index'] not in Util.MCX_SYMBOLS) else "False"
                }
            })
        
        if frontendStgyParameters['StrategyType'] == "ORB":
            legParaa.update({
                "orb": {
                    "wait_start": Util.getSeconds(timesting=frontendStgyParameters["OrbRangeStart"]),  
                    "wait_till": Util.getSeconds(timesting=frontendStgyParameters["OrbRangeEnd"]), 
                    "entry_on": "ORBBREAKOUTTYPE.LOWBREAKOUT" if frontendLegParameters['Transaction'] == "SELL" else "ORBBREAKOUTTYPE.HIGHBREAKOUT"
                }
            })

            if 'TradeStrikeValue' in frontendLegParameters:
                legParaa['orb'].update({
                    "new_selection": int(frontendLegParameters['TradeStrikeValue'])
                })
        
        if frontendStgyParameters['StrategyType'] == "OI":
            legParaa.update({
                "oi_check": {
                    "check_interval": checkfreq * int(frontendStgyParameters['Timeframe']),
                    "value": frontendLegParameters['OiThreshold'], "recontracterized": "True"
                }
            })
        
        return legParaa

    @staticmethod
    def getBackendStrategyJson(isTickBt: bool, frontendStgyParameters: dict, parsedLegInfo: list) -> dict:

        if frontendStgyParameters['StrategyType'] == "ORB":
            
            isNewOrb = any(['new_selection' in __legsetting['orb'] for __legsetting in parsedLegInfo])

            frontendStgyParameters['StartTime'] = frontendStgyParameters['OrbRangeEnd'] if isNewOrb else frontendStgyParameters['OrbRangeStart']
            frontendStgyParameters['StrikeSelectionTime'] = frontendStgyParameters['OrbRangeEnd'] if isNewOrb else frontendStgyParameters['OrbRangeStart']
        
        elif frontendStgyParameters['StrategyType'] == "OI":

            if frontendStgyParameters['Timeframe'] % 3 != 0:
                logging.info("Can't run OI strategy as timeframe should be multiple of 3")
                return {}
        
        if frontendStgyParameters['Index'] in Util.US_SYMBOLS:
            underlyingToConsider = "UNDERLYINGTYPE.CASH"
        elif isTickBt or (frontendStgyParameters['Index'] in Util.MCX_SYMBOLS):
            underlyingToConsider = "UNDERLYINGTYPE.FUTURE"
        else:
            underlyingToConsider = f"UNDERLYINGTYPE.{Util.UNDERLYING_ALIAS.get(frontendStgyParameters['Underlying'])}"
        
        if frontendStgyParameters['Index'] in Util.MCX_SYMBOLS:
            # Remove hardcoded DTE = 10, allow user-specified DTE for MCX
            # frontendStgyParameters['DTE'] = 10  # Commented out
            secondLastExitTime = 232959 if isTickBt else 232900
            exitTime = 233000
        elif frontendStgyParameters['Index'] in Util.US_SYMBOLS:
            frontendStgyParameters['DTE'] = 10
            secondLastExitTime = 155959 if isTickBt else 155900
            exitTime = 160000
        else:
            secondLastExitTime = 152959 if isTickBt else 152900
            exitTime = 153000
        
        validweekdays = [ii.strip() for ii in str(frontendStgyParameters['Weekdays']).split(",")]
        validweekdays = [int(ii) for ii in validweekdays if len(ii) != 0]
        checkfreq = 1 if isTickBt else 60

        # All indices use NSEINDEX class regardless of exchange
        index_format = f"NSEINDEX.{frontendStgyParameters['Index']}"
        
        stgyParaa = {
            "index_base_price": config.FIXED_VALUE_FOR_DYNAMIC_FACTOR.get(frontendStgyParameters['Index'].lower(), 0),
            "name": frontendStgyParameters['StrategyName'], 
            "evaluator": frontendStgyParameters['evaluator'], "type": "STRATEGYTYPE.INTRADAY", "index": index_format,
            "underlying": underlyingToConsider, "indicator_candle_based_on": "option",
            "place_order_after": Util.getSeconds(timesting=frontendStgyParameters["StartTime"]), 
            "entry_time": Util.getSeconds(timesting=frontendStgyParameters["StrikeSelectionTime"]),
            "exit_time": Util.getSeconds(timesting=frontendStgyParameters["EndTime"]) if int(frontendStgyParameters["EndTime"]) < exitTime else Util.getSeconds(timesting=secondLastExitTime),
            "tv_expiry_day_exit_time": Util.getSeconds(timesting=frontendStgyParameters["ExpiryDayExitTime"]),
            "pnl_calculation_from": frontendStgyParameters["PnLCalculationFrom"],
            "multiplier": 1,
            "stop_loss": {
                "type": "NUMBERTYPE.POINT", 
                "value": float(frontendStgyParameters['StrategyLoss'])*-1,
                "params": {
                    "check_frequency": checkfreq
                } 
            },
            "take_profit": {
                "type": "NUMBERTYPE.POINT", 
                "value": float(frontendStgyParameters['StrategyProfit']),
                "params": {
                    "check_frequency": checkfreq
                }
            },
            "exit_price": {
                "take_profit_based_on": frontendStgyParameters['TgtTrackingFrom'], 
                "trade_file_exit_price_on_take_profit": frontendStgyParameters['TgtRegisterPriceFrom'],
                "stop_loss_based_on": frontendStgyParameters['SlTrackingFrom'], 
                "trade_file_exit_price_on_stop_loss": frontendStgyParameters['SlRegisterPriceFrom'],
                "trade_file_exit_price_on_trigger": "TICK"
            },
            "stop_loss_reentry": {
                "type": "REENTRYTYPE.IMMIDIATE", 
                "value": {
                    "count": int(frontendStgyParameters['StrategyLossReExecuteNo']), 
                    "cutoff_time": Util.getSeconds(timesting=exitTime),
                    "check_frequency": checkfreq,
                    "cool_off_time": checkfreq
                }
            },
            "take_profit_reentry": {
                "type": "REENTRYTYPE.IMMIDIATE",
                "value": {
                    "count": int(frontendStgyParameters['StrategyProfitReExecuteNo']), 
                    "cutoff_time": Util.getSeconds(timesting=exitTime),
                    "check_frequency": checkfreq,
                    "cool_off_time": checkfreq
                }
            },
            "trailing_stop_loss": {
                "profit_move": {
                    "type": "NUMBERTYPE.POINT","value": 0
                },
                "stop_loss_move": {
                    "type": "NUMBERTYPE.POINT", "value": 0
                }
            },
            "lock_and_trail": {
                "lock": 0, "trail": 0
            },
            "move_sl_to_cost": "False" if frontendStgyParameters.get("MoveSlToCost", "NO") == "NO" else "True"
        }

        if len(validweekdays) < 5:
            stgyParaa.update({
                "acceptable_weekdays": validweekdays
            })
        
        # TEMPORARY FIX: Remove DTE field to match stable-base payload format
        # TODO: Properly implement DTE backend integration (Story TV-004 Phase 2)
        # stgyParaa.update({
        #     "dte": int(frontendStgyParameters['DTE'])
        # })
        
        if frontendStgyParameters['StrategyTrailingType'] == 'trail profits':
            stgyParaa.update({
                "trailing_stop_loss": {
                    "profit_move": {
                        "type": "NUMBERTYPE.POINT","value": float(frontendStgyParameters['IncreaseInProfit'])
                    },
                    "stop_loss_move": {
                        "type": "NUMBERTYPE.POINT", "value": float(frontendStgyParameters['TrailMinProfitBy'])
                    }
                },
                "lock_and_trail": {
                    "lock": float(frontendStgyParameters['IncreaseInProfit']), "trail": float(frontendStgyParameters['TrailMinProfitBy'])
                }
            })

        elif frontendStgyParameters['StrategyTrailingType'] == 'lock minimum profit':
            stgyParaa.update({
                "lock_and_trail": {
                    "lock": float(frontendStgyParameters['ProfitReaches']), "trail": float(frontendStgyParameters['LockMinProfitAt'])
                }
            })

        elif frontendStgyParameters['StrategyTrailingType'] == 'lock & trail profits':
            stgyParaa.update({
                "trailing_stop_loss": {
                    "profit_move": {
                        "type": "NUMBERTYPE.POINT","value": float(frontendStgyParameters['IncreaseInProfit'])
                    },
                    "stop_loss_move": {
                        "type": "NUMBERTYPE.POINT", "value": float(frontendStgyParameters['TrailMinProfitBy'])
                    }
                },
                "lock_and_trail": {
                    "lock": float(frontendStgyParameters['ProfitReaches']), "trail": float(frontendStgyParameters['LockMinProfitAt'])
                }
            })
        
        if frontendStgyParameters['StrategyType'] in ["VWAP", "HEIKIN_RSI_EMA", "HEIKIN_RSI_ST", "5_EMA", "INDICATOR"]:

            if frontendStgyParameters['StrategyType'] in ["HEIKIN_RSI_EMA", "HEIKIN_RSI_ST", "5_EMA"]:
                stgyParaa['entry_time'] += (checkfreq * int(frontendStgyParameters['Timeframe']))
            
            if frontendStgyParameters['StrategyType'] in ["HEIKIN_RSI_EMA", "HEIKIN_RSI_ST"]:
                frontendStgyParameters.update({"ChangeStrikeForIndicatorBasedReEntry": "NO"})

            entryIndicators, exitIndicators = {}, {}
            noOfEntryIndicators, noofExitIndicators = 0, 0

            if frontendStgyParameters['StrategyType'] == "HEIKIN_RSI_EMA":
                entryIndicators.update({
                    "in1": {
                        "name": "ema", "condition": "ema > close", "length": int(frontendStgyParameters.get('EMAPeriod'))
                    },
                    "op1": "and",
                    "in2": {
                        "name": "rsi", "condition": frontendStgyParameters['RsiEntryCondition'], "length": int(frontendStgyParameters.get('RsiPeriod'))
                    }
                })

                exitIndicators.update({
                    "in1": {
                        "name": "ema", "condition": "ema < close", "length": int(frontendStgyParameters.get('EMAPeriod'))
                    }
                })

            elif frontendStgyParameters['StrategyType'] == "HEIKIN_RSI_ST":
                entryIndicators.update({
                    "in1": {
                        "name": "rsi", "condition": frontendStgyParameters['RsiEntryCondition'], "length": int(frontendStgyParameters.get('RsiPeriod'))
                    },
                    "op1": "and",
                    "in2": {
                        "name": "st", "condition": "st > close", "length": int(frontendStgyParameters['ST1_Period']), 
                        "multiplier": float(frontendStgyParameters['ST1_Multiplier'])
                    },
                    "op2": "and",
                    "in3": {
                        "name": "st", "condition": "st > close", "length": int(frontendStgyParameters['ST2_Period']), 
                        "multiplier": float(frontendStgyParameters['ST2_Multiplier'])
                    }
                })

                exitIndicators.update({
                    "in1": {
                        "name": "st", "condition": "st < close", "length": int(frontendStgyParameters['ST1_Period']), 
                        "multiplier": float(frontendStgyParameters['ST1_Multiplier'])
                    },
                    "op1": "or",
                    "in2": {
                        "name": "st", "condition": "st < close", "length": int(frontendStgyParameters['ST2_Period']), 
                        "multiplier": float(frontendStgyParameters['ST2_Multiplier'])
                    }
                })
            
            elif frontendStgyParameters['StrategyType'] == "5_EMA":

                entryIndicators.update({
                    "in1": {
                        "name": "ema", "condition": "ema < low", "length": int(frontendStgyParameters.get('EMAPeriod'))
                    }
                })
            
            if frontendStgyParameters.get('ConsiderVwapForEntry', "NO") == "YES":

                noOfEntryIndicators += 1

                entryIndicators.update({
                    f"in{noOfEntryIndicators}": {
                        "name": "vwap", "condition": frontendStgyParameters['VwapEntryCondition']
                    },
                    f"op{noOfEntryIndicators}": frontendStgyParameters['EntryCombination']
                })
            
            if frontendStgyParameters.get('ConsiderVwapForExit', "NO") == "YES":
                
                noofExitIndicators += 1

                exitIndicators.update({
                    f"in{noofExitIndicators}": {
                        "name": "vwap", "condition": frontendStgyParameters['VwapExitCondition']
                    },
                    f"op{noofExitIndicators}": frontendStgyParameters['ExitCombination']
                })
            
            if frontendStgyParameters.get('ConsiderEMAForEntry', "NO") == "YES":
                
                noOfEntryIndicators += 1

                entryIndicators.update({
                    f"in{noOfEntryIndicators}": {
                        "name": "ema", "condition": frontendStgyParameters['EmaEntryCondition'], "length": int(frontendStgyParameters.get('EMAPeriod'))
                    },
                    f"op{noOfEntryIndicators}": frontendStgyParameters['EntryCombination']
                })
            
            if frontendStgyParameters.get('ConsiderEMAForExit', "NO") == "YES":
                
                noofExitIndicators += 1

                exitIndicators.update({
                    f"in{noofExitIndicators}": {
                        "name": "ema", "condition": frontendStgyParameters['EmaExitCondition'], "length": int(frontendStgyParameters.get('EMAPeriod'))
                    },
                    f"op{noofExitIndicators}": frontendStgyParameters['ExitCombination']
                })
            
            if frontendStgyParameters.get('ConsiderSTForEntry', "NO") == "YES":

                noOfEntryIndicators += 1

                entryIndicators.update({
                    f"in{noOfEntryIndicators}": {
                        "name": "st", "condition": frontendStgyParameters['StEntryCondition'], "length": int(frontendStgyParameters['STPeriod']), 
                        "multiplier": float(frontendStgyParameters['STMultiplier'])
                    },
                    f"op{noOfEntryIndicators}": frontendStgyParameters['EntryCombination']
                })
            
            if frontendStgyParameters.get('ConsiderSTForExit', "NO") == "YES":
                
                noofExitIndicators += 1

                exitIndicators.update({
                    f"in{noofExitIndicators}": {
                        "name": "st", "condition": frontendStgyParameters['StExitCondition'], "length": int(frontendStgyParameters['STPeriod']), 
                        "multiplier": float(frontendStgyParameters['STMultiplier'])
                    },
                    f"op{noofExitIndicators}": frontendStgyParameters['ExitCombination']
                })
            
            if frontendStgyParameters.get('ConsiderRSIForEntry', "NO") == "YES":
                
                noOfEntryIndicators += 1

                entryIndicators.update({
                    f"in{noOfEntryIndicators}": {
                        "name": "rsi", "condition": frontendStgyParameters['RsiEntryCondition'], "length": int(frontendStgyParameters.get('RsiPeriod'))
                    },
                    f"op{noOfEntryIndicators}": frontendStgyParameters['EntryCombination']
                })
            
            if frontendStgyParameters.get('ConsiderRSIForExit', "NO") == "YES":
                
                noofExitIndicators += 1

                exitIndicators.update({
                    f"in{noofExitIndicators}": {
                        "name": "rsi", "condition": frontendStgyParameters['RsiExitCondition'], "length": int(frontendStgyParameters.get('RsiPeriod'))
                    },
                    f"op{noofExitIndicators}": frontendStgyParameters['ExitCombination']
                })
                            
            if frontendStgyParameters.get('ConsiderVolSmaForEntry', "NO") == "YES":

                noOfEntryIndicators += 1

                entryIndicators.update({
                    f"in{noOfEntryIndicators}": {
                        "name": "vol_sma", "condition": frontendStgyParameters['VolSmaEntryCondition'], "length": int(frontendStgyParameters['VolSMAPeriod'])
                    },
                    f"op{noOfEntryIndicators}": frontendStgyParameters['EntryCombination']
                })
            
            if frontendStgyParameters.get('ConsiderVolSmaForExit', "NO") == "YES":
                
                noofExitIndicators += 1

                exitIndicators.update({
                    f"in{noofExitIndicators}": {
                        "name": "vol_sma", "condition": frontendStgyParameters['VolSmaExitCondition'], "length": int(frontendStgyParameters['VolSMAPeriod'])
                    },
                    f"op{noofExitIndicators}": frontendStgyParameters['ExitCombination']
                })
                            
            stgyParaa.update({
                "checking_interval": checkfreq * int(frontendStgyParameters['Timeframe']),
                "entry_indicators": entryIndicators, 
                "exit_indicators": exitIndicators,
                "indicator_based_reentry": {
                    "type": "REENTRYTYPE.IMMIDIATE", 
                    "value": {
                        "count": int(frontendStgyParameters['IndicatorBasedReEntry']), 
                        "cutoff_time": Util.getSeconds(timesting=exitTime), 
                        "check_frequency": checkfreq, 
                        "cool_off_time": checkfreq
                    }
                }
            })

            # TV-007 evidence overrides for explicit INDICATOR validation
            if str(os.environ.get('TV007_INDICATOR_EVIDENCE', '0')).strip().lower() in {'1','true','yes','on'}:
                try:
                    # Force INDICATOR PnL calculation, EMA-only exits, OR aggregation, disable SL/TP, full-day times, 1-min timeframe
                    stgyParaa['pnl_calculation_from'] = 'INDICATOR'
                    # Rebuild exit indicators: EMA-only
                    ema_len = int(frontendStgyParameters.get('EMAPeriod', 20))
                    stgyParaa['exit_indicators'] = {
                        'in1': { 'name': 'ema', 'condition': frontendStgyParameters.get('EmaExitCondition', 'ema > close'), 'length': ema_len },
                    }
                    stgyParaa['checking_interval'] = checkfreq * 1
                    # Times 09:30:00 to 15:25:00
                    stgyParaa['place_order_after'] = Util.getSeconds(timesting='093000')
                    stgyParaa['entry_time'] = Util.getSeconds(timesting='093000')
                    stgyParaa['exit_time'] = Util.getSeconds(timesting='152500')
                    # Zero SL/TP
                    stgyParaa['stop_loss']['value'] = 0
                    stgyParaa['take_profit']['value'] = 0
                except Exception as _e:
                    logging.info(f"TV007_INDICATOR_EVIDENCE overrides skipped due to error: {_e}")

            if frontendStgyParameters['StrategyType'] == "5_EMA":
                rr = frontendStgyParameters['RiskReward'].strip().split(":")
                stgyParaa.update({
                    "rr": f"({float(rr[0])}, {float(rr[1])})", 
                    "entry_buffer": frontendStgyParameters['EntryBuffer'], 
                    "stoploss_buffer": frontendStgyParameters['StoplossBuffer'],
                })
        
        if frontendStgyParameters['StrategyType'] in ["VWAP", "HEIKIN_RSI_EMA", "HEIKIN_RSI_ST", "5_EMA"]:

            [
                leginfo.update({
                    "refresh_contract_on_reentry": "True" if frontendStgyParameters['ChangeStrikeForIndicatorBasedReEntry'] == "YES" else "False"
                }) for leginfo in parsedLegInfo
            ]
        
        if frontendStgyParameters['StrategyType'] == "OI":
            stgyParaa.update({
                'concurrent_legs': frontendStgyParameters['MaxOpenPositions']
            })
            
        stgyParaa.update({"legs": parsedLegInfo})
        
        return stgyParaa
                
    @staticmethod
    def getStategyJson(isTickBt: bool, btType: str, excelFilePath: str, strategyNamePrefix: str, tvSignalInfoo: dict, portfolioMultiplier: float) -> list:
        """This function is used to generate json file required for running strategy"""

        isTvBasedPortfolio = len(tvSignalInfoo) != 0

        stgysParaForBt = []

        userStgyParameters = pd.read_excel(excelFilePath, sheet_name="GeneralParameter")
        # Restrict to NIFTY only for TV-007 evidence when requested
        if str(os.environ.get('TV007_INDICATOR_EVIDENCE', '0')).strip().lower() in {'1','true','yes','on'}:
            if 'Index' in userStgyParameters.columns:
                userStgyParameters = userStgyParameters[userStgyParameters['Index'].astype(str).str.upper() == 'NIFTY']
        userLegParameters = pd.read_excel(excelFilePath, sheet_name="LegParameter")
        if isTvBasedPortfolio:
            userLegParameters['Lots'] = tvSignalInfoo['lots']

        for fieldName in Util.FIELDS_TO_MULTIPLY_BY_PORTFOLIO_MULTIPLIER["GeneralParameter"]:
            userStgyParameters[fieldName] *= portfolioMultiplier
        
        for fieldName in Util.FIELDS_TO_MULTIPLY_BY_PORTFOLIO_MULTIPLIER["LegParameter"]:
            userLegParameters[fieldName] *= portfolioMultiplier
            if fieldName not in ["Lots"]:
                continue

            userLegParameters[fieldName] = userLegParameters[fieldName].astype(int)

        userStgyParameters = userStgyParameters[~pd.isnull(userStgyParameters['StrategyName'])]

        for __col in userStgyParameters: # formating frontend input

            if __col in Util.STGY_STR_PARA_COLUMN_NAME_LOWER:
                userStgyParameters[__col] = userStgyParameters[__col].str.lower()
            
            if __col in Util.STGY_STR_PARA_COLUMN_NAME_UPPER:
                userStgyParameters[__col] = userStgyParameters[__col].str.upper()
        
        if isTvBasedPortfolio:

            timeCols = ['StrikeSelectionTime', 'StartTime', 'LastEntryTime', 'EndTime']
            for tcol in timeCols:
                if tcol not in userStgyParameters.columns:
                    continue
                userStgyParameters[tcol] = tvSignalInfoo['entrytime'] if tcol in ['StrikeSelectionTime', 'StartTime'] else tvSignalInfoo['exittime']

        userLegParameters = userLegParameters[~pd.isnull(userLegParameters['Instrument'])]
        for colNames in Util.LEG_STR_PARA_COLUMN_NAME:
            if colNames not in userLegParameters.columns:
                continue
            userLegParameters[colNames] = userLegParameters[colNames].astype(str).str.upper()
        
        for colName in Util.LEG_IDS_COLUMN_NAME:
            if colName not in userLegParameters.columns:
                continue
            userLegParameters[colName] = userLegParameters[colName].apply(Util.getFormattedId)
        
        for __, stgyParameters in userStgyParameters.iterrows():

            stgyParameters = dict(stgyParameters)

            if any(pd.isnull(ii) for ii in stgyParameters.values()):
                logging.info(f"Empty fields found for {stgyParameters['StrategyName']} strategy. Hence, will not backtest.")
                continue

            legParameters = userLegParameters[userLegParameters['StrategyName'] == stgyParameters['StrategyName']]
            if legParameters.empty:
                logging.info(f"Unable to get leg parameters for {stgyParameters['StrategyName']} strategy. Hence, will not backtest.")
                continue

            if legParameters.shape[0] != legParameters.drop_duplicates(subset=['LegID']).shape[0]:
                logging.info(f"LegID should be unique for all legs in {stgyParameters['StrategyName']} strategy. Hence, will not backtest.")
                continue

            if stgyParameters['ReEntryCheckingInterval'] < 1:
                logging.info("ReEntryCheckingInterval cann't be less than 1. Hence, will not backtest.")
                continue

            if stgyParameters['StoplossCheckingInterval'] < 1:
                logging.info("StoplossCheckingInterval cann't be less than 1. Hence, will not backtest.")
                continue

            if stgyParameters['TargetCheckingInterval'] < 1:
                logging.info("TargetCheckingInterval cann't be less than 1. Hence, will not backtest.")
                continue
                
            # Include Trade ID in strategy name for TV-based portfolios to enable proper signal price mapping
            if isTvBasedPortfolio and 'tradeno' in tvSignalInfoo:
                trade_id = tvSignalInfoo['tradeno']
                base_strategy_name = stgyParameters['StrategyName']
                if len(strategyNamePrefix) == 0:
                    strategy_name = f"{base_strategy_name}_T{trade_id}"
                else:
                    strategy_name = f"{strategyNamePrefix}_{base_strategy_name}_T{trade_id}"
            else:
                strategy_name = stgyParameters['StrategyName'] if len(strategyNamePrefix) == 0 else f"{strategyNamePrefix}_{stgyParameters['StrategyName']}"
            
            stgyParameters.update({
                "StrategyName": strategy_name, 
                "evaluator": Util.USER_BT_TYPE_ENGINE_MAPPING[btType.upper()], "StrategyType": btType.upper(), 
                "ExpiryDayExitTime": tvSignalInfoo['ExpiryDayExitTime'] if isTvBasedPortfolio else stgyParameters['EndTime'], "isTickBt": isTickBt
            })

            legsInfo = Util.getLegJson(isTickBt=isTickBt, legExcelDf=legParameters, stgyParameters=stgyParameters, isRolloverTrade=tvSignalInfoo.get('isrollovertrade', False))
            if len(legsInfo) == 0:
                continue

            stgyParaa = Util.getBackendStrategyJson(isTickBt=isTickBt, frontendStgyParameters=stgyParameters.copy(), parsedLegInfo=legsInfo)
            if not stgyParaa:
                continue
            
            if isTvBasedPortfolio:
                # Bound the strategy to the specific TV signal window
                stgyParaa.update({"entry_date": tvSignalInfoo['entrydate'], "exit_date": tvSignalInfoo['exitdate']})
                # Pass signal entry price for DB Entry functionality if available
                if 'entry_price' in tvSignalInfoo:
                    stgyParaa.update({"signal_entry_price": tvSignalInfoo['entry_price']})
                    logging.info(f"Strategy {stgyParaa.get('name', 'N/A')}: Added signal_entry_price={tvSignalInfoo['entry_price']} to backend payload")
                # Pass signal exit price for DB Exit functionality if available
                if 'exit_price' in tvSignalInfoo:
                    stgyParaa.update({"signal_exit_price": tvSignalInfoo['exit_price']})
                    logging.info(f"Strategy {stgyParaa.get('name', 'N/A')}: Added signal_exit_price={tvSignalInfoo['exit_price']} to backend payload")
                # For TBS strategies, backend expects explicit signals array for processing
                if btType.upper() == "TBS":
                    try:
                        _sig_entrydate = int(tvSignalInfoo['entrydate'])
                        _sig_exitdate = int(tvSignalInfoo['exitdate'])
                        _sig_entrytime = str(tvSignalInfoo['entrytime'])
                        _sig_exittime = str(tvSignalInfoo['exittime'])
                        _sig_lots = int(tvSignalInfoo.get('lots', 1))
                        _sig_type = (strategyNamePrefix or "").lower() or tvSignalInfoo.get('type', '').lower()
                        # TEMPORARY FIX: Remove signals array to match stable-base payload format  
                        # TODO: Properly implement signals backend integration (Story TV-004 Phase 2)
                        # stgyParaa.update({
                        #     "signals": [{
                        #         "entrydate": _sig_entrydate,
                        #         "entrytime": _sig_entrytime,
                        #         "exitdate": _sig_exitdate,
                        #         "exittime": _sig_exittime,
                        #         "lots": _sig_lots,
                        #         "type": _sig_type
                        #     }]
                        # })
                    except Exception:
                        # If any signal field is malformed, skip adding signals to avoid backend errors
                        pass
            
            stgysParaForBt.append(stgyParaa)

        return stgysParaForBt

    @staticmethod
    def getBacktestStats(tradesDf: pd.DataFrame, initialCapital: float):
        """This function is used to prepare backtesting stats"""
        
        number_of_trading_days_in_a_year = 252
        risk_free_interest_rate = 5

        intraday_trade_log = tradesDf[["entryDate", "bookedPnL"]].rename(columns={"entryDate": "Date", "bookedPnL": "PNL"})
        intraday_trade_log['Day'] = intraday_trade_log['Date'].apply(lambda x: x.strftime("%A"))
        intraday_trade_log['Month'] = intraday_trade_log['Date'].apply(lambda x: x.strftime("%b"))
        intraday_trade_log = intraday_trade_log[["Date", "Day", "Month", "PNL"]]

        monthly_df = intraday_trade_log.groupby(by=["Month"], as_index=False).sum(numeric_only=True)
        monthly_df.rename(columns={"bookedPnL":"PNL"}, inplace=True)
        
        # Convert PNL data to tensor
        pnl_tensor = Util.to_tensor(intraday_trade_log['PNL'].values)
        
        # Initialize tensors for equity and rate of return calculations
        equity_tensor = torch.zeros_like(pnl_tensor)
        rate_of_return_tensor = torch.zeros_like(pnl_tensor)
        
        # Calculate equity and rate of return using tensor operations
        equity_tensor[0] = initialCapital + pnl_tensor[0]
        rate_of_return_tensor[0] = (pnl_tensor[0]/initialCapital) * 100
        
        for i in range(1, len(pnl_tensor)):
            equity_tensor[i] = equity_tensor[i-1] + pnl_tensor[i]
            rate_of_return_tensor[i] = (pnl_tensor[i]/equity_tensor[i-1]) * 100
            
        # Convert results back to DataFrame columns
        intraday_trade_log['Equity'] = Util.from_tensor(equity_tensor)
        intraday_trade_log['Rate_of_Return'] = Util.from_tensor(rate_of_return_tensor)
        intraday_trade_log['Continuous_Wins'] = 0.0
        intraday_trade_log['Continuous_Losses'] = 0.0

        # Calculate win rate using tensor operations
        positive_pnl_mask = pnl_tensor > 0
        win_rate = torch.sum(positive_pnl_mask).item() / len(pnl_tensor)

        # Calculate mean win/loss using tensor operations
        mean_win = torch.mean(pnl_tensor[positive_pnl_mask]).item()
        mean_loss = torch.mean(pnl_tensor[~positive_pnl_mask]).item()
        risk_reward = abs(mean_win/mean_loss) if mean_loss != 0 else float('inf')
        expectancy = (win_rate*risk_reward) - ((1-win_rate)*1)
        
        # Calculate Sharpe and Sortino ratios using tensor operations
        mean = torch.mean(rate_of_return_tensor).item() * number_of_trading_days_in_a_year - risk_free_interest_rate
        sigma = torch.std(rate_of_return_tensor).item() * torch.sqrt(torch.tensor(number_of_trading_days_in_a_year)).item()
        sharpe_ratio = mean/sigma if sigma != 0 else 0
        
        negative_returns_mask = rate_of_return_tensor < 0
        downside_standard_deviation = torch.std(rate_of_return_tensor[negative_returns_mask]).item() * torch.sqrt(torch.tensor(number_of_trading_days_in_a_year)).item()
        sortino_ratio = mean/downside_standard_deviation if downside_standard_deviation != 0 else 0
        
        # Calculate drawdown using tensor operations
        cummax_pnl = torch.cummax(pnl_tensor, dim=0)[0]
        drawdown_tensor = pnl_tensor - cummax_pnl
        max_drawdown = torch.min(drawdown_tensor).item()
        
        max_drawdown_idx = torch.argmin(drawdown_tensor).item()
        max_drawdown_percent = max_drawdown/equity_tensor[max_drawdown_idx]*100

        # Calculate recovery days
        recovery_tensor = torch.zeros_like(drawdown_tensor)
        for i in range(1, len(drawdown_tensor)):
            if drawdown_tensor[i] < 0:
                recovery_tensor[i] = recovery_tensor[i-1] + 1
                
        intraday_trade_log['Recovery'] = Util.from_tensor(recovery_tensor)
        
        intraday_trade_log_equity_high = intraday_trade_log[intraday_trade_log['Recovery'] == 0]
        intraday_trade_log_equity_high['number_days_between_equity_highs'] = (intraday_trade_log_equity_high['Date'] - intraday_trade_log_equity_high['Date'].shift())
        recover = intraday_trade_log_equity_high['number_days_between_equity_highs'].apply(lambda x: x.days if not pd.isnull(x) else None).max()
        recovery_days = np.nan if pd.isnull(recover) else int(recover)
        
        # Calculate CAGR using tensor operations
        number_of_trading_days_for_this_backtest = (intraday_trade_log.iloc[-1]['Date'] - intraday_trade_log.iloc[0]['Date']).days
        if number_of_trading_days_for_this_backtest != 0:
            cagr = (((equity_tensor[-1]/initialCapital)**(1/(number_of_trading_days_for_this_backtest/365)))-1)*100
            cagr = cagr.item()
        else:
            cagr = 0
            
        calmar_ratio = 0 if max_drawdown_percent == 0 else abs(cagr/max_drawdown_percent)
        
        # Calculate trade statistics using tensor operations
        number_of_wins = torch.sum(positive_pnl_mask).item()
        number_of_losses = len(pnl_tensor) - number_of_wins
        average_profit_per_trade = torch.mean(pnl_tensor[positive_pnl_mask]).item()
        average_loss_per_trade = torch.mean(pnl_tensor[~positive_pnl_mask]).item()
        max_pnl = torch.max(pnl_tensor).item()
        min_pnl = torch.min(pnl_tensor).item()
        median_of_trade = torch.median(pnl_tensor).item()
        
        gross_profit = torch.sum(pnl_tensor[positive_pnl_mask]).item()
        gross_loss = torch.sum(pnl_tensor[~positive_pnl_mask]).item()
        
        if gross_loss != 0:
            profit_factor = abs(gross_profit/gross_loss)
            outlier_adjusted_profit_factor = abs((gross_profit-max_pnl)/gross_loss)
        else:
            profit_factor = 0.0
            outlier_adjusted_profit_factor = 0.0

        # Calculate continuous wins/losses
        for i in range(1, len(pnl_tensor)):
            if pnl_tensor[i-1] > 0:
                intraday_trade_log['Continuous_Wins'].iloc[i] = intraday_trade_log['Continuous_Wins'].iloc[i-1]+1
            if pnl_tensor[i-1] < 0:
                intraday_trade_log['Continuous_Losses'].iloc[i] = intraday_trade_log['Continuous_Losses'].iloc[i-1]+1

        consecutive_wins = intraday_trade_log['Continuous_Wins'].max()
        consecutive_losses = intraday_trade_log['Continuous_Losses'].max()

        metrics = {
            'Backtest Start Date': intraday_trade_log.iloc[0]['Date'], 
            'Backtest End Date': intraday_trade_log.iloc[-1]['Date'], 
            "Margin Required": initialCapital,
            'Number of Trading Days': intraday_trade_log.shape[0], 
            'Number of +ve days': number_of_wins, 
            'Number of -ve days': number_of_losses, 
            'Total PnL': round(float(Util.from_tensor(torch.sum(pnl_tensor))), 2),
            'Average Profit': round(float(average_profit_per_trade), 2),
            'Average Loss': round(average_loss_per_trade, 2),
            'Maximum Trade Profit': round(max_pnl, 2),
            'Maximum Trade Loss': round(min_pnl, 2),
            'Median Trade': round(median_of_trade, 2),
            'Consecutive Wins': consecutive_wins, 
            'Consecutive Losses': consecutive_losses, 
            'Win Rate': round(float(win_rate), 2),
            'Expectancy': round(float(expectancy), 2),
            'Sharpe Ratio': round(float(sharpe_ratio), 2),
            'Sortino Ratio': round(float(sortino_ratio), 2),
            'Calmar': round(float(calmar_ratio), 2),
            'CAGR': round(float(cagr), 2),
            'Max Drawdown': round(float(max_drawdown), 2),
            'Max Drawdown Percent': round(float(max_drawdown_percent), 2),
            'Days Taken to Recover From Drawdown': recovery_days, 
            'Profit Factor (Amount of Profit per unit of Loss)': round(profit_factor,2),
            'Outlier Adjusted Profit Factor': round(outlier_adjusted_profit_factor,2)
        }

        return metrics

    @staticmethod
    def getDayWiseStats(tradesDf: pd.DataFrame) -> pd.DataFrame:
        
        intraday_trade_log = tradesDf[["entryDate", "bookedPnL"]].copy()
        intraday_trade_log = intraday_trade_log.rename(columns={"entryDate": "Date", "bookedPnL": "PNL"})
        intraday_trade_log['year'] = intraday_trade_log['Date'].apply(lambda x: x.year)
        intraday_trade_log['day'] = intraday_trade_log['Date'].apply(lambda x: x.strftime("%A"))
        intraday_trade_log = intraday_trade_log.groupby(by=['year', 'day'], as_index=False).sum(numeric_only=True)

        years = sorted(intraday_trade_log['year'].unique())
        finalResult = []

        for yr in years:

            yrDf = intraday_trade_log[intraday_trade_log['year'] == yr]
            yrBifurcation = {"Year": yr}

            for dy in config.VALID_TRADING_WEEKDAYS:
                dyDf = yrDf[yrDf['day'] == dy]
                yrBifurcation[dy] = dyDf['PNL'].iloc[0] if not dyDf.empty else 0
            
            finalResult.append(yrBifurcation)

        finalResult = pd.DataFrame(finalResult)

        totalRecord = pd.DataFrame(finalResult.sum()).transpose()
        totalRecord['Year'] = 'Total'
        
        finalResult = pd.concat([finalResult, totalRecord])
        finalResult = finalResult.reset_index(drop=True)
        finalResult['Total'] = finalResult.drop(columns=['Year']).sum(axis=1)

        return finalResult

    @staticmethod
    def getMonthWiseStats(tradesDf: pd.DataFrame) -> pd.DataFrame:
        
        intraday_trade_log = tradesDf[["entryDate", "bookedPnL"]].copy()
        intraday_trade_log = intraday_trade_log.rename(columns={"entryDate": "Date", "bookedPnL": "PNL"})
        intraday_trade_log['year'] = intraday_trade_log['Date'].apply(lambda x: x.year)
        intraday_trade_log['month'] = intraday_trade_log['Date'].apply(lambda x: x.strftime("%B"))
        intraday_trade_log = intraday_trade_log.groupby(by=['year', 'month'], as_index=False).sum(numeric_only=True)

        years = sorted(intraday_trade_log['year'].unique())
        finalResult = []

        for yr in years:

            yrDf = intraday_trade_log[intraday_trade_log['year'] == yr]
            yrBifurcation = {"Year": yr}

            for mn in config.VALID_MONTHS:
                dyDf = yrDf[yrDf['month'] == mn]
                yrBifurcation[mn] = dyDf['PNL'].iloc[0] if not dyDf.empty else 0
            
            finalResult.append(yrBifurcation)

        finalResult = pd.DataFrame(finalResult)

        totalRecord = pd.DataFrame(finalResult.sum()).transpose()
        totalRecord['Year'] = 'Total'
        
        finalResult = pd.concat([finalResult, totalRecord])
        finalResult = finalResult.reset_index(drop=True)
        finalResult['Total'] = finalResult.drop(columns=['Year']).sum(axis=1)

        return finalResult

    @staticmethod
    def getBacktestResults(btPara: dict) -> dict:

        startTime = datetime.now()
        logging.info(f"{startTime}, Backtesting Portfolio: {btPara['portfolio']['id']}")

        urii = config.BT_URII['tick'] if btPara['istickbt'] else config.BT_URII['minute']
        
        # Add debug logging
        logging.debug(f"Backend URL: {urii}")
        logging.debug(f"Portfolio name: {btPara.get('portfolio', {}).get('name', 'N/A')}")
        
        try:
            # PHASE 1: DB Exit fields included in payload but backend integration pending
            # Fields are sent but backend doesn't implement logic yet (no behavior change)
            btPara_processed = dict(btPara)
            
            # Ensure DB Exit fields are present with safe defaults
            if 'use_db_exit_timing' not in btPara_processed:
                btPara_processed['use_db_exit_timing'] = False
            if 'exit_search_interval' not in btPara_processed:
                btPara_processed['exit_search_interval'] = 5
            if 'exit_price_source' not in btPara_processed:
                btPara_processed['exit_price_source'] = 'SPOT'
            
            # Debug: Log original btPara before processing
            print(f"UTIL DEBUG: Original btPara use_db_entry_timing = {btPara.get('use_db_entry_timing', 'NOT_PRESENT')}")
            
            # Ensure DB Entry fields are present with safe defaults - ONLY set defaults if not present
            if 'use_db_entry_timing' not in btPara_processed:
                print(f"UTIL DEBUG: use_db_entry_timing not in btPara_processed, setting to False as default")
                btPara_processed['use_db_entry_timing'] = False
            else:
                print(f"UTIL DEBUG: use_db_entry_timing found in btPara_processed = {btPara_processed['use_db_entry_timing']}")
            if 'entry_search_interval' not in btPara_processed:
                btPara_processed['entry_search_interval'] = 5
            if 'entry_price_source' not in btPara_processed:
                btPara_processed['entry_price_source'] = 'SPOT'
            
            print(f"UTIL DEBUG: DB Exit fields in payload: use_db_exit_timing={btPara_processed['use_db_exit_timing']}, "
                         f"exit_search_interval={btPara_processed['exit_search_interval']}, "
                         f"exit_price_source={btPara_processed['exit_price_source']}")
                         
            print(f"UTIL DEBUG: Final DB Entry fields in payload: use_db_entry_timing={btPara_processed['use_db_entry_timing']}, "
                         f"entry_search_interval={btPara_processed['entry_search_interval']}, "
                         f"entry_price_source={btPara_processed['entry_price_source']}")
            
            btResp = requests.post(urii, json=btPara_processed, timeout=30)
            
            # Check response status
            if btResp.status_code != 200:
                logging.error(f"Backend returned status {btResp.status_code}")
                logging.error(f"Response: {btResp.text[:500]}")
                respp = {}
            else:
                respp = btResp.json() or {}
                # Always retain response structure, even if orders are empty,
                # so Excel generation can proceed with metrics and empty Trans sheets.
                strategies = respp.get('strategies', {})
                orders_list = strategies.get('orders', []) if isinstance(strategies, dict) else []

                # Normalize orders into records (attach portfolio_name) if present
                try:
                    if isinstance(orders_list, list) and len(orders_list) > 0:
                        orders_df = pd.DataFrame(orders_list)
                        orders_df['portfolio_name'] = btPara['portfolio']['name']
                        strategies['orders'] = orders_df.to_dict('records')
                        respp['strategies'] = strategies
                        logging.info(f"Backend returned {len(strategies['orders'])} orders")
                    else:
                        logging.info("Backend response has zero orders; proceeding to write empty Trans sheets if needed")
                except Exception as norm_ex:
                    logging.warning(f"Could not normalize backend orders: {norm_ex}")

        except requests.exceptions.Timeout:
            logging.error(f"Backend request timed out after 30 seconds")
            respp = {}
        except Exception as e:
            logging.error(f"Error while running BT: {str(e)}")
            respp = {}
        
        endTime = datetime.now()
        durationn = round((endTime-startTime).total_seconds(),2)
        logging.info(f"{endTime}, Completed backtesting portfolio: {btPara['portfolio']['id']}, Time taken: {durationn} \n")
        
        return respp
    
    @staticmethod
    def getMarginFor(position: list) -> float:

        for ii in range(1,3):

            try:

                r1 = requests.post(
                    url="https://margin-calc-arom-prod.angelbroking.com/margin-calculator/SPAN", headers=Util.MARGIN_REQ_HEADERS, json={"position": position}
                )
                if r1.status_code != 200:
                    logging.error(f"Unable to fetch margin, received following response: {r1.text}, {position}")
                    time.sleep(1)
                    continue

                resp = r1.json()['margin']
                return resp['netPremium'] if resp['totalMargin'] == 0 else resp['totalMargin']

            except Exception:
                logging.error(traceback.format_exc())
                time.sleep(ii)
        
        return 0
    
    @staticmethod
    def parseBacktestingResponse(btResponse: dict, slippagePercent: float) -> tuple:
        
        if len(btResponse['orders']) == 0:
            return pd.DataFrame(), {}, pd.DataFrame()
        
        orderdf = pd.DataFrame(btResponse['orders'])
        if orderdf.empty:
            return pd.DataFrame(), {}, pd.DataFrame()

        orderdf = orderdf.rename(columns={
            "entry_time": "entry_datetime", "exit_time": "exit_datetime", "option_type": "instrument_type", "qty": "filled_quantity", 
            "entry_number": "re_entry_no", "strategy_name": "strategy", "original_tv_exit_time": "original_tv_exit"
        })

        # Precision timing post-fix (client-side correction):
        # If precision mode is enabled, force next-bar OPEN for both entry and time-exit pricing
        # to counteract any backend that still returns same-bar fills.
        try:
            import os as _os
            import mysql.connector as _mysql
            try:
                import config as _AppConfig
                _freq = int(getattr(_AppConfig, 'BT_FREQUENCY', 60))
            except Exception:
                _AppConfig = None
                _freq = int(_os.environ.get('BT_FREQUENCY', _os.environ.get('BTFREQUENCY', '60')))

            _precision_mode = (int(_os.environ.get('DB_EXECUTE_AT_DETECTION', '0')) == 1) or (_os.environ.get('DB_EXECUTION_PRICE','OPEN').upper() == 'CLOSE')
            if _precision_mode and not orderdf.empty:
                # Build a small cache for option opens to minimize DB hits
                _cache = {}
                def _yyMMdd(d):
                    return int(pd.to_datetime(d).strftime('%y%m%d'))
                def _sec_of_day(dt):
                    t = pd.to_datetime(dt)
                    return t.hour*3600 + t.minute*60 + t.second
                def _tbl(sym, inst):
                    return f"{str(sym).lower()}_call" if str(inst).upper().startswith('C') else f"{str(sym).lower()}_put"
                def _fetch_open(sym, inst, date_i, time_i, expiry_i, strike_i):
                    key = (sym, inst, date_i, time_i, expiry_i, strike_i)
                    if key in _cache:
                        return _cache[key]
                    q = ("SELECT open FROM " + _tbl(sym, inst) +
                         " WHERE date=%s AND time=%s AND expiry=%s AND strike=%s LIMIT 1")
                    _cur.execute(q, (date_i, time_i, expiry_i, int(strike_i)))
                    r = _cur.fetchall()
                    val = None
                    if r:
                        val = float(r[0][0]) / 100.0
                    _cache[key] = val
                    return val

                # Open DB connection once
                if _AppConfig:
                    _conn = _mysql.connect(host=_AppConfig.MYSQL_HOST, user=_AppConfig.MYSQL_USER, password=_AppConfig.MYSQL_PASSWORD, database=_AppConfig.MYSQL_DATABASE)
                else:
                    _conn = _mysql.connect(host=_os.environ.get('MYSQL_HOST','106.51.63.60'), user=_os.environ.get('MYSQL_USER','mahesh'), password=_os.environ.get('MYSQL_PASSWORD','mahesh_123'), database=_os.environ.get('MYSQL_DATABASE','historicaldb'))
                _cur = _conn.cursor()

                # Iterate orders and correct prices to next-minute OPEN
                for idx, row in orderdf.iterrows():
                    try:
                        sym = row.get('symbol')
                        inst = row.get('instrument_type')
                        strike = row.get('strike')
                        expiry_dt = row.get('expiry')  # already date()
                        if pd.isna(sym) or pd.isna(inst) or pd.isna(strike) or pd.isna(expiry_dt):
                            continue
                        expiry_i = int(pd.to_datetime(expiry_dt).strftime('%y%m%d'))
                        # Entry correction
                        et = row.get('entry_datetime')
                        if pd.notna(et):
                            date_i = _yyMMdd(pd.to_datetime(et).date())
                            detect_ts = _sec_of_day(et)
                            exec_ts = detect_ts + _freq
                            next_open = _fetch_open(sym, inst, date_i, exec_ts, expiry_i, strike)
                            if next_open is not None:
                                orderdf.at[idx, 'entry_price'] = next_open
                        # Exit correction (only for time-exit to be conservative)
                        rsn = str(row.get('reason',''))
                        xt = row.get('exit_datetime')
                        if pd.notna(xt) and 'Exit Time Hit' in rsn:
                            date_i = _yyMMdd(pd.to_datetime(xt).date())
                            detect_ts = _sec_of_day(xt)
                            exec_ts = detect_ts + _freq
                            next_open = _fetch_open(sym, inst, date_i, exec_ts, expiry_i, strike)
                            if next_open is not None:
                                orderdf.at[idx, 'exit_price'] = next_open
                    except Exception:
                        continue
                try:
                    _cur.close(); _conn.close()
                except Exception:
                    pass
                try:
                    import logging as _logging
                    _logging.info(f"[PRECISION_FIX] Response correction applied (parse): freq={_freq}")
                except Exception:
                    pass
        except Exception:
            # Non-fatal: if DB unavailable or any issue, keep backend values
            pass

        orderdf['entry_price_slippage'] = np.where(
            orderdf['side'] == "SELL", orderdf['entry_price'] * (1 - slippagePercent), orderdf['entry_price'] * (1 + slippagePercent)
        )

        orderdf['exit_price_slippage'] = np.where(
            orderdf['side'] == "SELL", orderdf['exit_price'] * (1 + slippagePercent), orderdf['exit_price'] * (1 - slippagePercent)
        )

        # Persist slippage percent per row so later Excel-stage recomputation can reuse it
        orderdf['slippage_percent'] = float(slippagePercent)

        orderdf['pointsAfterSlippage'] = np.where(
            orderdf['side'] == "SELL", orderdf['entry_price_slippage'] - orderdf['exit_price_slippage'], orderdf['exit_price_slippage'] - orderdf['entry_price_slippage']
        )
        orderdf['pnlAfterSlippage'] = orderdf['pointsAfterSlippage'] * orderdf['filled_quantity']

        orderdf['points'] = np.where(
            orderdf['side'] == "SELL", orderdf['entry_price'] - orderdf['exit_price'], orderdf['exit_price'] - orderdf['entry_price']
        )
        
        if config.TAXES != 0:
            orderdf['expenses'] = orderdf['entry_price_slippage'] + orderdf['exit_price_slippage']
            orderdf['expenses'] *= orderdf['filled_quantity']
            orderdf['expenses'] *= config.TAXES
        else:
            orderdf['expenses'] = 0
        
        orderdf['netPnlAfterExpenses'] = orderdf['pnlAfterSlippage'] - orderdf['expenses']

        for columnName in ["entry", "exit"]:

            orderdf[f'{columnName}_datetime'] = pd.to_datetime(orderdf[f'{columnName}_datetime'], format="%a, %d %b %Y %H:%M:%S GMT")

            orderdf[f'{columnName}_date'] = orderdf[f'{columnName}_datetime'].dt.date
            orderdf[f'{columnName}_time'] = orderdf[f'{columnName}_datetime'].dt.time
            orderdf[f'{columnName}_day'] = orderdf[f'{columnName}_datetime'].dt.strftime("%A")
        
        orderdf['expiry'] = orderdf['expiry'].apply(lambda x: datetime.strptime(str(int(x)), "%y%m%d"))
        orderdf['expiry'] = orderdf['expiry'].dt.date
        orderdf['strike'] = orderdf['strike'].astype(float).astype(int)

        # Secondary precision correction using derived entry/exit times
        try:
            import os as _os
            from app.config import Config as _AppConfig
            import mysql.connector as _mysql
            _precision_mode = (int(_os.environ.get('DB_EXECUTE_AT_DETECTION', '0')) == 1) or (_os.environ.get('DB_EXECUTION_PRICE','OPEN').upper() == 'CLOSE')
            if _precision_mode and not orderdf.empty:
                _conn = _mysql.connect(host=_AppConfig.MYSQL_HOST, user=_AppConfig.MYSQL_USER, password=_AppConfig.MYSQL_PASSWORD, database=_AppConfig.MYSQL_DATABASE)
                _cur = _conn.cursor()
                _cache = {}
                def _tbl(sym, inst):
                    return f"{str(sym).lower()}_call" if str(inst).upper().startswith('C') else f"{str(inst).lower()}" if '_' in str(inst) else f"{str(sym).lower()}_put"
                def _fetch(sym, inst, date_i, ts, expiry_i, strike_i):
                    key=(sym,inst,date_i,ts,expiry_i,strike_i)
                    if key in _cache: return _cache[key]
                    table = f"{str(sym).lower()}_call" if str(inst).upper().startswith('C') else f"{str(sym).lower()}_put"
                    _cur.execute(f"SELECT open FROM {table} WHERE date=%s AND time=%s AND expiry=%s AND strike=%s LIMIT 1", (date_i, ts, expiry_i, int(strike_i)))
                    r=_cur.fetchall(); val=None
                    if r: val = float(r[0][0])/100.0
                    _cache[key]=val; return val
                _e,_x=0,0
                for idx,row in orderdf.iterrows():
                    try:
                        sym=row.get('symbol'); inst=row.get('instrument_type'); strike=row.get('strike'); expiry=row.get('expiry')
                        if pd.isna(sym) or pd.isna(inst) or pd.isna(strike) or pd.isna(expiry):
                            continue
                        date_i = int(pd.to_datetime(row['entry_date']).strftime('%y%m%d'))
                        t=row['entry_time']; ts = t.hour*3600+t.minute*60+t.second
                        next_ts = ts + _AppConfig.BT_FREQUENCY
                        nx = _fetch(sym,inst,date_i,next_ts,int(pd.to_datetime(expiry).strftime('%y%m%d')),strike)
                        if nx is not None:
                            orderdf.at[idx,'entry_price']=nx; _e+=1
                        # Exit time-based only
                        rsn = str(row.get('reason',''))
                        if 'Exit Time Hit' in rsn:
                            date_ex = int(pd.to_datetime(row['exit_date']).strftime('%y%m%d'))
                            t2 = row['exit_time']; ts2 = t2.hour*3600+t2.minute*60+t2.second
                            next_ts2 = ts2 + _AppConfig.BT_FREQUENCY
                            nx2 = _fetch(sym,inst,date_ex,next_ts2,int(pd.to_datetime(expiry).strftime('%y%m%d')),strike)
                            if nx2 is not None:
                                orderdf.at[idx,'exit_price']=nx2; _x+=1
                    except Exception:
                        continue
                try:
                    _cur.close(); _conn.close()
                except Exception:
                    pass
                try:
                    import logging as _logging
                    _logging.info(f"[PRECISION_FIX] Adjusted next-bar OPEN prices (phase2): entries={_e}, exits={_x}")
                except Exception:
                    pass
        except Exception:
            pass

        marginDf = orderdf[['strategy', 'leg_id', 'entry_datetime', 'filled_quantity', 'symbol', 'strike', 'instrument_type', 'side']]
        marginDf['entry_date'] = marginDf['entry_datetime'].dt.date
        marginDf = marginDf.sort_values(by=['entry_date'], ascending=False)
        marginDf = marginDf.drop_duplicates(subset=['strategy', 'leg_id'])

        stgyTransactionRecord = {}
        uniqueStgys = marginDf['strategy'].unique()

        for stgyName in uniqueStgys:
            stgyTransactionRecord[stgyName] = []
            stgyDf = marginDf[(marginDf['strategy'] == stgyName)]

            for info in stgyDf.itertuples():

                contractInfo = Util.MARGIN_INFO.get(info.symbol)
                if contractInfo is None:
                    continue

                contractInfo = contractInfo[0]

                stgyTransactionRecord[stgyName].append({
                    "contract": contractInfo['contract'], "exchange": contractInfo['exchange'], "product": "OPTION", "qty": info.filled_quantity, 
                    "strikePrice": info.strike, "tradeType": info.side.upper(), "optionType": info.instrument_type.upper()
                })
            
            if len(stgyTransactionRecord[stgyName]) == 0:
                del stgyTransactionRecord[stgyName]
        
        marginReqForEachStgy = {stgyName: Util.getMarginFor(position=stgyTransactionRecord[stgyName]) for stgyName in stgyTransactionRecord}
        tickpnldf = Util.convertTickPnlDictToDaywiseDf(toConvert=btResponse)

        return orderdf, marginReqForEachStgy, tickpnldf

    @staticmethod
    def convertTickPnlDictToDaywiseDf(toConvert: dict) -> pd.DataFrame:
        
        daymaxprofitloss = {}
        for __tradingdate in toConvert['strategy_profits']:
            
            daymaxprofitloss[__tradingdate] = {"max_profit": 0, "max_profit_time": 0, "max_loss": 0, "max_loss_time": 0}

            for __tradingtime in toConvert['strategy_profits'][__tradingdate]:

                if toConvert['strategy_profits'][__tradingdate][__tradingtime] <= 0:
                    continue

                if toConvert['strategy_profits'][__tradingdate][__tradingtime] > daymaxprofitloss[__tradingdate]['max_profit']:
                    daymaxprofitloss[__tradingdate].update({"max_profit": toConvert['strategy_profits'][__tradingdate][__tradingtime], "max_profit_time": __tradingtime})
                
            for __tradingtime in toConvert['strategy_losses'][__tradingdate]:

                if toConvert['strategy_losses'][__tradingdate][__tradingtime] >= 0:
                    continue

                if abs(toConvert['strategy_losses'][__tradingdate][__tradingtime]) > abs(daymaxprofitloss[__tradingdate]["max_loss"]):
                    daymaxprofitloss[__tradingdate].update({
                        "max_loss": toConvert['strategy_losses'][__tradingdate][__tradingtime],
                        "max_loss_time": __tradingtime
                    })

        daymaxprofitloss = pd.DataFrame.from_dict(daymaxprofitloss, orient="index").reset_index().rename(columns={
            "index": "Date", "max_profit": "Max Profit", "max_loss": "Max Loss", "max_profit_time": "Max Profit Time", "max_loss_time": "Max Loss Time"
        })
        if not daymaxprofitloss.empty:
            daymaxprofitloss['Date'] = daymaxprofitloss['Date'].apply(lambda x: datetime.strptime(str(int(x)), "%y%m%d").date())

            for tt in ['Max Profit Time', 'Max Loss Time']:
                daymaxprofitloss[tt] = daymaxprofitloss[tt].apply(lambda x: "" if x == 0 else (datetime(2021,1,1)+timedelta(seconds=int(x))).strftime("%H:%M:%S"))
        
        return daymaxprofitloss
    
    @staticmethod
    def getRecordsForOutputJson(responseDict: dict) -> list:

        toReturn = []
        
        for __key in responseDict:

            __df = responseDict[__key].copy()
            __df.columns = [__i.lower() for __i in __df.columns]

            if "year" in __df.columns:
                __df = __df[__df['year'] != "Total"]
                __df['strategy'] = __key
                toReturn += __df.to_dict("records")
        
        return toReturn
    
    @staticmethod
    def prepareOutputJson(btResultFile: str, btStatsTableData: pd.DataFrame, stgywiseTransactionDf: dict, stgyDayWiseStats: dict, stgyMonthWiseStats: dict, stgyMarginPercentageWiseStats: dict) -> None:

        __metricStats = btStatsTableData.copy()
        __metricStats['Particulars'] = __metricStats['Particulars'].apply(lambda x: Util.METRICS_KEY_NAME[x])
        __metricStats.columns = [__t.lower() for __t in __metricStats.columns]
        __metricStats = __metricStats.rename(columns={"particulars": "strategy"})
        __metricStats = __metricStats.set_index("strategy").transpose()
        for __dtCol in ["backteststartdate", "backtestenddate"]:
            __metricStats[__dtCol] = __metricStats[__dtCol].apply(lambda x : x.strftime("%y%m%d"))
        
        __metricStats = __metricStats.to_dict("index")

        __metrics = []
        for __stgy in __metricStats:
            __toappend = __metricStats[__stgy].copy()
            __toappend.update({"strategy": __stgy})
            __metrics.append(__toappend)
        
        transDf = stgywiseTransactionDf['portfolio'][Util.COLUMN_ORDER].copy()
        transDf["expiry"] = transDf["expiry"].apply(lambda x: x.strftime("%y%m%d"))

        for __tradeType in ["entry", "exit"]:
            transDf[f'{__tradeType}_date'] = transDf[f'{__tradeType}_date'].apply(lambda x: x.strftime("%y%m%d"))
            transDf[f'{__tradeType}_time'] = transDf[f'{__tradeType}_time'].apply(lambda x: x.strftime("%H%M%S"))

        outputJson = {
            "metrics": __metrics, "transactions": transDf.to_dict("records"), 
            "daywisestats": Util.getRecordsForOutputJson(responseDict=stgyDayWiseStats), 
            "monthwisestats": Util.getRecordsForOutputJson(responseDict=stgyMonthWiseStats), 
            "marginpercentwisestats": Util.getRecordsForOutputJson(responseDict=stgyMarginPercentageWiseStats)
        }

        with open(btResultFile, "+w") as ff:
            ff.write(simplejson.dumps(outputJson, ignore_nan=True, indent=4))

    @staticmethod
    def prepareOutputFile(btResultFile: str, btStatsTableData: pd.DataFrame, stgywiseTransactionDf: dict, stgyDayWiseStats: dict, stgyMonthWiseStats: dict, stgyMarginPercentageWiseStats: dict, onlyStgyResults: bool, excelFileExists: bool, dailyMaxProfitLossDf: pd.DataFrame, initialCapital: float = 0.0) -> None:
        """Prepare output using modular or legacy pipeline based on feature flag."""
        if False:  # is_feature_enabled('use_modular_output') - disabled since btrun module not available
            from btrun.output.generators import prepare_backtest_output_file
            return prepare_backtest_output_file(
                bt_result_file=btResultFile,
                stats_table=btStatsTableData,
                strategy_transactions=stgywiseTransactionDf,
                strategy_day_stats=stgyDayWiseStats,
                strategy_month_stats=stgyMonthWiseStats,
                strategy_margin_stats=stgyMarginPercentageWiseStats,
                only_strategy_results=onlyStgyResults,
                excel_file_exists=excelFileExists,
                daily_max_profit_loss=dailyMaxProfitLossDf,
                initial_capital=initialCapital,
            )
        return Util._prepare_output_file_legacy(
            btResultFile,
            btStatsTableData,
            stgywiseTransactionDf,
            stgyDayWiseStats,
            stgyMonthWiseStats,
            stgyMarginPercentageWiseStats,
            onlyStgyResults,
            excelFileExists,
            dailyMaxProfitLossDf,
            initialCapital=initialCapital,
        )

    @staticmethod
    def _prepare_output_file_legacy(btResultFile: str, btStatsTableData: pd.DataFrame, stgywiseTransactionDf: dict, stgyDayWiseStats: dict, stgyMonthWiseStats: dict, stgyMarginPercentageWiseStats: dict, onlyStgyResults: bool, excelFileExists: bool, dailyMaxProfitLossDf: pd.DataFrame, initialCapital: float = 0.0) -> None:

        startTime = datetime.now()
        logging.info(f"{startTime}, Started writing stats to excel file.")

        if excelFileExists:
            excelObjj = pd.ExcelWriter(btResultFile, engine='openpyxl', mode="a", if_sheet_exists="overlay")
        else:
            excelObjj = pd.ExcelWriter(btResultFile, engine='openpyxl', mode="w")
        
        colOrder = Util.COLUMN_ORDER.copy()
        
        with excelObjj as writer: 

            # Defer writing Metrics and daily extremes until after we compute corrections
            raw_metrics_df = btStatsTableData.copy()
            daily_max_df = dailyMaxProfitLossDf.copy()

            # Buffers to control sheet ordering
            corrected_portfolio_df = None
            portfolio_day_df, portfolio_month_df, portfolio_margin_df = None, None, None
            strategy_results = {}  # stgy -> (day_df, month_df, margin_df)
            queued_strategy_trans = {}
            for stgyName in stgywiseTransactionDf:

                transactionDf = stgywiseTransactionDf[stgyName].copy()
                if transactionDf.empty:
                    continue

                # Carry slippage percent (for recompute later) if present
                _slip_series = transactionDf['slippage_percent'] if 'slippage_percent' in transactionDf.columns else None

                # Select only columns that exist to avoid KeyError when optional columns are absent
                # Use a per-sheet column order to avoid modifying shared colOrder
                order_to_use = [c for c in Util.COLUMN_ORDER if c in transactionDf.columns]
                transactionDf = transactionDf[order_to_use].rename(columns=Util.COLUMN_RENAME_MAPPING)

                # Final-stage precision correction (Excel view) — enforce next-bar OPEN in precision mode
                try:
                    import os as _os
                    import mysql.connector as _mysql
                    try:
                        from app.config import Config as _AppConfig
                        _freqE = int(getattr(_AppConfig, 'BT_FREQUENCY', 60))
                        _db_host, _db_user, _db_pass, _db_name = _AppConfig.MYSQL_HOST, _AppConfig.MYSQL_USER, _AppConfig.MYSQL_PASSWORD, _AppConfig.MYSQL_DATABASE
                    except Exception:
                        _AppConfig = None
                        _freqE = int(_os.environ.get('BT_FREQUENCY', _os.environ.get('BTFREQUENCY', '60')))
                        _db_host, _db_user, _db_pass, _db_name = (
                            _os.environ.get('MYSQL_HOST','106.51.63.60'),
                            _os.environ.get('MYSQL_USER','mahesh'),
                            _os.environ.get('MYSQL_PASSWORD','mahesh_123'),
                            _os.environ.get('MYSQL_DATABASE','historicaldb'),
                        )
                    _precision_mode = (int(_os.environ.get('DB_EXECUTE_AT_DETECTION', '0')) == 1) or (_os.environ.get('DB_EXECUTION_PRICE','OPEN').upper() == 'CLOSE')
                    if _precision_mode and not transactionDf.empty:
                        _conn = _mysql.connect(host=_db_host, user=_db_user, password=_db_pass, database=_db_name)
                        _cur = _conn.cursor()
                        _cache = {}
                        def _fetch_open(sym, is_call, date_i, ts, expiry_i, strike_i):
                            key=(sym,is_call,date_i,ts,expiry_i,strike_i)
                            if key in _cache: return _cache[key]
                            table = f"{str(sym).lower()}_call" if is_call else f"{str(sym).lower()}_put"
                            _cur.execute(f"SELECT open FROM {table} WHERE date=%s AND time=%s AND expiry=%s AND strike=%s LIMIT 1", (date_i, ts, expiry_i, int(strike_i)))
                            r=_cur.fetchall(); val=None
                            if r: val=float(r[0][0])/100.0
                            _cache[key]=val; return val
                        _e,_x=0,0
                        for ridx, r in transactionDf.iterrows():
                            try:
                                sym = r.get('Index'); strike=r.get('Strike'); inst=r.get('CE/PE'); exp=r.get('Expiry');
                                if pd.isna(sym) or pd.isna(strike) or pd.isna(inst) or pd.isna(exp):
                                    continue
                                is_call = str(inst).upper().startswith('C')
                                # Entry
                                edate = pd.to_datetime(r.get('Entry Date')).strftime('%y%m%d')
                                etime = str(r.get('Enter On'))
                                if etime:
                                    h,m,s = [int(x) for x in etime.split(':')]
                                    ts = h*3600+m*60+s
                                    nxt = ts + _freqE
                                    nx = _fetch_open(sym,is_call,int(edate),nxt,int(pd.to_datetime(exp).strftime('%y%m%d')),int(strike))
                                    if nx is not None:
                                        transactionDf.at[ridx,'Entry at']=nx; _e+=1
                                # Exit (time-exit only)
                                reason = str(r.get('Reason',''))
                                if 'Exit Time Hit' in reason:
                                    exdate = pd.to_datetime(r.get('Exit Date')).strftime('%y%m%d')
                                    extime = str(r.get('Exit On'))
                                    if extime:
                                        hh,mm,ss = [int(x) for x in extime.split(':')]
                                        ts2 = hh*3600+mm*60+ss
                                        nxt2 = ts2 + _freqE
                                        nx2 = _fetch_open(sym,is_call,int(exdate),nxt2,int(pd.to_datetime(exp).strftime('%y%m%d')),int(strike))
                                        if nx2 is not None:
                                            transactionDf.at[ridx,'Exit at']=nx2; _x+=1
                            except Exception:
                                continue
                        try:
                            _cur.close(); _conn.close()
                        except Exception:
                            pass
                        # After correcting Entry/Exit prices, recompute Points and PNL based on displayed values
                        try:
                            # Recompute per-trade Points from displayed prices
                            def _recalc_points(row):
                                try:
                                    ent = float(row.get('Entry at', 0))
                                    ext = float(row.get('Exit at', 0))
                                    side = str(row.get('Trade', '')).strip().upper()
                                    pts = (ent - ext) if side == 'SELL' else (ext - ent)
                                    return round(pts, 2)
                                except Exception:
                                    return row.get('Points', 0)
                            transactionDf['Points'] = transactionDf.apply(_recalc_points, axis=1)

                            # Recompute Points After Slippage, AfterSlippage (PNL after slippage), Taxes, Net PNL
                            def _calc_with_slip(row):
                                try:
                                    ent = float(row.get('Entry at', 0))
                                    ext = float(row.get('Exit at', 0))
                                    side = str(row.get('Trade', '')).strip().upper()
                                    qty = float(row.get('Qty', 0))
                                    s = 0.0
                                    if _slip_series is not None and row.name in _slip_series.index:
                                        try:
                                            s = float(_slip_series.loc[row.name])
                                        except Exception:
                                            s = 0.0
                                    # Slippage-adjusted price legs
                                    if side == 'SELL':
                                        ent_s = ent * (1 - s)
                                        ext_s = ext * (1 + s)
                                        pts_after = round(ent_s - ext_s, 2)
                                    else:
                                        ent_s = ent * (1 + s)
                                        ext_s = ext * (1 - s)
                                        pts_after = round(ext_s - ent_s, 2)
                                    pnl_after = pts_after * qty
                                    taxes = (ent_s + ext_s) * qty * config.TAXES if config.TAXES != 0 else 0
                                    net_pnl = pnl_after - taxes
                                    return pts_after, pnl_after, taxes, net_pnl
                                except Exception:
                                    return row.get('Points After Slippage', 0), row.get('AfterSlippage', 0), row.get('Taxes', 0), row.get('Net PNL', 0)

                            vals = transactionDf.apply(_calc_with_slip, axis=1, result_type='expand')
                            transactionDf['Points After Slippage'] = vals[0]
                            transactionDf['AfterSlippage'] = vals[1]
                            transactionDf['Taxes'] = vals[2]
                            transactionDf['Net PNL'] = vals[3]

                            # Recompute plain PNL as Points * Qty for consistency
                            if 'Qty' in transactionDf.columns:
                                transactionDf['PNL'] = transactionDf['Points'] * transactionDf['Qty']
                        except Exception as _pex:
                            logging.warning(f"[PRECISION_FIX] Points/PNL/slippage recompute skipped: {_pex}")
                        logging.info(f"[PRECISION_FIX] Excel correction applied: entries={_e}, exits={_x}, freq={_freqE}")
                except Exception as _ex:
                    logging.warning(f"[PRECISION_FIX] Excel correction skipped: {_ex}")

                # Compute slippage-adjusted MaxProfit/MaxLoss (new columns) based on per-row slippage and displayed prices
                try:
                    def _max_adj(row):
                        try:
                            ent = float(row.get('Entry at', 0))
                            qty = float(row.get('Qty', 0))
                            side = str(row.get('Trade', '')).strip().upper()
                            s = 0.0
                            if _slip_series is not None and row.name in _slip_series.index:
                                try:
                                    s = float(_slip_series.loc[row.name])
                                except Exception:
                                    s = 0.0
                            mp = float(row.get('MaxProfit', 0))
                            ml = float(row.get('MaxLoss', 0))
                            # Derive extreme prices from points = value/qty
                            best_pts = mp/qty if qty else 0.0
                            worst_pts = ml/qty if qty else 0.0
                            if side == 'SELL':
                                ext_best = ent - best_pts
                                ext_worst = ent + worst_pts
                                ent_s = ent*(1 - s)
                                ext_best_s = ext_best*(1 + s)
                                ext_worst_s = ext_worst*(1 + s)
                                mp_adj = (ent_s - ext_best_s)*qty
                                ml_adj = (ext_worst_s - ent_s)*qty
                            else:
                                ext_best = ent + best_pts
                                ext_worst = ent - worst_pts
                                ent_s = ent*(1 + s)
                                ext_best_s = ext_best*(1 - s)
                                ext_worst_s = ext_worst*(1 - s)
                                mp_adj = (ext_best_s - ent_s)*qty
                                ml_adj = (ent_s - ext_worst_s)*qty
                            return round(mp_adj, 2), round(ml_adj, 2)
                        except Exception:
                            return row.get('MaxProfit', 0), row.get('MaxLoss', 0)
                    max_vals = transactionDf.apply(_max_adj, axis=1, result_type='expand')
                    transactionDf['MaxProfitAdj'] = max_vals[0]
                    transactionDf['MaxLossAdj'] = max_vals[1]
                except Exception as _e:
                    logging.warning(f"[PRECISION_FIX] MaxProfit/MaxLoss slippage-adj skipped: {_e}")

                # Recompute Day/Month wise stats from corrected Net PNL
                try:
                    corrected_trades = pd.DataFrame({
                        'entryDate': pd.to_datetime(transactionDf['Entry Date']).dt.date,
                        'bookedPnL': transactionDf['Net PNL']
                    })
                    corrected_day = Util.getDayWiseStats(tradesDf=corrected_trades)
                    corrected_month = Util.getMonthWiseStats(tradesDf=corrected_trades)
                except Exception:
                    # Fallback to provided stats if recomputation fails
                    corrected_day = stgyDayWiseStats[stgyName]
                    corrected_month = stgyMonthWiseStats[stgyName]

                # Buffer results to control final sheet order (write PORTFOLIO Results with summaries later)
                if stgyName == 'portfolio':
                    portfolio_day_df = corrected_day.copy()
                    portfolio_month_df = corrected_month.copy()
                    portfolio_margin_df = stgyMarginPercentageWiseStats[stgyName].copy()
                else:
                    strategy_results[stgyName] = (
                        corrected_day.copy(),
                        corrected_month.copy(),
                        stgyMarginPercentageWiseStats[stgyName].copy()
                    )

                # Capture corrected transaction for later writing to control sheet order
                if stgyName == 'portfolio':
                    corrected_portfolio_df = transactionDf.copy()
                else:
                    # For non-portfolio strategies, queue them to write as a final group
                    queued_strategy_trans[stgyName] = transactionDf.copy()

                if not onlyStgyResults: # only portfolio stats required
                    break

            # 1) Write PORTFOLIO Results first among summaries
            try:
                if portfolio_day_df is not None and portfolio_month_df is not None and portfolio_margin_df is not None:
                    portfolio_day_df.to_excel(writer, sheet_name=f"PORTFOLIO Results", index=False, startrow=0)
                    portfolio_month_df.to_excel(writer, sheet_name=f"PORTFOLIO Results", index=False, startrow=portfolio_day_df.shape[0] + 3)
                    portfolio_margin_df.to_excel(writer, sheet_name=f"PORTFOLIO Results", index=False, startrow=portfolio_day_df.shape[0] + portfolio_month_df.shape[0] + 6)
            except Exception as _pr_ex:
                logging.warning(f"[PRECISION_FIX] Failed writing PORTFOLIO Results in summary group: {_pr_ex}")

            # Overwrite Metrics with corrected day-wise Net PNL from corrected portfolio if available
            wrote_metrics = False
            try:
                if corrected_portfolio_df is not None:
                    portfolio_pnl = corrected_portfolio_df[['Entry Date','Net PNL']].copy()
                    portfolio_pnl.columns = ['entryDate','bookedPnL']
                    # Ensure entryDate is datetime.date
                    portfolio_pnl['entryDate'] = pd.to_datetime(portfolio_pnl['entryDate']).dt.date
                    corrected_metrics = Util.getBacktestStats(tradesDf=portfolio_pnl, initialCapital=initialCapital)
                    corrected_metrics.to_excel(writer, sheet_name="Metrics", index=False)
                    wrote_metrics = True
            except Exception as _mex:
                logging.warning(f"[PRECISION_FIX] Metrics recompute skipped: {_mex}")
            if not wrote_metrics:
                try:
                    raw_metrics_df.to_excel(writer, sheet_name="Metrics", index=False)
                    wrote_metrics = True
                except Exception as _m2:
                    logging.warning(f"[PRECISION_FIX] Metrics fallback write failed: {_m2}")

            # Add MaxProfitAdj/MaxLossAdj to "Max Profit and Loss" sheet using per-trade adjusted extremes
            try:
                # Ensure date columns are comparable
                if not daily_max_df.empty:
                    daily_max_df = daily_max_df.copy()
                    if not np.issubdtype(daily_max_df['Date'].dtype, np.datetime64):
                        # ensure python date or datetime
                        daily_max_df['Date'] = pd.to_datetime(daily_max_df['Date']).dt.date

                if corrected_portfolio_df is not None and not corrected_portfolio_df.empty:
                    port_df = corrected_portfolio_df.copy()
                    # Guard: if adjusted columns are not present for any reason, compute them
                    if ('MaxProfitAdj' not in port_df.columns) or ('MaxLossAdj' not in port_df.columns):
                        _slip_series = port_df['slippage_percent'] if 'slippage_percent' in port_df.columns else None
                        def _max_adj(row):
                            try:
                                ent = float(row.get('Entry at', 0))
                                qty = float(row.get('Qty', 0))
                                side = str(row.get('Trade', '')).strip().upper()
                                s = 0.0
                                if _slip_series is not None and row.name in _slip_series.index:
                                    try:
                                        s = float(_slip_series.loc[row.name])
                                    except Exception:
                                        s = 0.0
                                mp = float(row.get('MaxProfit', 0))
                                ml = float(row.get('MaxLoss', 0))
                                best_pts = mp/qty if qty else 0.0
                                worst_pts = ml/qty if qty else 0.0
                                if side == 'SELL':
                                    ext_best = ent - best_pts
                                    ext_worst = ent + worst_pts
                                    ent_s = ent*(1 - s)
                                    ext_best_s = ext_best*(1 + s)
                                    ext_worst_s = ext_worst*(1 + s)
                                    mp_adj = (ent_s - ext_best_s)*qty
                                    ml_adj = (ext_worst_s - ent_s)*qty
                                else:
                                    ext_best = ent + best_pts
                                    ext_worst = ent - worst_pts
                                    ent_s = ent*(1 + s)
                                    ext_best_s = ext_best*(1 - s)
                                    ext_worst_s = ext_worst*(1 - s)
                                    mp_adj = (ext_best_s - ent_s)*qty
                                    ml_adj = (ent_s - ext_worst_s)*qty
                                return round(mp_adj, 2), round(ml_adj, 2)
                            except Exception:
                                return row.get('MaxProfit', 0), row.get('MaxLoss', 0)
                        max_vals = port_df.apply(_max_adj, axis=1, result_type='expand')
                        port_df['MaxProfitAdj'] = max_vals[0]
                        port_df['MaxLossAdj'] = max_vals[1]

                    # Aggregate per day to derive adjustment scale factors
                    port_df['Entry Date'] = pd.to_datetime(port_df['Entry Date']).dt.date
                    agg = port_df.groupby('Entry Date').agg({
                        'MaxProfit': 'sum', 'MaxProfitAdj': 'sum',
                        'MaxLoss': 'sum', 'MaxLossAdj': 'sum'
                    }).reset_index().rename(columns={'Entry Date': 'Date'})

                    # Merge and compute adjusted daily extremes via ratio method
                    if not daily_max_df.empty:
                        merged = daily_max_df.merge(agg, on='Date', how='left')
                        # Profit ratio (fallback 1 where denom is 0 or NaN)
                        profit_ratio = np.where(
                            (merged['Max Profit'].notna()) & (merged['Max Profit'] != 0),
                            np.where(merged['MaxProfit'].fillna(0) != 0,
                                     (merged['MaxProfitAdj'].fillna(0) / merged['MaxProfit'].replace({0: np.nan})),
                                     1.0),
                            1.0
                        )
                        # Loss ratio uses magnitudes
                        loss_ratio = np.where(
                            (merged['Max Loss'].notna()) & (merged['Max Loss'] != 0),
                            np.where(merged['MaxLoss'].fillna(0) != 0,
                                     (merged['MaxLossAdj'].abs().fillna(0) / merged['MaxLoss'].abs().replace({0: np.nan})),
                                     1.0),
                            1.0
                        )
                        merged['MaxProfitAdj'] = np.round(merged['Max Profit'] * profit_ratio, 2)
                        merged['MaxLossAdj'] = -np.round(merged['Max Loss'].abs() * loss_ratio, 2)

                        # Retain original columns + adjusted in required order
                        cols = ['Date', 'Max Profit', 'MaxProfitAdj', 'Max Profit Time', 'Max Loss', 'MaxLossAdj', 'Max Loss Time']
                        daily_max_df = merged[cols]

                # Finally, write the updated sheet
                daily_max_df.to_excel(writer, sheet_name="Max Profit and Loss", index=False)
                logging.info("[PRECISION_FIX] Wrote Max Profit and Loss with adjusted columns (MaxProfitAdj/MaxLossAdj)")
            except Exception as _dmax_ex:
                # Fall back to original if any issue
                try:
                    dailyMaxProfitLossDf.to_excel(writer, sheet_name="Max Profit and Loss", index=False)
                except Exception:
                    pass
                logging.warning(f"[PRECISION_FIX] Skipped adjusted Max Profit/Loss computation: {_dmax_ex}")

            # 2) Write transactions in required order first: PORTFOLIO Trans
            try:
                if corrected_portfolio_df is not None:
                    corrected_portfolio_df.to_excel(writer, sheet_name="PORTFOLIO Trans", index=False)
            except Exception as _tw_ex:
                logging.warning(f"[PRECISION_FIX] Transaction sheet write ordering issue: {_tw_ex}")

            # 3) Finally, write strategy results (non-portfolio) before strategy trans group to keep trans last
            try:
                for _stgy, (_day, _month, _margin) in strategy_results.items():
                    sheet_nm = f"{_stgy.upper()} Results"
                    _day.to_excel(writer, sheet_name=sheet_nm, index=False, startrow=0)
                    _month.to_excel(writer, sheet_name=sheet_nm, index=False, startrow=_day.shape[0] + 3)
                    _margin.to_excel(writer, sheet_name=sheet_nm, index=False, startrow=_day.shape[0] + _month.shape[0] + 6)
            except Exception as _sr_ex:
                logging.warning(f"[PRECISION_FIX] Strategy Results write issue: {_sr_ex}")

            # 4) Finally, write strategy transactions (last group)
            try:
                for _stgy, _df in queued_strategy_trans.items():
                    _df.to_excel(writer, sheet_name=f"{_stgy.upper()} Trans", index=False)
            except Exception as _tw2_ex:
                logging.warning(f"[PRECISION_FIX] Strategy Trans sheet write ordering issue: {_tw2_ex}")

        endTime = datetime.now()
        durationn = round((endTime-startTime).total_seconds(),2)
        
        logging.info(f"{endTime}, Excel file prepared, Time taken: {durationn} \n")
