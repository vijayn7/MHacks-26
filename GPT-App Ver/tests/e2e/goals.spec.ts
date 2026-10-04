import { test, expect } from '@playwright/test';
import { initialState } from '../../src/state/model';
import { freshPlan } from '../../src/state/blocking';

test('home flow validates, saves a goal, and previews a block without creating fake savings', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/');
  await page.getByRole('button', { name: 'set a goal', exact: true }).click();
  await page.getByRole('button', { name: 'continue', exact: true }).click();
  await expect(page.getByText('give your goal a name, up to 60 characters.')).toBeVisible();
  await page.getByRole('textbox', { name: 'goal name', exact: true }).fill('a weekend away');
  await page.getByRole('textbox', { name: 'savings goal in dollars' }).fill('700');
  await page.getByRole('button', { name: '90 days', exact: true }).click();
  await page.getByRole('button', { name: 'continue', exact: true }).click();
  await page.getByRole('textbox', { name: 'another website' }).fill('https://www.example.com/cart');
  await page.getByRole('button', { name: 'add website', exact: true }).click();
  await page.getByRole('textbox', { name: 'pause purchases from this amount' }).fill('65');
  await page.getByRole('button', { name: 'continue', exact: true }).click();
  await page.getByRole('button', { name: 'quiet hours', exact: true }).click();
  await page.getByRole('textbox', { name: 'starts at' }).fill('25:00');
  await page.getByRole('button', { name: 'continue', exact: true }).click();
  await expect(
    page.getByText('choose days and two different times in 24-hour format.'),
  ).toBeVisible();
  await page.getByRole('textbox', { name: 'starts at' }).fill('21:00');
  await page.getByRole('button', { name: 'any time', exact: true }).click();
  await page.getByRole('button', { name: 'continue', exact: true }).click();
  await page.getByRole('button', { name: '30 min', exact: true }).click();
  await page.getByRole('button', { name: 'continue', exact: true }).click();
  await expect(page.getByText('a weekend away · $700 in 90 days')).toBeVisible();
  await page.getByRole('button', { name: 'save my plan', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: 'test your block', exact: true }).click();
  await page.getByRole('textbox', { name: 'preview website' }).fill('example.com');
  await page.getByRole('button', { name: 'preview checkout', exact: true }).click();
  await expect(page.getByText('a little space before you decide.')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'continue in preview', exact: true }),
  ).toBeDisabled();
  await page.getByRole('textbox', { name: 'why continue now?' }).fill('a planned purchase');
  await page.getByRole('button', { name: 'continue in preview', exact: true }).click();
  await expect(page.getByText('preview complete. your choice, made with intention.')).toBeVisible();
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('snuff.mobile.v2')!));
  expect(state.plan.domains).toEqual(['amazon.com', 'example.com']);
  expect(state.plan.target).toBe(700);
  expect(state.plan.cooldownMinutes).toBe(30);
  expect(state.plan.baselineSavings).toBe(284);
  expect(state.savings).toBe(284);
  expect(state.pauses).toBe(11);
});

test('flame crown keeps moving at rest without touching it and respects reduced motion', async ({
  page,
}) => {
  await page.goto('/');
  const crown = page.getByTestId('flame-crown');
  const initial = await crown.getAttribute('d');
  await expect.poll(() => crown.getAttribute('d')).not.toBe(initial);
  await page.waitForTimeout(4000);
  const later = await crown.getAttribute('d');
  await expect.poll(() => crown.getAttribute('d')).not.toBe(later);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  // Let the accessibility preference stop its active animation.
  await page.waitForTimeout(300);
  const still = await crown.getAttribute('d');
  await page.waitForTimeout(250);
  expect(await crown.getAttribute('d')).toBe(still);
});

test('a timed preview unlocks after its pause and a disabled rule allows checkout', async ({
  page,
}) => {
  const saved = {
    ...initialState(),
    plan: { ...freshPlan(284), title: 'travel', cooldownMinutes: 1, allowOverride: false },
  };
  await page.addInitScript(
    (state) => localStorage.setItem('snuff.mobile.v2', JSON.stringify(state)),
    saved,
  );
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('button', { name: 'test your block', exact: true }).click();
  await page.getByRole('button', { name: 'preview checkout', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'why continue now?' })).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'continue in preview', exact: true }),
  ).toBeDisabled();
  await page.clock.fastForward(61000);
  await expect(
    page.getByRole('button', { name: 'continue in preview', exact: true }),
  ).toBeEnabled();
  await page.getByRole('button', { name: 'close sheet' }).click();
  await page.getByRole('switch', { name: 'use these rules in preview' }).click();
  await page.getByRole('button', { name: 'test your block', exact: true }).click();
  await page.getByRole('button', { name: 'preview checkout', exact: true }).click();
  await expect(page.getByText('your block is paused.')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'continue in preview', exact: true }),
  ).toBeEnabled();
});
