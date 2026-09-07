import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { InstrumentPicker } from './InstrumentPicker';
import { toggleTicker } from './presentation';

function Picker() {
  const [selected, setSelected] = useState<string[]>([]);
  return (
    <InstrumentPicker
      tickers={['AAA', 'AAB', 'BBB', 'CCC']}
      selected={selected}
      onToggle={(ticker) => setSelected(toggleTicker(selected, ticker))}
    />
  );
}

it('filters locally, preserves selection through searches, and clears an empty search result', async () => {
  const user = userEvent.setup();
  render(<Picker />);
  await user.click(screen.getByRole('checkbox', { name: 'AAA' }));
  await user.type(screen.getByRole('textbox', { name: 'Search instruments' }), 'bbb');
  expect(screen.queryByRole('checkbox', { name: 'AAA' })).not.toBeInTheDocument();
  expect(screen.getByRole('checkbox', { name: 'BBB' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Clear search' }));
  expect(screen.getByRole('checkbox', { name: 'AAA' })).toBeChecked();
  await user.type(screen.getByRole('textbox'), 'missing');
  expect(screen.getByRole('status')).toHaveTextContent('No tickers match');
});

it('disables a fourth selection and enables it again after removal', async () => {
  const user = userEvent.setup();
  render(<Picker />);
  for (const ticker of ['AAA', 'AAB', 'BBB'])
    await user.click(screen.getByRole('checkbox', { name: ticker }));
  expect(screen.getByRole('checkbox', { name: 'CCC' })).toBeDisabled();
  await user.click(screen.getByRole('checkbox', { name: 'AAA' }));
  expect(screen.getByRole('checkbox', { name: 'CCC' })).toBeEnabled();
});
