import { test, expect, type Page } from '@playwright/test';
import { loadExample, openGroup } from './helpers';

const camPos = (page: Page) =>
  page.evaluate(() => {
    const p = (window as any).__viewer.engine.world.camera.three.position;
    return [p.x, p.y, p.z] as number[];
  });

test('projection, top view and fly navigation (CA-01/02, NV-02)', async ({ page }) => {
  await loadExample(page);

  let menu = await openGroup(page, 'Camera');
  await menu.getByRole('button', { name: 'Orthographic' }).click();
  menu = await openGroup(page, 'Camera');
  await expect(menu.getByRole('button', { name: 'Orthographic' })).toHaveAttribute('aria-pressed', 'true');
  await menu.getByRole('button', { name: 'Perspective' }).click();

  menu = await openGroup(page, 'Camera');
  await menu.getByRole('button', { name: 'Top view' }).click();
  await page.waitForTimeout(1200);
  const top = await camPos(page);
  const target = await page.evaluate(() => {
    const t = (window as any).__viewer.engine.world.camera.controls.getTarget({ x: 0, y: 0, z: 0, set(x: number, y: number, z: number) { return { x, y, z }; } });
    return t;
  });
  expect(top[1]).toBeGreaterThan(target.y); // camera above the model

  menu = await openGroup(page, 'Navigation');
  await menu.getByRole('button', { name: 'Fly (first person)' }).click();
  await page.mouse.move(700, 200);
  const before = await camPos(page);
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(500);
  await page.keyboard.up('KeyW');
  const after = await camPos(page);
  expect(Math.hypot(after[0] - before[0], after[1] - before[1], after[2] - before[2])).toBeGreaterThan(0.5);
});
