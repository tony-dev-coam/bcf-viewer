import { test, expect, type Page } from '@playwright/test';
import { loadExample, openGroup } from './helpers';

const selCount = (page: Page) => page.evaluate(() => (window as any).__viewer.selection.store.getSnapshot().count);

test('marquee: crossing box selects more than window box (SE-02)', async ({ page }) => {
  await loadExample(page);
  const menu = await openGroup(page, 'Selection');
  await menu.getByRole('button', { name: 'Marquee selection' }).click();
  await page.mouse.move(5, 300);
  const b = (await page.getByTestId('viewport').boundingBox())!;
  const drag = async (x1: number, y1: number, x2: number, y2: number) => {
    await page.mouse.move(b.width * x1, b.height * y1);
    await page.mouse.down();
    await page.mouse.move(b.width * x2, b.height * y2, { steps: 8 });
    await page.mouse.up();
  };
  await drag(0.45, 0.55, 0.6, 0.75); // left → right: fully inside
  await expect.poll(() => selCount(page)).toBeGreaterThan(0);
  const windowCount = await selCount(page);
  await drag(0.6, 0.75, 0.45, 0.55); // right → left: touching too
  await expect.poll(() => selCount(page)).toBeGreaterThan(windowCount);
});

test('settings: dark mode and outlines persist (ST-01/03/05)', async ({ page }) => {
  await loadExample(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('switch', { name: 'Dark mode' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.getByRole('switch', { name: 'Outlines' }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.getByRole('button', { name: 'Close', exact: true }).click(); // welcome modal
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('switch', { name: 'Outlines' })).not.toBeChecked();
});

test('help panel lists every area (HC-01)', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Close', exact: true }).click(); // welcome modal
  await page.getByRole('button', { name: 'Help' }).click();
  for (const t of ['File Management', 'Model Trees', 'BCF Topic', 'Measurement', 'Clipping']) await expect(page.locator('section').getByText(t, { exact: true })).toBeVisible();
});
