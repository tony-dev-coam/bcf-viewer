import { test, expect, type Page } from '@playwright/test';
import { loadExample, openGroup, clickViewport } from './helpers';

const colors = (page: Page) => page.evaluate(() => Object.keys((window as any).__viewer.color.store.getSnapshot().custom));

test('paint tool colors the selection at once and clicked elements; clear removes (CO-01…04)', async ({ page }) => {
  await loadExample(page);
  await clickViewport(page, 0.5, 0.62);
  let menu = await openGroup(page, 'Color');
  await menu.getByRole('button', { name: 'Color items' }).click();
  await expect(page.getByRole('group', { name: 'Color items' })).toBeVisible();
  await expect.poll(() => colors(page)).toEqual(['#e74c3c']);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('group', { name: 'Color items' })).toBeHidden();

  menu = await openGroup(page, 'Color');
  await menu.getByRole('button', { name: 'Paper model (white)' }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__viewer.color.store.getSnapshot().mode)).toBe('white');

  menu = await openGroup(page, 'Color');
  await menu.getByRole('button', { name: 'Remove all custom colors' }).click();
  await expect.poll(() => colors(page)).toEqual([]);
});
