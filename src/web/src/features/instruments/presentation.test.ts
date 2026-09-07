import { describe, expect, it } from 'vitest';
import { chartRows, formatDate, formatPercent, toggleTicker } from './presentation';

const series = [
  {
    ticker: 'A',
    prices: [
      { date: '2026-01-01', price: 100 },
      { date: '2026-01-03', price: 120 },
    ],
  },
  {
    ticker: 'B',
    prices: [
      { date: '2026-01-02', price: 200 },
      { date: '2026-01-03', price: 180 },
    ],
  },
];

describe('comparison presentation', () => {
  it('joins by date and leaves missing observations as gaps', () => {
    expect(chartRows(series, 'price')).toEqual([
      { date: '2026-01-01', A: 100, B: null },
      { date: '2026-01-02', A: null, B: 200 },
      { date: '2026-01-03', A: 120, B: 180 },
    ]);
  });
  it('indexes each series from its own first observation without mutating API data', () => {
    expect(chartRows(series, 'indexed').at(-1)).toEqual({ date: '2026-01-03', A: 120, B: 90 });
    expect(series[1].prices[1].price).toBe(180);
  });
  it('enforces the three-instrument cap while allowing removal', () => {
    expect(toggleTicker(['A', 'B', 'C'], 'D')).toEqual(['A', 'B', 'C']);
    expect(toggleTicker(['A', 'B', 'C'], 'B')).toEqual(['A', 'C']);
    expect(toggleTicker(['A'], 'B')).toEqual(['A', 'B']);
  });
  it('formats dates consistently in a timezone behind UTC', () => {
    expect(formatDate('2026-06-23', true)).toBe('Jun 23, 2026');
  });
  it('makes missing statistics and percentage units unambiguous', () => {
    expect(formatPercent(8, true)).toBe('+8.00%');
    expect(formatPercent(-0.00001)).toBe('0.00%');
    expect(formatPercent(null)).toBe('—');
  });
});
