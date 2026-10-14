import { expect, type Page } from '@playwright/test';

export async function loadExample(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start with a BIM example model' }).click();
  await page.getByRole('button', { name: 'File Management' }).click();
  await expect(page.getByRole('button', { name: 'Download as .frag' })).toBeEnabled({ timeout: 45_000 });
  await page.getByRole('button', { name: 'File Management' }).click(); // close panel
  await page.waitForTimeout(1500); // camera fit transition
}

/** Opens a toolbar group's pop-up menu and returns it. */
export async function openGroup(page: Page, group: string) {
  await page.getByRole('toolbar').getByRole('button', { name: group }).hover();
  const menu = page.getByRole('menu', { name: group });
  await expect(menu).toBeVisible();
  return menu;
}

export async function clickViewport(page: Page, x = 0.5, y = 0.5) {
  const box = (await page.getByTestId('viewport').boundingBox())!;
  await page.mouse.click(box.x + box.width * x, box.y + box.height * y);
}
