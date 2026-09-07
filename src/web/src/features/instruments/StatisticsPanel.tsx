import { ArrowDownRight, ArrowUpRight, Activity, TrendingDown } from 'lucide-react';
import { RequestError } from '../../components/RequestError';
import { formatPercent, seriesColors } from './presentation';
import type { SelectedInstrument } from './queries';
import styles from './Dashboard.module.css';

const descriptions = [
  'Change from the first closing price to the last.',
  'Sample standard deviation of daily returns. Not annualized.',
  'Largest decline from an earlier peak, shown as a positive percentage.',
];

export function StatisticsPanel({ instruments }: { instruments: SelectedInstrument[] }) {
  if (instruments.length === 1) {
    const item = instruments[0];
    const stats = item.statistics.data;
    if (item.statistics.isError && !stats)
      return (
        <RequestError
          message={`${item.ticker}: ${item.statistics.error.message}`}
          onRetry={() => void item.statistics.refetch()}
        />
      );
    const up = (stats?.totalReturnPercent ?? 0) >= 0;
    const metrics = [
      {
        title: 'Total return',
        value: formatPercent(stats?.totalReturnPercent, true),
        caption: 'Over the observation window',
        Icon: up ? ArrowUpRight : ArrowDownRight,
        tone: up ? styles.positive : styles.negative,
      },
      {
        title: 'Daily volatility',
        value: formatPercent(stats?.dailyVolatilityPercent),
        caption: 'Sample standard deviation',
        Icon: Activity,
        tone: '',
      },
      {
        title: 'Max drawdown',
        value: formatPercent(stats?.maxDrawdownPercent),
        caption: 'Largest peak-to-trough decline',
        Icon: TrendingDown,
        tone: '',
      },
    ];
    return (
      <div
        className={styles.metrics}
        aria-label="Instrument statistics"
        aria-busy={item.statistics.isPending}
      >
        {metrics.map(({ title, value, caption, Icon, tone }, index) => (
          <article className={styles.metric} key={title}>
            <div className={styles.metricLabel}>
              <span title={descriptions[index]}>{title}</span>
              <Icon size={17} aria-hidden="true" />
            </div>
            <strong className={tone}>
              {item.statistics.isPending ? <span className="skeleton">&nbsp;</span> : value}
            </strong>
            <p>{caption}</p>
          </article>
        ))}
      </div>
    );
  }
  return (
    <section className={styles.comparison} aria-label="Comparison statistics">
      <div className={styles.sectionHeading}>
        <h2>Performance at a glance</h2>
        <span>Full observation window</span>
      </div>
      <div className={styles.tableScroll}>
        <table>
          <thead>
            <tr>
              <th scope="col">Instrument</th>
              <th scope="col" title={descriptions[0]}>
                Total return
              </th>
              <th scope="col" title={descriptions[1]}>
                Daily volatility
              </th>
              <th scope="col" title={descriptions[2]}>
                Max drawdown
              </th>
            </tr>
          </thead>
          <tbody>
            {instruments.map((item, index) => (
              <tr key={item.ticker}>
                <th scope="row">
                  <span className={styles.seriesDot} style={{ background: seriesColors[index] }} />
                  {item.ticker}
                </th>
                {item.statistics.isError && !item.statistics.data ? (
                  <td colSpan={3}>
                    <RequestError
                      message={item.statistics.error.message}
                      onRetry={() => void item.statistics.refetch()}
                    />
                  </td>
                ) : (
                  <>
                    <td
                      className={
                        (item.statistics.data?.totalReturnPercent ?? 0) >= 0
                          ? styles.positive
                          : styles.negative
                      }
                    >
                      {item.statistics.isPending
                        ? 'Loading…'
                        : formatPercent(item.statistics.data?.totalReturnPercent, true)}
                    </td>
                    <td>{formatPercent(item.statistics.data?.dailyVolatilityPercent)}</td>
                    <td>{formatPercent(item.statistics.data?.maxDrawdownPercent)}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
