import { test, expect } from '@playwright/test';
import { loadExample } from './helpers';

const activeTool = (page: import('@playwright/test').Page) => page.evaluate(() => (window as any).__viewer.tools.store.getSnapshot().active);

test('right-click opens the radial menu; spokes fan out their group; picking runs it and closes (reference context menu)', async ({ page }) => {
  await loadExample(page);
  const box = (await page.getByTestId('viewport').boundingBox())!;
  const cx = box.x + box.width * 0.5, cy = box.y + box.height * 0.5;
  const menu = page.getByRole('menu', { name: 'Context menu' });

  // A right-drag pans the camera and must not open the menu.
  await page.mouse.move(cx, cy);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(cx + 60, cy + 20, { steps: 5 });
  await page.mouse.up({ button: 'right' });
  await expect(menu).toHaveCount(0);

  await page.mouse.click(cx, cy, { button: 'right' });
  await expect(menu).toBeVisible();
  // Four spokes + close, all collapsed; hovering a spoke fans out its group.
  for (const name of ['Select', 'Reset all', 'Length free', 'Set clipping plane', 'Close']) await expect(menu.getByRole('button', { name, exact: true }).first()).toBeVisible();
  await expect(menu.getByRole('button', { name: 'Selection rectangle' })).toHaveCount(0);
  await menu.getByRole('button', { name: 'Select', exact: true }).hover();
  await expect(menu.getByRole('button', { name: 'Selection rectangle' })).toBeVisible();

  // Hovering the visibility spoke fans out its six actions.
  await menu.getByRole('button', { name: 'Reset all' }).first().hover();
  // Never greyed out (as on the reference), even with nothing selected.
  for (const name of ['Isolate | Show all', 'Hide selected', 'Zoom to selection', 'Zoom to all', 'Show all']) await expect(menu.getByRole('button', { name, exact: true })).toBeEnabled();
  await expect(menu.getByRole('button', { name: 'Selection rectangle' })).toHaveCount(0);

  // Picking a measurement mode from its fan activates it and closes the menu.
  await menu.getByRole('button', { name: 'Length free' }).first().hover();
  await menu.getByRole('button', { name: 'Volume' }).click();
  await expect(menu).toHaveCount(0);
  expect(await activeTool(page)).toBe('volume');

  // Spokes remember the last tool used in their group, like the toolbar buttons.
  await page.evaluate(() => (window as any).__viewer.tools.activate('select'));
  await page.mouse.click(cx, cy, { button: 'right' });
  await expect(menu.getByRole('button', { name: 'Volume', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');

  // Escape and the close button both dismiss it.
  await page.mouse.click(cx, cy, { button: 'right' });
  await expect(menu).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
  await page.mouse.click(cx, cy, { button: 'right' });
  await menu.getByRole('button', { name: 'Close' }).click();
  await expect(menu).toHaveCount(0);
});
