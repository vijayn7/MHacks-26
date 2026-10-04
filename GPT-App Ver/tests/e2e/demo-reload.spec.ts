import { test, expect } from '@playwright/test';
async function onboard(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'begin onboarding' }).click();
  await page.getByRole('textbox', { name: 'first name', exact: true }).fill('Jamie');
  await page.getByRole('textbox', { name: 'last name', exact: true }).fill('Chen');
  await page.getByRole('button', { name: 'continue with google', exact: true }).click();
  await page.getByRole('button', { name: 'skip', exact: true }).click();
  await page.getByRole('button', { name: 'start', exact: true }).click();
}
test('reload restarts onboarding, archive stays populated, and Home replaces goals with feelings', async ({
  page,
}) => {
  await page.goto('/');
  await onboard(page);
  await expect(page.getByRole('button', { name: 'set a goal' })).toHaveCount(0);
  await page
    .getByTestId('home-rhythm')
    .getByRole('checkbox', { name: 'calm', exact: true })
    .click();
  await page.getByRole('button', { name: 'save check-in', exact: true }).click();
  await page.getByRole('tab', { name: 'archive', exact: true }).click();
  await expect(page.getByTestId('archive-scroll')).toBeVisible();
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('snuff.mobile.v2')!));
  expect(before.archive.length).toBeGreaterThanOrEqual(6);
  await page.reload();
  await expect(page.getByRole('button', { name: 'begin onboarding' })).toBeVisible();
  await onboard(page);
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('snuff.mobile.v2')!));
  expect(after.archive.length).toBe(before.archive.length);
  expect(after.wearable.moments[0].before).toEqual(['calm']);
  await page.getByRole('tab', { name: 'profile', exact: true }).click();
  await page.getByRole('button', { name: 'open settings' }).click();
  await page.getByRole('button', { name: 'apple watch', exact: true }).click();
  await page.getByRole('button', { name: 'connect apple watch', exact: true }).click();
  await expect(page.getByRole('button', { name: 'disconnect watch', exact: true })).toBeVisible();
});
