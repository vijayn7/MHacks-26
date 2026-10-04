import { test, expect } from './fixtures';
import { initialState } from './fixtures';
import { archiveSamples } from '../../src/state/archive';

test('saving from the notification persists name, price and date and can be revisited without duplicates', async ({
  page,
}) => {
  const state = { ...initialState(), notificationsEnabled: true };
  state.nudges[0].dueAt = Date.now() - 1000;
  await page.addInitScript((s) => {
    if (!sessionStorage.getItem('archive-test-seeded')) {
      localStorage.setItem('snuff.mobile.v2', JSON.stringify(s));
      sessionStorage.setItem('archive-test-seeded', 'true');
    }
  }, state);
  await page.goto('/');
  await page.getByRole('button', { name: 'save for later', exact: true }).click();
  await expect(page.getByText('saved for later.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'view archive', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'archive', exact: true })).toBeVisible();
  const item = page.getByRole('button', { name: /^studio headphones, \$149, saved / });
  await expect(item).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('snuff.mobile.v2')!));
  expect(saved.savings).toBe(284);
  expect(saved.pauses).toBe(11);
  expect(saved.archive[0].savedAt).toBeGreaterThan(Date.now() - 60000);
  await page.reload();
  await item.click();
  await expect(page.getByText('$149', { exact: true }).last()).toBeVisible();
  await page.getByRole('button', { name: 'revisit this item', exact: true }).click();
  await expect(page.getByText('snuff this urge?', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'save for later', exact: true }).click();
  const again = await page.evaluate(() => JSON.parse(localStorage.getItem('snuff.mobile.v2')!));
  expect(again.archive).toEqual(saved.archive);
});

for (const width of [320, 390])
  test(`lens collection scrolls and reveals details at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/archive');
    await page.getByRole('button', { name: 'preview archive', exact: true }).click();
    await expect(page.getByText('03 / 06', { exact: true })).toBeVisible();
    const card = page.getByTestId('archive-card-sample-2');
    const before = await card.evaluate((e) => getComputedStyle(e).transform);
    await page.getByRole('button', { name: 'next saved item', exact: true }).click();
    await expect(page.getByText('04 / 06', { exact: true })).toBeVisible();
    await expect.poll(() => card.evaluate((e) => getComputedStyle(e).transform)).not.toBe(before);
    await page.getByRole('button', { name: /^everyday tote, / }).click();
    await expect(page.getByRole('button', { name: 'keep for later', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'keep for later', exact: true }).click();
    await page.getByRole('button', { name: 'close archive preview', exact: true }).click();
    await expect(page.getByText('nothing here, yet.', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  });

test('reduced motion retains flat cards and the oldest entry remains reachable', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript((s) => localStorage.setItem('snuff.mobile.v2', JSON.stringify(s)), {
    ...initialState(),
    archive: archiveSamples(),
  });
  await page.goto('/archive');
  const last = page.getByRole('button', { name: /^weekend watch, / });
  for (let i = 0; i < 5; i++)
    await page.getByRole('button', { name: 'next saved item', exact: true }).click();
  await expect(page.getByText('06 / 06', { exact: true })).toBeVisible();
  await expect(page.getByTestId('archive-card-sample-5')).toHaveCSS('transform', 'none');
  await last.click();
  await expect(page.getByRole('button', { name: 'revisit this item', exact: true })).toBeVisible();
});
