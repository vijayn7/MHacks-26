import { test, expect } from '@playwright/test';
test('minimal Home syncs opt-out score and holding the flame does not count a pause', async ({
  page,
}) => {
  let ids = ['checkout-a:impulse_opt_out', 'checkout-b:impulse_opt_out'];
  await page.route('**/score', (route) => route.fulfill({ json: { optOutIds: ids } }));
  await page.goto('/');
  await page.getByRole('button', { name: 'begin onboarding' }).click();
  await page.getByRole('textbox', { name: 'first name', exact: true }).fill('Jamie');
  await page.getByRole('textbox', { name: 'last name', exact: true }).fill('Chen');
  await page.getByRole('button', { name: 'continue with google', exact: true }).click();
  await page.getByRole('button', { name: 'skip', exact: true }).click();
  await page.getByRole('button', { name: 'start', exact: true }).click();
  const score = page.getByTestId('extension-score');
  await expect(score).toContainText('20');
  await expect(page.getByText('a moment for you.', { exact: true })).toHaveCount(0);
  await expect(page.getByText(/hold to pause/)).toHaveCount(0);
  const pauses = await page.evaluate(
    () => JSON.parse(localStorage.getItem('snuff.mobile.v2')!).pauses,
  );
  const flame = await page.getByTestId('snuff-flame').boundingBox();
  await page.mouse.move(flame!.x + flame!.width / 2, flame!.y + flame!.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(3100);
  await page.mouse.up();
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('snuff.mobile.v2')!).pauses),
  ).toBe(pauses);
  ids = [...ids, ids[0], 'checkout-c:impulse_opt_out'];
  await expect(score).toContainText('30', { timeout: 15000 });
  await page.screenshot({ path: '../../outputs/snuff-home-score.png' });
  await page.setViewportSize({ width: 320, height: 568 });
  await score.scrollIntoViewIfNeeded();
  await expect(score).toBeVisible();
});
