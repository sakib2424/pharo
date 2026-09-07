import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { chartRows, formatDate, formatNumber, seriesColors } from './presentation';
import type { ChartMode } from './presentation';
import type { SelectedInstrument } from './queries';
import styles from './Dashboard.module.css';

export function PriceChart({
  instruments,
  mode,
}: {
  instruments: SelectedInstrument[];
  mode: ChartMode;
}) {
  const available = instruments.flatMap((item) => (item.prices.data ? [item.prices.data] : []));
  const data = chartRows(available, mode);
  if (data.length === 0)
    return (
      <div className={styles.chartPlaceholder} role="status">
        {instruments.some((item) => item.prices.isPending)
          ? 'Loading price history…'
          : 'No price observations to display.'}
      </div>
    );

  return (
    <div
      className={styles.chart}
      role="img"
      aria-label={`${mode === 'price' ? 'Closing price' : 'Indexed performance'} chart for ${available.map((item) => item.ticker).join(', ')}`}
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <LineChart
          data={data}
          margin={{ top: 18, right: 20, bottom: 10, left: 4 }}
          accessibilityLayer
        >
          <CartesianGrid vertical={false} stroke="#e6ece8" strokeDasharray="3 4" />
          <XAxis
            dataKey="date"
            tickFormatter={(value: string) => formatDate(value)}
            tickLine={false}
            axisLine={false}
            minTickGap={42}
            tickMargin={16}
            stroke="#627368"
            fontSize={11}
          />
          <YAxis
            domain={['auto', 'auto']}
            tickLine={false}
            axisLine={false}
            width={58}
            tickMargin={12}
            stroke="#627368"
            fontSize={11}
            tickFormatter={(value: number) =>
              new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value)
            }
          />
          <Tooltip
            labelFormatter={(label) => formatDate(String(label), true)}
            formatter={(value, name) => [
              typeof value === 'number' ? formatNumber(value) : '—',
              name,
            ]}
            contentStyle={{
              borderRadius: 10,
              border: '1px solid #dfe7e2',
              boxShadow: '0 8px 24px #152c2110',
              fontSize: 12,
            }}
          />
          {mode === 'indexed' && <ReferenceLine y={100} stroke="#9ba9a1" strokeDasharray="4 4" />}
          {instruments.map(
            (item, index) =>
              item.prices.data && (
                <Line
                  key={item.ticker}
                  type="linear"
                  dataKey={item.ticker}
                  stroke={seriesColors[index]}
                  strokeWidth={2.5}
                  strokeDasharray={index === 1 ? '7 3' : index === 2 ? '3 3' : undefined}
                  dot={data.length === 1}
                  activeDot={{ r: 5, strokeWidth: 3, stroke: '#fff' }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              ),
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
