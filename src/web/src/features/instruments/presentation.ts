import type { Prices } from './queries';

export type ChartMode = 'price' | 'indexed';
export const seriesColors = ['#0b8572', '#d47b32', '#7265b7'] as const;
export const MAX_SELECTION = 3;

export function toggleTicker(selected: string[], ticker: string): string[] {
  if (selected.includes(ticker)) return selected.filter((value) => value !== ticker);
  return selected.length < MAX_SELECTION ? [...selected, ticker] : selected;
}

// Join by observation date, never array position. Missing observations remain gaps.
export function chartRows(series: Prices[], mode: ChartMode) {
  const dates = new Map<string, Record<string, number | string | null>>();
  for (const instrument of series) {
    const base = instrument.prices[0]?.price;
    for (const point of instrument.prices) {
      const row = dates.get(point.date) ?? {
        date: point.date,
        ...Object.fromEntries(series.map((item) => [item.ticker, null])),
      };
      row[instrument.ticker] =
        mode === 'indexed' ? (base && base > 0 ? (point.price / base) * 100 : null) : point.price;
      dates.set(point.date, row);
    }
  }
  return [...dates.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

export function formatDate(date: string, includeYear = false) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    ...(includeYear ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}

export const formatNumber = (value: number) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    value,
  );

export function formatPercent(value: number | null | undefined, signed = false) {
  if (value == null) return '—';
  // Avoid displaying a negative zero after rounding a very small movement.
  const rounded = Math.round(value * 100) / 100 || 0;
  return `${signed && rounded > 0 ? '+' : ''}${formatNumber(rounded)}%`;
}
