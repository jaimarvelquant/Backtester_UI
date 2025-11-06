export function roundTo(value: number | undefined | null, precision = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '0.00';
  }
  const factor = 10 ** precision;
  return (Math.round(value * factor) / factor).toFixed(precision);
}

export function formatCurrency(value: number | undefined | null, currency = 'INR'): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(0);
  }
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);
}

export function formatPercent(value: number | undefined | null, fractionDigits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '0%';
  }
  return `${value.toFixed(fractionDigits)}%`;
}
