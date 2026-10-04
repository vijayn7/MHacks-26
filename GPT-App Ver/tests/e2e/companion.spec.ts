import { test, expect, type Page, type Locator } from '@playwright/test';

async function stroke(page: Page, flame: Locator, count = 6) {
  const box = await flame.boundingBox();
  if (!box) throw new Error('flame missing');
  const x = box.x + box.width / 2;
  const y = box.y + box.height * 0.62;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 0; i < count; i++) {
    await page.mouse.move(x + (i % 2 ? 28 : -28), y + (i % 2 ? 35 : -35), { steps: 12 });
    await page.waitForTimeout(120);
  }
  await page.mouse.up();
}
const progress = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('snuff.mobile.v2') || '{}'));

test('strokes soothe the same companion across screens without recording a pause', async ({
  page,
}) => {
  await page.goto('/');
  const home = page.getByTestId('flame-mascot');
  await expect(home).toBeVisible();
  await stroke(page, home, 10);
  await expect(home).toHaveAttribute('aria-label', /stroke/);
  expect((await progress(page)).pauses).toBe(11);
  expect((await progress(page)).savings).toBe(284);
  await page.getByRole('tab', { name: 'profile', exact: true }).click();
  await expect(page.getByRole('button', { name: 'edit your name' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^pet your flame/ }).last()).toHaveAttribute(
    'aria-label',
    /content/,
  );
  await page.getByRole('tab', { name: 'social', exact: true }).click();
  await expect(page.getByRole('button', { name: /^pet your flame/ })).toHaveAttribute(
    'aria-label',
    /content/,
  );
  await page.getByRole('button', { name: 'leaderboard', exact: true }).click();
  await expect(page.getByRole('button', { name: /^pet your flame/ }).last()).toHaveAttribute(
    'aria-label',
    /content/,
  );
});

test('moving a long press cancels the pause and release stops petting', async ({ page }) => {
  await page.goto('/');
  const flame = page.getByTestId('flame-mascot');
  await expect(flame).toBeVisible();
  const box = (await flame.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(650);
  await page.mouse.move(box.x + box.width / 2 + 35, box.y + box.height / 2 + 30, { steps: 8 });
  await page.waitForTimeout(2600);
  await page.mouse.up();
  expect((await progress(page)).pauses).toBe(11);
  await expect(flame).toHaveAttribute('aria-label', /content|peaceful/, { timeout: 4000 });
});

test('taps and holds have distinct reactions on small mascots, including resting nudges', async ({
  page,
}) => {
  await page.goto('/profile');
  const flame = page.getByRole('button', { name: /^pet your flame/ });
  await flame.click();
  await expect(flame).toHaveAttribute('aria-label', /tap/);
  const box = (await flame.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(1100);
  await expect(flame).toHaveAttribute('aria-label', /hold/);
  await page.mouse.up();
  expect((await progress(page)).pauses).toBe(11);
  await page.getByRole('button', { name: 'try a nudge' }).click();
  await page.getByRole('button', { name: 'yes, snuff this urge' }).click({ timeout: 9000 });
  const resting = page.getByTestId('flame-mascot').last();
  await expect(resting).toHaveAttribute('aria-label', /resting/);
  await stroke(page, resting, 3);
  await expect(resting).toHaveAttribute('aria-label', /stroke, resting/);
  expect((await progress(page)).savings).toBe(433);
});

test('keyboard petting works with reduced motion and leaves savings untouched', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const flame = page.getByTestId('flame-mascot');
  await flame.press('Enter');
  await expect(flame).toHaveAttribute('aria-label', /tap/);
  await flame.press('Space');
  expect((await progress(page)).pauses).toBe(11);
  expect((await progress(page)).savings).toBe(284);
});

test('the user flame carries its resting and low status between screens', async ({ page }) => {
  await page.goto('/');
  const flame = page.getByTestId('flame-mascot');
  await expect(flame).toBeVisible();
  const box = (await flame.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(3000);
  await page.mouse.up();
  await expect(flame).toHaveAttribute('aria-label', /resting/);
  await page.getByRole('tab', { name: 'profile', exact: true }).click();
  await expect(page.getByRole('button', { name: 'edit your name' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^pet your flame/ }).last()).toHaveAttribute(
    'aria-label',
    /resting/,
  );
  await expect(page.getByRole('button', { name: /^pet your flame/ }).last()).toHaveAttribute(
    'aria-label',
    /low flame/,
    {
      timeout: 5000,
    },
  );
  expect((await progress(page)).pauses).toBe(12);
});
