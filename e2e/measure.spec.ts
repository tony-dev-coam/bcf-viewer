import { test, expect, type Page } from '@playwright/test';
import { loadExample, openGroup, clickViewport } from './helpers';

const count = (page: Page) => page.evaluate(() => (window as any).__viewer.measure.store.getSnapshot().count);

test('length free measurement: two clicks create one, delete all removes it (ME-01/07)', async ({ page }) => {
  await loadExample(page);
  let menu = await openGroup(page, 'Measurement');
  await menu.getByRole('button', { name: 'Length free' }).click();
  await page.mouse.move(5, 300);
  await clickViewport(page, 0.42, 0.55);
  await page.waitForTimeout(300);
  await clickViewport(page, 0.55, 0.66);
  await expect.poll(() => count(page)).toBe(1);

  // ESC leaves the tool, back to Select.
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => (window as any).__viewer.tools.store.getSnapshot().active)).toBe('select');

  menu = await openGroup(page, 'Measurement');
  await menu.getByRole('button', { name: 'Delete all measurements' }).click();
  await expect.poll(() => count(page)).toBe(0);
});

test('area face measurement on a slab (ME-05)', async ({ page }) => {
  await loadExample(page);
  const menu = await openGroup(page, 'Measurement');
  await menu.getByRole('button', { name: 'Area face' }).click();
  await page.mouse.move(5, 300);
  const box = (await page.getByTestId('viewport').boundingBox())!;
  await page.mouse.move(box.width * 0.5, box.height * 0.62, { steps: 5 });
  await page.waitForTimeout(600);
  await clickViewport(page, 0.5, 0.62);
  await expect.poll(() => count(page)).toBe(1);
});
