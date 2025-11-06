import { dateLongToString, dateLongToDisplay, timeLongToString } from '@utils/date';
import { roundTo } from '@utils/number';

const clone = <T,>(value: T): T => (typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)));

export function normalizePortfolio<T extends Record<string, any>>(portfolio: T): T {
  const copy = clone(portfolio);
  if (copy.startDate) copy.startDate = dateLongToString(copy.startDate);
  if (copy.endDate) copy.endDate = dateLongToString(copy.endDate);
  if (Array.isArray(copy.strategiesSetting)) {
    copy.strategiesSetting = copy.strategiesSetting.map((strategy: any) => {
      const strategyCopy = clone(strategy);
      if (Array.isArray(strategyCopy.legsSettings)) {
        strategyCopy.legsSettings = strategyCopy.legsSettings.map((leg: any) => {
          const legCopy = clone(leg);
          legCopy.entryTimeDisplay = timeLongToString(legCopy.entryTime);
          legCopy.exitTimeDisplay = timeLongToString(legCopy.exitTime);
          legCopy.entryDateDisplay = dateLongToString(legCopy.entryDate);
          legCopy.exitDateDisplay = dateLongToString(legCopy.exitDate);
          return legCopy;
        });
      }
      return strategyCopy;
    });
  }
  return copy;
}

export function normalizeTradingView<T extends Record<string, any>>(tv: T): T {
  const copy = clone(tv);
  if (copy.startdate) copy.startdate = dateLongToDisplay(copy.startdate);
  if (copy.enddate) copy.enddate = dateLongToDisplay(copy.enddate);
  if (Array.isArray(copy.tvsignals)) {
    copy.tvsignals = copy.tvsignals.map((signal: any) => {
      const signalCopy = clone(signal);
      if (signalCopy.datetime) {
        signalCopy.datetime = signalCopy.datetime.replace('T', ' ');
      }
      return signalCopy;
    });
  }
  return copy;
}

export function normalizePortfolioRunResponse<T extends Record<string, any>>(response: T): T {
  const copy = clone(response);

  if (Array.isArray(copy.transactions)) {
    copy.transactions = copy.transactions.map((item: any) => {
      const transaction = clone(item);
      transaction.entry_date = dateLongToDisplay(transaction.entry_date);
      transaction.exit_date = dateLongToDisplay(transaction.exit_date);
      transaction.entry_time = timeLongToString(transaction.entry_time);
      transaction.exit_time = timeLongToString(transaction.exit_time);
      transaction.expiry = dateLongToString(transaction.expiry);
      ['averageprofit', 'averageloss', 'maximumtradeprofit', 'maximumtradeloss', 'mediantrade', 'winrate', 'entry_price', 'exit_price', 'pnl', 'pnlAfterSlippage', 'points', 'pointsAfterSlippage', 'expenses', 'netPnlAfterExpenses', 'index_entry_price', 'index_exit_price', 'max_profit', 'max_loss'].forEach((field) => {
        if (transaction[field] !== undefined) {
          transaction[`${field}Format`] = roundTo(Number(transaction[field]));
        }
      });
      return transaction;
    });
  }

  const metricCollections: Array<{ key: string; footerKey: string }> = [
    { key: 'metrics', footerKey: 'metricsFooter' },
    { key: 'daywisestats', footerKey: 'daywisestatsFooter' },
    { key: 'monthwisestats', footerKey: 'monthwisestatsFooter' },
    { key: 'marginpercentwisestats', footerKey: 'marginpercentwisestatsFooter' }
  ];

  metricCollections.forEach(({ key, footerKey }) => {
    const list = copy[key];
    if (!Array.isArray(list)) return;
    copy[key] = [];
    copy[footerKey] = [];
    list.forEach((item: any) => {
      const metric = clone(item);
      if (metric.maxProfitDate) metric.maxProfitDate = dateLongToDisplay(metric.maxProfitDate);
      if (metric.minProfitDate) metric.minProfitDate = dateLongToDisplay(metric.minProfitDate);
      if (metric.backteststartdate) metric.backteststartdate = dateLongToDisplay(metric.backteststartdate);
      if (metric.backtestenddate) metric.backtestenddate = dateLongToDisplay(metric.backtestenddate);
      Object.keys(metric).forEach((keyName) => {
        if (typeof metric[keyName] === 'number') {
          metric[`${keyName}Format`] = roundTo(metric[keyName]);
        }
      });
      if (metric.strategy === 'combined') {
        copy[footerKey].push(metric);
      } else {
        copy[key].push(metric);
      }
    });
  });

  return copy;
}
