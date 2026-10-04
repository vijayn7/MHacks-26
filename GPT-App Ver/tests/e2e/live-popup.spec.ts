import { test, expect } from '@playwright/test';
test('popup receives heart rate and emotion updates without asking for input', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'begin onboarding' }).click();
  await page.getByRole('textbox', { name: 'first name', exact: true }).fill('Jamie');
  await page.getByRole('textbox', { name: 'last name', exact: true }).fill('Chen');
  await page.getByRole('button', { name: 'continue with google', exact: true }).click();
  await page.getByRole('button', { name: 'skip', exact: true }).click();
  await page.getByRole('button', { name: 'start', exact: true }).click();
  await page.getByRole('tab', { name: 'profile', exact: true }).click();
  await page.getByRole('button', { name: 'open settings' }).click();
  await page.getByRole('button', { name: 'apple watch', exact: true }).click();
  await page.getByRole('button', { name: 'connect apple watch', exact: true }).click();
  await page.getByRole('button', { name: 'close sheet', exact: true }).click();
  await page.getByRole('tab', { name: 'archive', exact: true }).click();
  await page.getByRole('button', { name: 'open saved item', exact: true }).click();
  await page.getByRole('button', { name: 'revisit this item', exact: true }).click();
  const context = page.getByTestId('purchase-watch-context');
  await expect(context).toContainText(/\d+ bpm/);
  await expect(context).toContainText('estimated');
  await expect(page.getByRole('button', { name: 'how are you feeling', exact: true })).toHaveCount(
    0,
  );
  const initial = await page.evaluate(
    () => JSON.parse(localStorage.getItem('snuff.mobile.v2')!).wearable.reading.at,
  );
  await expect
    .poll(() =>
      page.evaluate(() => JSON.parse(localStorage.getItem('snuff.mobile.v2')!).wearable.reading.at),
    )
    .toBeGreaterThan(initial);
  await page.screenshot({ path: '../../outputs/snuff-live-popup.png' });
  await page.getByRole('button', { name: 'no, keep my flame', exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem('snuff.mobile.v2')!).wearable.moments.length,
      ),
    )
    .toBe(1);
  const stopped = await page.evaluate(
    () => JSON.parse(localStorage.getItem('snuff.mobile.v2')!).wearable.reading.at,
  );
  await page.waitForTimeout(2200);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('snuff.mobile.v2')!).wearable.reading.at,
    ),
  ).toBe(stopped);
});
