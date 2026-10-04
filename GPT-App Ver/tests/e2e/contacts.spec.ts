import { test, expect } from './fixtures';
test('system contacts option explains native availability and preserves email entry on web', async ({
  page,
}) => {
  await page.goto('/social');
  await page.getByRole('button', { name: 'connect with a friend', exact: true }).click();
  await expect(page.getByRole('button', { name: 'sync contacts', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'sync contacts', exact: true }).click();
  await expect(page.getByText('sync from your phone.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'use email instead', exact: true }).click();
  await page.getByRole('textbox', { name: 'friend’s email' }).fill('casey@example.com');
  await page.getByRole('button', { name: 'connect', exact: true }).click();
  await expect(
    page.getByText('casey@example.com is in your circle.', { exact: true }),
  ).toBeVisible();
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('snuff.mobile.v2')!));
  expect(state.friends).toHaveLength(4);
  expect(state.friends[3].email).toBe('casey@example.com');
});
