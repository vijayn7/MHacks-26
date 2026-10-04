import { test, expect } from '@playwright/test';

test('three-step demo onboarding saves categories and strength, then stays complete', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByTestId('flame-mascot')).toBeVisible();
  await page.getByRole('button', { name: 'begin onboarding' }).click();
  await page.getByRole('textbox', { name: 'first name', exact: true }).fill('Jamie');
  await page.getByRole('textbox', { name: 'last name', exact: true }).fill('Chen');
  await expect(
    page.getByRole('button', { name: 'continue with google', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'continue with google', exact: true }).click();
  await page.getByRole('checkbox', { name: 'sports betting', exact: true }).click();
  await page.getByRole('checkbox', { name: 'tech & gadgets', exact: true }).click();
  await page.getByRole('button', { name: 'continue', exact: true }).click();
  const slider = page.getByRole('slider', { name: 'popup strength' });
  await slider.fill('85');
  await expect(page.getByText('take a breath first.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'start', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'home', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('tab', { name: 'home', exact: true })).toBeVisible();
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('snuff.mobile.v2')!));
  expect(state.onboardingComplete).toBe(true);
  expect(state.name).toBe('jamie chen');
  expect(state.spendingCategories).toEqual(['sports betting', 'tech & gadgets']);
  expect(state.burnRate).toBe(85);
  await page.getByRole('tab', { name: 'profile', exact: true }).click();
  await page.getByRole('button', { name: 'open settings', exact: true }).click();
  await page.getByRole('button', { name: 'spending preferences', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'sports betting' })).toBeChecked();
});

test('email demo and optional categories work on a small phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/onboarding');
  await page.getByRole('button', { name: 'begin onboarding' }).click();
  await page.getByRole('textbox', { name: 'first name', exact: true }).fill('Jamie');
  await page.getByRole('textbox', { name: 'last name', exact: true }).fill('Chen');
  await page.getByRole('button', { name: 'continue with email', exact: true }).click();
  await page.getByRole('textbox', { name: 'email address' }).fill('demo@example.com');
  await page.getByRole('button', { name: 'continue', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'skip', exact: true }).click();
  await page.getByRole('button', { name: 'start', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'home', exact: true })).toBeVisible();
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('snuff.mobile.v2')!));
  expect(state.spendingCategories).toEqual([]);
  expect(JSON.stringify(state)).not.toContain('demo@example.com');
});
