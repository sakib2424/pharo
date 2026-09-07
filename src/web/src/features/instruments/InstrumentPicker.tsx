import { Check, Search, X } from 'lucide-react';
import { useState } from 'react';
import { MAX_SELECTION } from './presentation';
import styles from './Dashboard.module.css';

interface Props {
  tickers: string[];
  selected: string[];
  onToggle: (ticker: string) => void;
}

export function InstrumentPicker({ tickers, selected, onToggle }: Props) {
  const [search, setSearch] = useState('');
  const filtered = tickers.filter((ticker) =>
    ticker.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const atLimit = selected.length === MAX_SELECTION;
  return (
    <>
      <div className={styles.pickerHeading}>
        <h2>Instruments</h2>
        <span className={styles.count}>{tickers.length}</span>
      </div>
      <div className={styles.search}>
        <Search size={16} aria-hidden="true" />
        <input
          aria-label="Search instruments"
          placeholder="Search tickers…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        {search && (
          <button aria-label="Clear search" onClick={() => setSearch('')}>
            <X size={14} />
          </button>
        )}
      </div>
      <p className={styles.selectionHint} id="selection-hint">
        {atLimit
          ? '3 selected. Remove one to add another.'
          : 'Select up to 3 instruments to compare.'}
      </p>
      <div className={styles.listHeading}>
        <span>TICKER</span>
        <span>SELECT</span>
      </div>
      <div className={styles.instrumentList} aria-label="Available instruments">
        {filtered.map((ticker) => {
          const checked = selected.includes(ticker);
          return (
            <label
              key={ticker}
              className={`${styles.instrument} ${checked ? styles.instrumentSelected : ''} ${atLimit && !checked ? styles.instrumentDisabled : ''}`}
            >
              <span className={styles.tickerAvatar} aria-hidden="true">
                {ticker.slice(-2)}
              </span>
              <span className={styles.tickerName}>{ticker}</span>
              <input
                type="checkbox"
                aria-label={ticker}
                aria-describedby="selection-hint"
                checked={checked}
                disabled={atLimit && !checked}
                onChange={() => onToggle(ticker)}
              />
              <span className={styles.checkbox} aria-hidden="true">
                {checked && <Check size={12} strokeWidth={3} />}
              </span>
            </label>
          );
        })}
        {filtered.length === 0 && (
          <div className={styles.noResults} role="status">
            No tickers match “{search}”.
            <button className="text-button" onClick={() => setSearch('')}>
              Clear search
            </button>
          </div>
        )}
      </div>
      <div className={styles.pickerFooter} aria-live="polite">
        {filtered.length} of {tickers.length} instruments
      </div>
    </>
  );
}
