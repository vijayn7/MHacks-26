import { test, expect } from '@playwright/test';

test('sliders animate a temporary happy companion and restore the saved face', async ({ page }) => {
  await page.goto('/profile');
  const flame = page.getByRole('button', { name: /^pet your flame/ }).first();
  for (const name of ['flame color blend', 'burn rate']) {
    const slider = page.getByRole('slider', { name, exact: true });
    const box = (await slider.boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.55, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2, { steps: 5 });
    await expect(flame.getByTestId('flame-face-happy')).toBeVisible();
    await expect(flame.getByTestId('slider-spark')).toHaveCount(1);
    await page.waitForTimeout(500);
    await expect(flame.getByTestId('flame-face-happy')).toBeVisible();
    await page.mouse.up();
    await expect(flame.getByTestId('flame-face-classic')).toBeVisible();
    await expect(flame.getByTestId('slider-spark')).toHaveCount(0);
  }
  const slider = page.getByRole('slider', { name: 'flame color blend', exact: true });
  await slider.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(flame.getByTestId('flame-face-happy')).toBeVisible();
  await expect(flame.getByTestId('flame-face-classic')).toBeVisible();
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('snuff.mobile.v2')!));
  expect(state.face).toBe('classic');
  expect(state.pauses).toBe(11);
});
