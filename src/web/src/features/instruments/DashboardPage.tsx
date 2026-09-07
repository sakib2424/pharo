import { lazy, Suspense, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowUpRight,
  ChartNoAxesCombined,
  ChevronDown,
  Database,
  Layers2,
  RotateCcw,
  X,
} from 'lucide-react';
import { RequestError } from '../../components/RequestError';
import { InstrumentPicker } from './InstrumentPicker';
import { StatisticsPanel } from './StatisticsPanel';
import { useInstruments, useSelectedInstruments } from './queries';
import { formatDate, formatNumber, seriesColors, toggleTicker } from './presentation';
import type { ChartMode } from './presentation';
import styles from './Dashboard.module.css';

const PriceChart = lazy(async () => ({ default: (await import('./PriceChart')).PriceChart }));

export function DashboardPage() {
  const queryClient = useQueryClient();
  const instruments = useInstruments();
  // null means the initial default; [] means the user deliberately cleared selection.
  const [selection, setSelection] = useState<string[] | null>(null);
  const selected = selection ?? instruments.data?.slice(0, 1) ?? [];
  const [mode, setMode] = useState<ChartMode>('price');
  const details = useSelectedInstruments(selected);
  const busy =
    instruments.isFetching ||
    details.some((item) => item.prices.isFetching || item.statistics.isFetching);
  const first = details[0]?.prices.data;
  const dates = details
    .flatMap((item) => item.prices.data?.prices.map((point) => point.date) ?? [])
    .sort();
  const dateRange = dates.length
    ? `${formatDate(dates[0])} – ${formatDate(dates.at(-1)!, true)}`
    : 'Daily closing prices';
  const observations = new Set(dates).size;
  const onToggle = (ticker: string) => setSelection(toggleTicker(selected, ticker));

  return (
    <div className={styles.shell}>
      <a className="skip-link" href="#main">
        Skip to price explorer
      </a>
      <header className={styles.header}>
        <a href="/" className={styles.brand} aria-label="Pharo home">
          <span className={styles.brandIcon}>
            <ChartNoAxesCombined size={20} strokeWidth={2.3} />
          </span>
          pharo
          <span className={styles.brandDivider} />
          <span className={styles.brandSub}>MARKET RESEARCH</span>
        </a>
        <span className={styles.datasetBadge}>
          <span />
          Synthetic dataset
        </span>
      </header>
      <div className={styles.page}>
        <div className={styles.pageHeading}>
          <div>
            <p className={styles.eyebrow}>RESEARCH WORKSPACE</p>
            <h1>
              Instrument explorer<span>.</span>
            </h1>
            <p className={styles.subtitle}>A clearer view of price, performance, and risk.</p>
          </div>
          <div className={styles.datasetSummary}>
            <Database size={17} />
            <div>
              <strong>{instruments.data?.length ?? '—'} instruments</strong>
              <span>Daily closing prices</span>
            </div>
          </div>
        </div>
        <div className={styles.workspace}>
          <aside className={styles.sidebar} aria-label="Instrument selection">
            {instruments.isPending ? (
              <div className={styles.sidebarLoading} role="status">
                Loading instruments…
                <div className="skeleton" />
                <div className="skeleton" />
                <div className="skeleton" />
              </div>
            ) : instruments.isError && !instruments.data ? (
              <RequestError
                message={instruments.error.message}
                onRetry={() => void instruments.refetch()}
              />
            ) : (
              <InstrumentPicker
                tickers={instruments.data ?? []}
                selected={selected}
                onToggle={onToggle}
              />
            )}
          </aside>
          <main id="main" className={styles.main} tabIndex={-1}>
            <section className={styles.chartCard} aria-label="Price explorer">
              <div className={styles.chartToolbar}>
                <div className={styles.sectionTitle}>
                  <Layers2 size={17} />
                  <span>{selected.length > 1 ? 'Compare instruments' : 'Price overview'}</span>
                </div>
                <button
                  className={styles.refresh}
                  aria-label="Refresh market data"
                  disabled={busy}
                  onClick={() => void queryClient.invalidateQueries()}
                >
                  <RotateCcw size={15} className={busy ? styles.spinning : ''} />
                  <span>Refresh</span>
                </button>
              </div>
              <div className={styles.selectionBar}>
                <div className={styles.selectedChips}>
                  {selected.map((ticker, index) => (
                    <span className={styles.chip} key={ticker}>
                      <span
                        className={styles.seriesDot}
                        style={{ background: seriesColors[index] }}
                      />
                      {ticker}
                      <button aria-label={`Remove ${ticker}`} onClick={() => onToggle(ticker)}>
                        <X size={13} />
                      </button>
                    </span>
                  ))}
                  {selected.length === 0 && (
                    <span className={styles.muted}>No instruments selected</span>
                  )}
                </div>
                <span className={styles.selectionCount}>{selected.length} / 3 selected</span>
              </div>
              {selected.length ? (
                <>
                  <div className={styles.chartHeading}>
                    <div>
                      <p className={styles.eyebrow}>
                        {selected.length === 1 ? 'LATEST CLOSE' : 'PRICE COMPARISON'}
                      </p>
                      {selected.length === 1 ? (
                        <div className={styles.latestPrice}>
                          {first?.prices.length ? formatNumber(first.prices.at(-1)!.price) : '—'}
                          <span>price units</span>
                        </div>
                      ) : (
                        <h2 className={styles.comparisonTitle}>
                          {mode === 'price' ? 'Closing prices' : 'Growth of 100'}
                        </h2>
                      )}
                      <p className={styles.dateRange}>{dateRange}</p>
                    </div>
                    <div className={styles.modeSwitch} role="group" aria-label="Chart display">
                      <button aria-pressed={mode === 'price'} onClick={() => setMode('price')}>
                        Price
                      </button>
                      <button aria-pressed={mode === 'indexed'} onClick={() => setMode('indexed')}>
                        Indexed to 100
                      </button>
                    </div>
                  </div>
                  <div className={styles.chartUnit}>
                    {mode === 'price' ? 'CLOSING PRICE' : 'INDEX · FIRST OBSERVATION = 100'}
                  </div>
                  {details.map(
                    (item) =>
                      item.prices.isError && (
                        <RequestError
                          key={item.ticker}
                          message={`${item.ticker}: ${item.prices.error.message}${item.prices.data ? ' Showing previously loaded prices.' : ''}`}
                          onRetry={() => void item.prices.refetch()}
                        />
                      ),
                  )}
                  {details
                    .filter((item) => item.prices.isPending)
                    .map((item) => (
                      <p className={styles.loadingSeries} role="status" key={item.ticker}>
                        Loading {item.ticker}…
                      </p>
                    ))}
                  <Suspense
                    fallback={
                      <div className={styles.chartPlaceholder} role="status">
                        Preparing chart…
                      </div>
                    }
                  >
                    <PriceChart instruments={details} mode={mode} />
                  </Suspense>
                  <div className={styles.chartFooter}>
                    <span>
                      <span className={styles.statusDot} />
                      {observations ? `${observations} observation dates` : 'Awaiting observations'}
                    </span>
                    <span>
                      {mode === 'indexed'
                        ? 'Each series starts at 100'
                        : 'Select Indexed to 100 to compare relative movement'}
                      <ArrowUpRight size={13} />
                    </span>
                  </div>
                </>
              ) : (
                <div className={styles.emptyState}>
                  <div>
                    <ChartNoAxesCombined size={30} />
                  </div>
                  <h2>Your next insight starts here.</h2>
                  <p>
                    Select an instrument to explore its price history.
                    <br />
                    Add up to two more to see how they compare.
                  </p>
                </div>
              )}
            </section>
            {selected.length > 0 && (
              <>
                <StatisticsPanel instruments={details} />
                {details.map(
                  (item) =>
                    item.statistics.isError &&
                    item.statistics.data && (
                      <RequestError
                        key={item.ticker}
                        message={`${item.ticker}: Refresh failed. Showing previously loaded statistics.`}
                        onRetry={() => void item.statistics.refetch()}
                      />
                    ),
                )}
                <details className={styles.methodology}>
                  <summary>
                    <span>Understanding the numbers</span>
                    <ChevronDown size={16} />
                  </summary>
                  <div>
                    <p>
                      <strong>Total return</strong> measures the change from the first close to the
                      last. <strong>Daily volatility</strong> is the sample standard deviation of
                      daily simple returns, without annualization. <strong>Max drawdown</strong> is
                      the largest decline from an earlier peak, shown as a positive percentage.
                    </p>
                    <p>
                      Statistics always use original prices. Indexed charts start each series at
                      100; missing observations remain gaps. Prices have no specified currency. “—”
                      means there are too few observations to calculate a statistic.
                    </p>
                  </div>
                </details>
              </>
            )}
          </main>
        </div>
        <footer className={styles.footer}>
          <span>
            PHARO <span> / </span> INSTRUMENT RESEARCH
          </span>
          <span>Synthetic data. Real perspective.</span>
        </footer>
      </div>
    </div>
  );
}
