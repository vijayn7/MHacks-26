import { test, expect } from '@playwright/test';
for (const width of [320, 390]) {
  test(`onboarding rules and alignment at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 844 });
    await page.goto('/');
    await page.getByRole('button', { name: 'begin onboarding' }).click();
    await page.getByRole('textbox', { name: 'first name', exact: true }).fill('Jamie');
    await page.getByRole('textbox', { name: 'last name', exact: true }).fill('Chen');
    await page.screenshot({ path: `../../outputs/snuff-onboarding-signin-${width}.png` });
    await page.getByRole('button', { name: 'continue with google', exact: true }).click();
    await page.getByRole('checkbox', { name: 'sports betting', exact: true }).click();
    await page.getByRole('button', { name: 'continue', exact: true }).click();
    const amount = page.getByRole('textbox', { name: 'purchase amount in dollars' });
    await amount.fill('bad');
    await expect(page.getByRole('button', { name: 'start', exact: true })).toBeDisabled();
    await amount.fill('75');
    await page.getByRole('radio', { name: 'both rules', exact: true }).click();
    await expect(
      page.getByText('when a purchase is $75 or more and in sports betting…'),
    ).toBeVisible();
    await page.screenshot({ path: `../../outputs/snuff-onboarding-rules-${width}.png` });
    await page.getByRole('button', { name: 'start', exact: true }).click();
    await expect(page.getByRole('tab', { name: 'home', exact: true })).toBeVisible();
    const rules = await page.evaluate(
      () => JSON.parse(localStorage.getItem('snuff.mobile.v2')!).purchaseRules,
    );
    expect(rules).toMatchObject({
      minAmount: 75,
      categoryEnabled: true,
      categories: ['sports betting'],
      match: 'all',
    });
    await expect(page.getByRole('button', { name: 'save check-in', exact: true })).toHaveCount(0);
  });
}
