import { test, expect, type Page } from '@playwright/test';
import { loadExample, openGroup, clickViewport } from './helpers';

const planes = (page: Page) => page.evaluate(() => (window as any).__viewer.clip.store.getSnapshot().planes);

test('clipping plane on a face, toggle, delete all (CL-01/03/05)', async ({ page }) => {
  await loadExample(page);
  let menu = await openGroup(page, 'Clipping');
  await menu.getByRole('button', { name: 'Set clipping plane' }).click();
  await page.mouse.move(5, 300);
  await clickViewport(page, 0.5, 0.62);
  await expect.poll(() => planes(page)).toBe(1);
  // Regression: planes must reach the fragments materials, or nothing is actually cut.
  await expect.poll(() => page.evaluate(() =>
    [...(window as any).__viewer.engine.fragments.core.models.materials.list.values()].every((m: any) => m.clippingPlanes?.length === 1),
  )).toBe(true);

  menu = await openGroup(page, 'Clipping');
  await menu.getByRole('button', { name: 'Disable clipping' }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__viewer.clip.store.getSnapshot().enabled)).toBe(false);

  menu = await openGroup(page, 'Clipping');
  await menu.getByRole('button', { name: 'Delete all clipping planes' }).click();
  await expect.poll(() => planes(page)).toBe(0);
});

test('clipping box around the selection creates 6 planes (CL-02)', async ({ page }) => {
  await loadExample(page);
  await clickViewport(page, 0.5, 0.62);
  const menu = await openGroup(page, 'Clipping');
  await menu.getByRole('button', { name: 'Set clipping box' }).click();
  await expect.poll(() => planes(page)).toBe(6);
});
