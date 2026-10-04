import { test, expect } from '@playwright/test';

test('profile color, burn rate, and trusted friend settings persist across screens and reload', async ({
  page,
}) => {
  await page.goto('/profile');
  await expect(page.getByText('make it yours.')).toBeVisible();
  await page.getByRole('button', { name: 'choose your blend color' }).click();
  await page.getByRole('button', { name: 'crimson flame', exact: true }).click();
  // Wait for the closing sheet to release its focus trap before keyboard input.
  await expect(page.getByRole('button', { name: 'close sheet', includeHidden: true })).toHaveCount(
    0,
  );
  const blend = page.getByRole('slider', { name: 'flame color blend' });
  await blend.press('Home');
  await blend.press('ArrowRight');
  await expect(blend).toHaveAttribute('aria-valuenow', '1');
  const burn = page.getByRole('slider', { name: 'burn rate', exact: true });
  await burn.press('End');
  await burn.press('ArrowLeft');
  await expect(burn).toHaveAttribute('aria-valuenow', '99');
  await expect(page.getByText('mindful', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'choose trusted friend' }).click();
  await page.getByRole('button', { name: 'trust ria', exact: true }).click();
  await page.getByRole('tab', { name: 'home', exact: true }).click();
  await expect(page.getByText('$284', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'profile', exact: true }).click();
  await page.reload();
  await expect(blend).toHaveAttribute('aria-valuenow', '1');
  await expect(burn).toHaveAttribute('aria-valuenow', '99');
  await expect(page.getByRole('button', { name: 'choose trusted friend' })).toContainText('ria');
  expect(await page.locator('body').innerText()).not.toMatch(/[A-Z]/);
  const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem('snuff.mobile.v2')!));
  expect(persisted.blendHue).toBe('Crimson');
  expect(persisted.pauses).toBe(11);
});

test('profile remains usable on a small phone and sliders respond to dragging', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/profile');
  const blend = page.getByRole('slider', { name: 'flame color blend' });
  const b = (await blend.boundingBox())!;
  await page.mouse.move(b.x + 10, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width - 10, b.y + b.height / 2, { steps: 10 });
  await page.mouse.up();
  await expect(blend).toHaveAttribute('aria-valuenow', '100');
  await page.getByRole('switch', { name: 'quiet notifications' }).scrollIntoViewIfNeeded();
  await page.getByRole('switch', { name: 'quiet notifications' }).click();
  await expect(page.getByRole('switch', { name: 'quiet notifications' })).toBeChecked();
  const dimensions = await page.evaluate(() => ({
    width: innerWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scroll).toBe(dimensions.width);
});
