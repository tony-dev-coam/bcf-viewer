import { expect, type Page } from '@playwright/test';

/** Loads the structural school IFC through File Management (exercises the IFC → fragments worker). */
export async function loadExample(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Close', exact: true }).click(); // welcome modal
  await expect(page.getByText('Free Online IFC Viewer')).toBeHidden(); // modal fade-out would swallow the next click
  await page.getByRole('button', { name: 'File Management' }).click();
  await page.mouse.move(700, 300); // the rail tooltip would cover "Load files"
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Load files' }).click()]);
  await chooser.setFiles('public/examples/school_str.ifc');
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
