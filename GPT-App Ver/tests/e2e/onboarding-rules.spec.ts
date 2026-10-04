import { test, expect } from '@playwright/test';
for (const width of [320, 390]) {
  test(`chat gathers and confirms preferences at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 844 });
    await page.goto('/');
    await page.getByRole('button', { name: 'begin onboarding' }).click();
    await page.getByRole('textbox', { name: 'first name', exact: true }).fill('Jamie');
    await page.getByRole('textbox', { name: 'last name', exact: true }).fill('Chen');
    await page.getByRole('button', { name: 'continue with google', exact: true }).click();
    await page
      .getByRole('button', { name: 'i’m losing money from sports betting.', exact: true })
      .click();
    await expect(page.getByLabel('snuffed is typing')).toBeVisible();
    await page.getByRole('button', { name: '$75', exact: true }).click();
    await page.getByRole('button', { name: 'gentle', exact: true }).click();
    await expect(page.getByTestId('chat-confirmation')).toContainText('sports betting');
    await expect(page.getByRole('button', { name: 'see suggested levels' })).toHaveCount(0);
    expect(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem('snuff.mobile.v2')!).onboardingComplete,
      ),
    ).toBe(false);
    await page.getByRole('button', { name: 'change amount' }).click();
    await page.getByRole('textbox', { name: 'your reply' }).fill('invalid');
    await page.getByRole('button', { name: 'send reply' }).click();
    await expect(
      page.getByText('choose an amount from $0 to $1,000,000, with up to two decimal places.'),
    ).toBeVisible();
    await page.getByRole('textbox', { name: 'your reply' }).fill('40');
    await page.getByRole('button', { name: 'send reply' }).click();
    await page.getByRole('button', { name: 'gentle', exact: true }).click();
    await page.getByRole('button', { name: 'require both rules' }).click();
    await page.screenshot({ path: `../../outputs/snuffed-chat-confirm-${width}.png` });
    await page.getByRole('button', { name: 'confirm & continue' }).click();
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
