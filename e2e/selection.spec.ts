import { test, expect } from '@playwright/test';
import { loadExample, openGroup, clickViewport } from './helpers';

test('click selects an element, ESC clears (SE-01)', async ({ page }) => {
  await loadExample(page);
  await clickViewport(page, 0.5, 0.62); // slab (centre is the courtyard)
  let menu = await openGroup(page, 'Visibility');
  await expect(menu.getByRole('button', { name: 'Zoom to selection' })).toBeEnabled();
  await page.mouse.move(5, 300); // close menu
  await page.keyboard.press('Escape');
  menu = await openGroup(page, 'Visibility');
  await expect(menu.getByRole('button', { name: 'Zoom to selection' })).toBeDisabled();
});
