import { test, expect } from '@playwright/test';
for (const width of [320, 390]) {
  test(`chat and adjustable restriction levels at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 844 });
    await page.goto('/');
    await page.getByRole('button', { name: 'begin onboarding' }).click();
    await page.getByRole('textbox', { name: 'first name', exact: true }).fill('Jamie');
    await page.getByRole('textbox', { name: 'last name', exact: true }).fill('Chen');
    await page.getByRole('button', { name: 'continue with google', exact: true }).click();
    await page
      .getByRole('button', { name: 'i’m losing money from sports betting.', exact: true })
      .click();
    await expect(
      page.getByText('let’s put a pause before betting purchases.', { exact: false }),
    ).toBeVisible();
    await page.screenshot({ path: `../../outputs/snuffed-chat-${width}.png` });
    await page.getByRole('button', { name: 'see suggested levels' }).click();
    await expect(page.getByRole('radio', { name: 'balanced restriction' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await page.getByRole('button', { name: 'adjust strong' }).click();
    const amount = page.getByRole('textbox', { name: 'strong purchase amount' });
    await amount.fill('bad');
    await expect(page.getByRole('button', { name: 'start', exact: true })).toBeDisabled();
    await amount.fill('40');
    await page.getByRole('button', { name: 'reminder tone', exact: true }).click();
    await page.getByRole('radio', { name: 'gentle', exact: true }).click();
    await page.getByRole('button', { name: 'when to pause' }).click();
    await page.getByRole('radio', { name: 'both rules' }).click();
    await page.getByRole('button', { name: 'adjust light' }).click();
    await page.getByRole('button', { name: 'adjust strong' }).click();
    await expect(amount).toHaveValue('40');
    await page.getByRole('button', { name: 'adjust strong' }).click();
    await page.getByRole('radio', { name: 'light restriction' }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `../../outputs/snuffed-levels-${width}.png` });
    await page.getByRole('button', { name: 'start', exact: true }).click();
    await expect(page.getByRole('tab', { name: 'home', exact: true })).toBeVisible();
    const state = await page.evaluate(() => JSON.parse(localStorage.getItem('snuff.mobile.v2')!));
    expect(state.purchaseRules).toMatchObject({
      minAmount: 40,
      categories: ['sports betting'],
      match: 'all',
    });
    expect(state.burnRate).toBe(20);
  });
}
