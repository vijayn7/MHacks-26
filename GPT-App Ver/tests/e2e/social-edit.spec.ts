import { test, expect } from './fixtures';
test('friends can be renamed and removed without changing savings', async ({ page }) => {
  await page.goto('/social');
  await page.getByRole('button', { name: 'edit friends', exact: true }).click();
  await page.getByRole('button', { name: 'edit sam', exact: true }).click();
  await page.getByRole('textbox', { name: 'friend name' }).fill('sammy');
  await page.getByRole('button', { name: 'save changes' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'edit sammy', exact: true }).click();
  await page.getByRole('button', { name: 'remove from circle' }).click();
  await page.getByRole('button', { name: 'remove friend', exact: true }).click();
  await page.reload();
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('snuff.mobile.v2')!));
  expect(state.friends.some((f: { id: string }) => f.id === 'sam')).toBe(false);
  expect(state.trustedFriendId).toBeNull();
  expect(state.savings).toBe(284);
  await page.goto('/profile');
  await page.getByRole('button', { name: 'about burn rate' }).click();
  await expect(
    page.getByText('burn rate is a setting you choose, not a calculation from your spending.'),
  ).toBeVisible();
});
