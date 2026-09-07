import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('browse, search, compare, normalize, and clear selection', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Instrument explorer.' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Closing price chart for TICK0001' })).toBeVisible();
  await expect(page.getByLabel('Instrument statistics')).toContainText('%');
  await page.screenshot({ path: testInfo.outputPath('dashboard.png'), fullPage: true });
  await page.getByRole('textbox', { name: 'Search instruments' }).fill('tick000');
  await page.getByRole('checkbox', { name: 'TICK0002', exact: true }).check();
  await page.getByRole('checkbox', { name: 'TICK0003', exact: true }).check();
  await expect(page.getByRole('checkbox', { name: 'TICK0004', exact: true })).toBeDisabled();
  await expect(page.getByRole('region', { name: 'Comparison statistics' })).toContainText(
    'TICK0003',
  );
  await page.getByRole('button', { name: 'Indexed to 100', exact: true }).click();
  await expect(
    page.getByRole('img', { name: 'Indexed performance chart for TICK0001, TICK0002, TICK0003' }),
  ).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('comparison.png'), fullPage: true });
  for (const ticker of ['TICK0001', 'TICK0002', 'TICK0003'])
    await page.getByRole('button', { name: `Remove ${ticker}` }).click();
  await expect(page.getByRole('heading', { name: 'Your next insight starts here.' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('a failed statistics request leaves the price chart and other instruments usable', async ({
  page,
}) => {
  await page.route('**/api/prices/TICK0002/stats', (route) =>
    route.fulfill({ status: 500, contentType: 'application/problem+json', body: '{"status":500}' }),
  );
  await page.goto('/');
  await page.getByRole('checkbox', { name: 'TICK0002', exact: true }).check();
  await expect(page.getByRole('alert')).toContainText('could not complete');
  await expect(
    page.getByRole('img', { name: 'Closing price chart for TICK0001, TICK0002' }),
  ).toBeVisible();
  await page.unroute('**/api/prices/TICK0002/stats');
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Comparison statistics' })).toContainText('%');
});

test('an unreachable API offers recovery', async ({ page }) => {
  await page.route('**/api/instruments', (route) => route.abort('failed'));
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Unable to reach');
  await page.unroute('**/api/instruments');
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Closing price chart for TICK0001' })).toBeVisible();
});

test('unknown instruments show an explicit error and can be removed', async ({ page }) => {
  await page.route('**/api/instruments', (route) =>
    route.fulfill({ json: ['MISSING', 'TICK0001'] }),
  );
  await page.goto('/');
  await expect(page.getByRole('alert').first()).toContainText('not available');
  await page.getByRole('button', { name: 'Remove MISSING' }).click();
  await page.getByRole('checkbox', { name: 'TICK0001', exact: true }).check();
  await expect(page.getByRole('img', { name: 'Closing price chart for TICK0001' })).toBeVisible();
});

test('keyboard selection and a narrow viewport remain usable', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const checkbox = page.getByRole('checkbox', { name: 'TICK0002', exact: true });
  await checkbox.focus();
  await page.keyboard.press('Space');
  await expect(checkbox).toBeChecked();
  await expect(
    page.getByRole('img', { name: 'Closing price chart for TICK0001, TICK0002' }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: testInfo.outputPath('mobile.png'), fullPage: true });
});

test('the dashboard passes automated accessibility checks', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('img', { name: 'Closing price chart for TICK0001' })).toBeVisible();
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(result.violations).toEqual([]);
});

test('the published server serves SPA routes and preserves JSON API errors', async ({
  request,
}) => {
  const page = await request.get('/explore');
  expect(page.status()).toBe(200);
  expect(page.headers()['content-type']).toContain('text/html');
  const missing = await request.get('/api/not-a-route');
  expect(missing.status()).toBe(404);
  expect(missing.headers()['content-type']).toContain('application/problem+json');
});
