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
  await page.getByRole('button', { name: 'refine preferences' }).click();
  await expect(page.getByText('what would you like to change?', { exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'your reply' }).fill('pause purchases over $200');
  await page.getByRole('button', { name: 'send reply' }).click();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('snuff.mobile.v2')!).purchaseRules.minAmount,
    ),
  ).toBe(50);
  await page.getByRole('button', { name: '$200', exact: true }).click();
  await page.getByRole('button', { name: 'balanced', exact: true }).click();
  await page.getByRole('button', { name: 'confirm & try purchase demo' }).click();
  await expect(page.getByText('a practice purchase.', { exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'demo purchase amount' })).toHaveValue('200');
  await page.getByRole('textbox', { name: 'demo purchase amount' }).fill('20');
  await page.getByRole('button', { name: 'simulate purchase' }).click();
  await expect(
    page.getByText('purchase would continue. no payment was made.', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'yes, snuff this urge' })).toHaveCount(0);
  await page.getByRole('button', { name: 'use a matching purchase' }).click();
  await page.getByText('a practice purchase.', { exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: '../../outputs/snuffed-purchase-demo.png' });
  await page.getByRole('button', { name: 'simulate purchase' }).click();
  await expect(page.getByTestId('purchase-watch-context')).toBeVisible();
  await page.getByRole('button', { name: 'save for later', exact: true }).click();
  await expect
    .poll(async () =>
      page.evaluate(() =>
        JSON.parse(localStorage.getItem('snuff.mobile.v2')!).archive.some(
          (i: { source: string }) => i.source === 'purchase demo',
        ),
      ),
    )
    .toBe(true);
});
