import { test, expect, Page } from '@playwright/test';
import { initialState, type AppState } from '../../src/state/model';
const snapshot = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('snuff.mobile.v2') || '{}') as AppState);
async function hold(page: Page, ms: number) {
  const box = await page.getByTestId('snuff-flame').boundingBox();
  if (!box) throw Error('Mascot missing');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}
test('Home follows the minimal wireframe and opens immediately', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('snuff-flame')).toBeVisible();
  await expect(page.getByRole('tab')).toHaveCount(3);
  await expect(page.getByText('you’ve saved', { exact: true })).toBeVisible();
  expect(await page.locator('body').innerText()).not.toMatch(/[A-Z]/);
  await expect(page.getByText('$284', { exact: true })).toBeVisible();
  await expect(page.getByTestId('savings-chart')).toBeVisible();
  await expect(page.getByText('your quiet score')).toHaveCount(0);
  await expect(page.getByText('the cooling room')).toHaveCount(0);
  const geometry = await page.evaluate(() => ({
    width: innerWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(geometry.scroll).toBe(geometry.width);
});
test('the inline mascot restores after a canceled hold and counts a completed hold once', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByTestId('snuff-flame')).toBeVisible();
  await hold(page, 450);
  await expect.poll(async () => (await snapshot(page)).pauses).toBe(11);
  await page.waitForTimeout(400);
  await hold(page, 3100);
  await expect(page.getByText('a little space. that’s all.')).toBeVisible();
  await expect.poll(async () => (await snapshot(page)).pauses).toBe(12);
  await expect.poll(async () => (await snapshot(page)).savings).toBe(284);
  await page.reload();
  await expect(page.getByText('12', { exact: true })).toBeVisible();
});
test('notification snuffing updates the Home sentence and chart and remains idempotent after reload', async ({
  page,
}) => {
  await page.goto('/profile');
  await page.getByRole('button', { name: 'try a nudge', exact: true }).click();
  await expect(page.getByText('studio headphones · $149')).toBeVisible({ timeout: 8000 });
  await page.getByRole('button', { name: 'yes, snuff this urge' }).click();
  await expect(page.getByText('$149, kept.')).toBeVisible();
  await page.getByRole('button', { name: 'back to my day' }).click();
  await expect(page.getByText('$433', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('$433', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'profile', exact: true }).click();
  await page.getByRole('button', { name: 'try a nudge' }).click();
  await expect(page.getByText('$149, kept.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'yes, snuff this urge' })).toHaveCount(0);
  expect((await snapshot(page)).savings).toBe(433);
});
test('the simple Social podium opens leaderboards and adds a persistent connection', async ({
  page,
}) => {
  await page.goto('/social');
  await expect(page.getByRole('button', { name: 'leaderboard', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'leaderboard', exact: true }).click();
  await expect(page.getByText('little friendly fire.')).toBeVisible();
  await page.getByRole('button', { name: 'close sheet' }).click();
  await page.getByRole('button', { name: 'connect with a friend' }).click();
  await page.getByRole('textbox', { name: 'friend’s email' }).fill('bad');
  await page.getByRole('button', { name: 'connect', exact: true }).click();
  await expect(page.getByText('a valid email is all you need.')).toBeVisible();
  await page.getByRole('textbox', { name: 'friend’s email' }).fill('jamie@example.com');
  await page.getByRole('button', { name: 'connect', exact: true }).click();
  await expect(page.getByText('jamie@example.com is in your circle.')).toBeVisible();
  await page.getByRole('button', { name: 'done', exact: true }).click();
  await page.reload();
  await expect.poll(async () => (await snapshot(page)).friends.length).toBe(4);
});
test('an empty account keeps the three-flame wireframe usable on a small phone', async ({
  page,
}) => {
  const empty = { ...initialState(), friends: [], savings: 0, pauses: 0, dailySavings: {} };
  await page.setViewportSize({ width: 320, height: 568 });
  await page.addInitScript(
    (state) => localStorage.setItem('snuff.mobile.v2', JSON.stringify(state)),
    empty,
  );
  await page.goto('/social');
  await expect(page.getByTestId('flame-mascot')).toHaveCount(3);
  const connection = page.getByRole('button', { name: 'connect with a friend' });
  const connectBox = await connection.boundingBox();
  const dockBox = await page.getByRole('tab', { name: 'social', exact: true }).boundingBox();
  expect(connectBox!.y + connectBox!.height).toBeLessThan(dockBox!.y);
  await connection.click();
  await expect(page.getByRole('textbox', { name: 'friend’s email' })).toBeVisible();
});
test('minimal Profile saves the name and preferences and delivers a test nudge with snooze', async ({
  page,
}) => {
  await page.goto('/profile');
  await page.getByRole('button', { name: 'edit your name' }).click();
  await page.getByRole('textbox', { name: 'your name' }).fill('Nico');
  await page.getByRole('button', { name: 'done', exact: true }).click();
  await expect(page.getByRole('button', { name: 'edit your name' })).toHaveText('nico');
  await page.getByRole('switch', { name: 'quiet notifications' }).click();
  await expect.poll(async () => (await snapshot(page)).notificationsEnabled).toBe(true);
  await page.getByRole('button', { name: 'try a nudge' }).click();
  await expect(page.getByText('snuff · a quiet nudge')).toBeVisible({ timeout: 8000 });
  await page.getByRole('button', { name: 'no, keep my flame' }).click();
  await page.getByRole('button', { name: 'tomorrow, maybe' }).click();
  await expect(page.getByText('snuff · a quiet nudge')).not.toBeVisible();
  expect((await snapshot(page)).nudges[0].dueAt).toBeGreaterThan(Date.now() + 86000000);
  await page.reload();
  await expect(page.getByRole('button', { name: 'edit your name' })).toHaveText('nico');
  await expect(page.getByRole('switch', { name: 'quiet notifications' })).toBeChecked();
});
test('all refreshed Figma assets and six mascot hues load correctly without browser errors', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/profile');
  for (const hue of ['Ember', 'Azure', 'Verdigris', 'Violet', 'Crimson', 'Ash']) {
    await page.getByRole('button', { name: 'choose your flame' }).click();
    await page.getByRole('button', { name: hue.toLowerCase() + ' flame', exact: true }).click();
    await expect.poll(async () => (await snapshot(page)).hue).toBe(hue);
    await page.getByRole('tab', { name: 'home', exact: true }).click();
    const images = page.getByTestId('snuff-flame').locator('img');
    await expect(images).toHaveCount(3);
    await expect
      .poll(async () =>
        images.evaluateAll((imgs) =>
          imgs.every((raw) => {
            const img = raw as HTMLImageElement;
            return img.complete && img.naturalWidth === 320 && img.naturalHeight === 380;
          }),
        ),
      )
      .toBe(true);
    const geometry = await images.first().boundingBox();
    expect(geometry).not.toBeNull();
    expect(geometry!.width / geometry!.height).toBeCloseTo(320 / 380, 4);
    await page.getByRole('tab', { name: 'profile', exact: true }).click();
  }
  await page.reload();
  await expect.poll(async () => (await snapshot(page)).hue).toBe('Ash');
  expect(errors).toEqual([]);
});
