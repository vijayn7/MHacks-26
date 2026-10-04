import { test, expect } from '@playwright/test';
test('settings refines drafts and simulates matching and nonmatching purchases', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'begin onboarding' }).click();
  await page.getByRole('textbox', { name: 'first name', exact: true }).fill('Jamie');
  await page.getByRole('textbox', { name: 'last name', exact: true }).fill('Chen');
  await page.getByRole('button', { name: 'continue as guest' }).click();
  await page.getByRole('button', { name: 'skip', exact: true }).click();
  await page.getByRole('button', { name: 'confirm & continue', exact: true }).click();
  await page.getByRole('tab', { name: 'profile', exact: true }).click();
  await page.getByRole('button', { name: 'open settings' }).click();
  await page.getByRole('button', { name: 'purchase demo', exact: true }).click();
  const store = page.frameLocator('iframe[title="sample shopping site"]');
  await expect(store.getByRole('button', { name: 'buy now' })).toBeVisible();
  await page.screenshot({ path: '../../outputs/snuffed-sample-store.png' });
  await store.getByRole('button', { name: 'buy now' }).click();
  await expect(page.getByTestId('purchase-takeover')).toBeVisible();
  const box = await page.getByTestId('purchase-takeover').boundingBox();
  expect(box?.width).toBe(390);
  expect(box?.height).toBe(844);
  await page.waitForTimeout(600); // Let the full-screen fade settle for the design preview.
  await page.screenshot({ path: '../../outputs/snuffed-fullscreen-pause.png' });
  await page.getByRole('button', { name: 'no, keep my flame', exact: true }).click();
  await page.getByRole('button', { name: 'back to my day', exact: true }).click();
  await expect(store.getByRole('status')).toContainText('purchase continued');
  await store.getByText('customize this sample purchase').click();
  await store.locator('#amount').fill('20');
  await store.locator('#category').selectOption('other');
  await store.getByRole('button', { name: 'buy now' }).click();
  await expect(store.getByRole('status')).toContainText('outside your pause rules');
  await expect(page.getByTestId('purchase-takeover')).toHaveCount(0);
  await store.locator('#amount').fill('200');
  await store.getByRole('button', { name: 'buy now' }).click();
  await page.getByRole('button', { name: 'save for later', exact: true }).click();
  await expect
    .poll(async () =>
      page.evaluate(() =>
        JSON.parse(localStorage.getItem('snuff.mobile.v2')!).archive.some(
          (i: { source: string }) => i.source === 'sample store',
        ),
      ),
    )
    .toBe(true);
});
