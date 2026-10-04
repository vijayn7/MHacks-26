import { test, expect } from './fixtures';
import { initialState } from './fixtures';

for (const width of [320, 390]) {
  test(`notification choices fit at ${width}px and no retains the customized companion`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 844 });
    const state = { ...initialState(), face: 'wink', notificationsEnabled: true };
    state.nudges[0].dueAt = Date.now() - 1000;
    await page.addInitScript(
      (s) => localStorage.setItem('snuff.mobile.v2', JSON.stringify(s)),
      state,
    );
    await page.goto('/');
    await expect(page.getByText('snuff this urge?', { exact: true })).toBeVisible();
    const companion = page.getByTestId('nudge-companion');
    await expect(companion.getByTestId('flame-face-wistful')).toBeVisible();
    for (const label of ['yes, snuff this urge', 'no, keep my flame', 'ask a friend']) {
      const box = (await page.getByRole('button', { name: label, exact: true }).boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(20);
      expect(box.x + box.width).toBeLessThanOrEqual(width - 20);
      expect(box.y + box.height).toBeLessThan(width === 320 ? 568 : 844);
    }
    await page.getByRole('button', { name: 'no, keep my flame', exact: true }).click();
    await expect(page.getByText('your choice.', { exact: true })).toBeVisible();
    await expect(companion.getByTestId('flame-face-wink')).toBeVisible();
    await expect(companion.getByRole('button')).toHaveAttribute('aria-label', /bright flame/);
    await page.getByRole('button', { name: 'back to my day' }).click();
    await expect(page.getByText('$284', { exact: true })).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => JSON.parse(localStorage.getItem('snuff.mobile.v2')!).nudges[0].status),
      )
      .toBe('kept');
  });
}

test('friend request previews keep purchase details private and do not claim a sent message', async ({
  page,
}) => {
  const state = { ...initialState(), notificationsEnabled: true };
  state.nudges[0].dueAt = Date.now() - 1000;
  await page.addInitScript(
    (s) => localStorage.setItem('snuff.mobile.v2', JSON.stringify(s)),
    state,
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'ask a friend', exact: true }).click();
  await page.getByRole('button', { name: 'ask sam', exact: true }).click();
  await expect(page.getByText('request preview', { exact: true })).toBeVisible();
  await expect(
    page.getByText('messaging isn’t connected yet. nothing has been sent.', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('studio headphones · $149')).toHaveCount(0);
  await page.getByRole('button', { name: 'back to nudge', exact: true }).click();
  await page.getByRole('button', { name: 'yes, snuff this urge', exact: true }).click();
  await expect(page.getByText('a little quieter.', { exact: true })).toBeVisible();
  await expect(page.getByTestId('nudge-companion').getByRole('button')).toHaveAttribute(
    'aria-label',
    /resting flame/,
  );
  await expect(page.getByTestId('nudge-companion')).toHaveCSS('opacity', '0.7');
});

test('an empty quiet circle links to Social and dismissing a nudge changes no totals', async ({
  page,
}) => {
  const state = { ...initialState(), friends: [], notificationsEnabled: true };
  state.nudges[0].dueAt = Date.now() - 1000;
  await page.addInitScript(
    (s) => localStorage.setItem('snuff.mobile.v2', JSON.stringify(s)),
    state,
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'ask a friend', exact: true }).click();
  await page.getByRole('button', { name: 'connect with a friend', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'social', exact: true })).toBeVisible();
  await expect(page.getByText('snuff · a quiet nudge')).toHaveCount(0);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('snuff.mobile.v2')!));
  expect(saved.savings).toBe(284);
  expect(saved.pauses).toBe(11);
  expect(saved.nudges[0].status).toBe('waiting');
});
