import { test, expect } from '@playwright/test';
test('settings refines preferences through chat', async ({ page }) => {
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
  await page.getByRole('button', { name: 'confirm & continue', exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem('snuff.mobile.v2')!).purchaseRules.minAmount,
      ),
    )
    .toBe(200);
});
