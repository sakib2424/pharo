import { queryOptions, useQueries, useQuery } from '@tanstack/react-query';
import { getJson } from '../../api/client';
import type { components } from '../../api/schema';

export type PricePoint = components['schemas']['PricePoint'];
export type Prices = components['schemas']['PricesResponse'];
export type Statistics = components['schemas']['StatisticsResponse'];

export const instrumentOptions = queryOptions({
  queryKey: ['instruments'],
  queryFn: ({ signal }) => getJson<string[]>('/api/instruments', signal),
});
export const priceOptions = (ticker: string) =>
  queryOptions({
    queryKey: ['prices', ticker],
    queryFn: ({ signal }) => getJson<Prices>(`/api/prices/${encodeURIComponent(ticker)}`, signal),
  });
export const statisticsOptions = (ticker: string) =>
  queryOptions({
    queryKey: ['statistics', ticker],
    queryFn: ({ signal }) =>
      getJson<Statistics>(`/api/prices/${encodeURIComponent(ticker)}/stats`, signal),
  });

export function useInstruments() {
  return useQuery(instrumentOptions);
}

export function useSelectedInstruments(tickers: string[]) {
  const prices = useQueries({ queries: tickers.map(priceOptions) });
  const statistics = useQueries({ queries: tickers.map(statisticsOptions) });
  return tickers.map((ticker, index) => ({
    ticker,
    prices: prices[index],
    statistics: statistics[index],
  }));
}

export type SelectedInstrument = ReturnType<typeof useSelectedInstruments>[number];
