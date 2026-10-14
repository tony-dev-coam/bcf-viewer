import { test, expect } from '@playwright/test';

test('loads the example model and lists it in File Management (WL-04, FM-01/03)', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start with a BIM example model' }).click();
  await page.getByRole('button', { name: 'File Management' }).click();
  const panel = page.locator('section');
  await expect(panel.getByText('school_str')).toBeVisible();
  // Ready = the download-as-frag action becomes enabled.
  await expect(panel.getByRole('button', { name: 'Download as .frag' })).toBeEnabled({ timeout: 45_000 });
});

test('nothing but same-origin requests while loading (FM-05)', async ({ page }) => {
  const foreign: string[] = [];
  page.on('request', (r) => { if (!r.url().startsWith('http://localhost:5199')) foreign.push(r.url()); });
  await page.goto('/');
  await page.getByRole('button', { name: 'Start with a BIM example model' }).click();
  await page.getByRole('button', { name: 'File Management' }).click();
  await expect(page.getByRole('button', { name: 'Download as .frag' })).toBeEnabled({ timeout: 45_000 });
  expect(foreign.filter((u) => !u.startsWith('data:') && !u.startsWith('blob:'))).toEqual([]);
});
