import { initialState } from './fixtures';
import { test, expect } from './fixtures';

test('profile color and burn rate persist across screens and reload', async ({ page }) => {
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
  await burn.press('Home');
  const glow = page.getByTestId('slider-glow');
  const dim = await glow.evaluate((e) => ({
    width: e.getBoundingClientRect().width,
    opacity: Number(getComputedStyle(e).opacity),
  }));
  await burn.press('End');
  const bright = await glow.evaluate((e) => ({
    width: e.getBoundingClientRect().width,
    opacity: Number(getComputedStyle(e).opacity),
  }));
  expect(bright.width).toBeGreaterThan(dim.width * 2);
  expect(bright.opacity).toBeGreaterThan(dim.opacity);
  await burn.press('ArrowLeft');
  await expect(burn).toHaveAttribute('aria-valuenow', '99');
  await expect(page.getByText('mindful', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'home', exact: true }).click();
  await expect(page.getByText('$284', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'profile', exact: true }).click();
  await page.reload();
  await expect(blend).toHaveAttribute('aria-valuenow', '1');
  await expect(burn).toHaveAttribute('aria-valuenow', '99');
  await expect(page.getByTestId('friend-avatar')).toHaveCount(3);
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
  await page.mouse.move(b.x + b.width - 2, b.y + b.height / 2, { steps: 10 });
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

for (const width of [320, 390]) {
  test(`friend icons stay on one row at ${width}px and overflow opens the full circle`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    const state = initialState();
    state.friends = Array.from({ length: 13 }, (_, i) => ({
      id: `friend-${i}`,
      name: `friend ${i + 1}`,
      email: `friend${i}@example.com`,
      hue: 'Ember',
      savings: 0,
    }));
    await page.addInitScript(
      (s) => localStorage.setItem('snuff.mobile.v2', JSON.stringify(s)),
      state,
    );
    await page.goto('/profile');
    const avatars = page.getByTestId('friend-avatar');
    const rects = await avatars.evaluateAll((elements) =>
      elements.map((e) => ({
        y: e.getBoundingClientRect().y,
        right: e.getBoundingClientRect().right,
      })),
    );
    expect(rects.length).toBeGreaterThan(0);
    expect(rects.length).toBeLessThan(10);
    expect(new Set(rects.map((r) => r.y)).size).toBe(1);
    expect(Math.max(...rects.map((r) => r.right))).toBeLessThan(width);
    await page.getByRole('button', { name: /show all trusted friends/ }).click();
    await expect(page.getByText('your quiet circle.', { exact: true })).toBeVisible();
    await page.getByText('friend 13', { exact: true }).scrollIntoViewIfNeeded();
    await expect(page.getByText('friend 13', { exact: true })).toBeVisible();
  });
}

test('an empty friend strip offers a connection without showing overflow', async ({ page }) => {
  await page.addInitScript((s) => localStorage.setItem('snuff.mobile.v2', JSON.stringify(s)), {
    ...initialState(),
    friends: [],
  });
  await page.goto('/profile');
  await expect(page.getByTestId('friend-avatar')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /show all trusted friends/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'add trusted friends' }).click();
  await expect(page.getByRole('button', { name: 'connect with a friend' })).toBeVisible();
});

test('face choices persist on the same companion across screens and preserve petting', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/profile');
  const flame = page.getByRole('button', { name: /^pet your flame/ });
  await page.getByRole('button', { name: 'customize face', exact: true }).click();
  await expect(page.getByRole('slider', { name: 'flame color blend' })).toHaveCount(0);
  for (const face of ['classic', 'happy', 'dreamy', 'wink']) {
    const choice = page.getByRole('button', { name: `${face} face`, exact: true });
    await choice.press('Enter');
    await expect(choice).toHaveAttribute('aria-pressed', 'true');
    await expect(flame.getByTestId(`flame-face-${face}`)).toBeVisible();
  }
  await expect(page.getByTestId('friend-avatar').getByTestId('flame-face-classic')).toHaveCount(3);
  await flame.press('Enter');
  await expect(flame).toHaveAttribute('aria-label', /tap/);
  await page.getByRole('button', { name: 'customize color', exact: true }).click();
  await expect(page.getByRole('slider', { name: 'flame color blend' })).toHaveAttribute(
    'aria-valuenow',
    '38',
  );
  for (const tab of ['home', 'social']) {
    await page.getByRole('tab', { name: tab, exact: true }).click();
    await expect(
      page
        .getByRole('button', { name: /^pet your flame/ })
        .first()
        .getByTestId('flame-face-wink'),
    ).toBeVisible();
  }
  await page.reload();
  await expect(
    page
      .getByRole('button', { name: /^pet your flame/ })
      .first()
      .getByTestId('flame-face-wink'),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'profile', exact: true }).click();
  await page.getByRole('button', { name: 'customize face', exact: true }).click();
  await expect(page.getByRole('button', { name: 'wink face', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem('snuff.mobile.v2')!));
  expect(persisted.face).toBe('wink');
  expect(persisted.pauses).toBe(11);
  expect(await page.locator('body').innerText()).not.toMatch(/[A-Z]/);
});
