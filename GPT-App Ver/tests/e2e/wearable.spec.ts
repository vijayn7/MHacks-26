import { test, expect } from './fixtures';

test('demo watch connects, captures mixed feelings and clears private history', async ({
  page,
}) => {
  await page.goto('/wearable');
  await page.getByRole('button', { name: 'connect demo watch', exact: true }).click();
  await expect(page.getByText('demo watch connected', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'try a spending moment' }).click();
  await page.getByRole('checkbox', { name: 'excited', exact: true }).click();
  await page.getByRole('checkbox', { name: 'anxious', exact: true }).click();
  await page.getByRole('button', { name: 'continue', exact: true }).click();
  await expect(page.getByText('92 bpm', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'save for later', exact: true }).click();
  await page.getByRole('checkbox', { name: 'calm', exact: true }).click();
  await page.getByRole('button', { name: 'save check-in', exact: true }).click();
  await expect(
    page.getByText('92 bpm average during 1 demo moments', { exact: true }),
  ).toBeVisible();
  await page.reload();
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('snuff.mobile.v2')!));
  expect(state.wearable.moments[0].before).toEqual(['excited', 'anxious']);
  expect(state.wearable.moments[0].after).toEqual(['calm']);
  expect(state.savings).toBe(284);
  expect(state.archive[0].name).toBe('Studio headphones');
  await page.getByRole('button', { name: 'view moment Studio headphones' }).click();
  await page.getByRole('button', { name: 'before moment' }).click();
  await expect(page.getByText('68 bpm', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'done', exact: true }).click();
  await page.getByRole('button', { name: 'wearable settings' }).click();
  await page.getByRole('button', { name: 'delete watch & feeling data' }).click();
  await page.getByRole('button', { name: 'delete data', exact: true }).click();
  await expect(page.getByText('your check-ins will live here.', { exact: true })).toBeVisible();
});

test('check-ins work without a watch and stale readings do not appear as current', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/wearable');
  await page.getByRole('button', { name: 'try a spending moment' }).click();
  await expect(page.getByText('no recent reading', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'skip feelings' }).click();
  await page.getByRole('button', { name: 'let it go' }).click();
  await page.getByRole('button', { name: 'save check-in' }).click();
  await page.getByRole('button', { name: 'wearable settings' }).click();
  await page.getByRole('button', { name: 'delayed reading' }).click();
  await expect(page.getByText('no recent reading', { exact: true })).toBeVisible();
});
