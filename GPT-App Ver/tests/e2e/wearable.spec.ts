import { test, expect, initialState } from './fixtures';

test('watch context stays inside the purchase popup and home', async ({ page }) => {
  const state = initialState();
  state.notificationsEnabled = true;
  state.nudges[0].dueAt = Date.now() - 1000;
  state.wearable = {
    status: 'connected',
    enabled: true,
    baseline: 68,
    reading: { bpm: 82, at: Date.now() },
    moments: [],
  };
  await page.addInitScript((s) => {
    if (!sessionStorage.getItem('watch-seeded')) {
      localStorage.setItem('snuff.mobile.v2', JSON.stringify(s));
      sessionStorage.setItem('watch-seeded', '1');
    }
  }, state);
  await page.goto('/');
  await page.getByRole('button', { name: 'how are you feeling', exact: true }).click();
  await page.getByRole('checkbox', { name: 'excited', exact: true }).click();
  await page.getByRole('button', { name: 'save for later', exact: true }).click();
  await expect
    .poll(async () =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem('snuff.mobile.v2')!).wearable.moments.length,
      ),
    )
    .toBe(1);
  await page.reload();
  await expect(page.getByTestId('home-rhythm')).toContainText('excited');
  await expect(page.getByTestId('home-rhythm')).toContainText('82 bpm');
  await expect(page.getByRole('button', { name: 'your spending moments' })).toHaveCount(0);
});

test('watch settings stay in profile and onboarding has no watch detour', async ({ page }) => {
  await page.goto('/profile');
  await page.getByRole('button', { name: 'open settings' }).click();
  await page.getByRole('button', { name: 'watch insights', exact: true }).click();
  await page.getByRole('button', { name: 'turn on insights', exact: true }).click();
  await expect(page.getByRole('button', { name: 'turn off insights', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'clear readings & feelings' }).click();
  const data = await page.evaluate(
    () => JSON.parse(localStorage.getItem('snuff.mobile.v2')!).wearable,
  );
  expect(data.moments).toEqual([]);
  expect(data.reading).toBeNull();
});
