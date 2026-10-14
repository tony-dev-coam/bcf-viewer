import { test, expect } from '@playwright/test';
import { loadExample } from './helpers';

test('example: federated ARC + STR models load from the welcome modal (WL-04, FM-01/03)', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start with a BIM example model' }).click();
  await page.getByRole('button', { name: 'File Management' }).click();
  const panel = page.locator('section');
  await expect(panel.getByText('school_arq')).toBeVisible();
  await expect(panel.getByText('school_str')).toBeVisible();
  // Ready = the download-as-frag action becomes enabled.
  await expect(panel.getByRole('button', { name: 'Download as .frag' })).toHaveCount(2);
  for (const b of await panel.getByRole('button', { name: 'Download as .frag' }).all()) await expect(b).toBeEnabled({ timeout: 45_000 });
  // Demo BCF comes with the example: 8 topics with pins.
  await page.getByRole('button', { name: 'BCF Management' }).click();
  await expect(page.locator('section').getByText('8 topics')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Pin: / })).not.toHaveCount(0);
});

test('IFC file converts in the worker and can be downloaded as .frag (FM-02/03)', async ({ page }) => {
  await loadExample(page);
  await page.getByRole('button', { name: 'File Management' }).click();
  await page.mouse.move(700, 300);
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download as .frag' }).click()]);
  expect(download.suggestedFilename()).toBe('school_str.frag');
});

test('nothing but same-origin requests while loading (FM-05)', async ({ page }) => {
  const foreign: string[] = [];
  page.on('request', (r) => { if (!r.url().startsWith('http://localhost:5199')) foreign.push(r.url()); });
  await page.goto('/');
  await page.getByRole('button', { name: 'Start with a BIM example model' }).click();
  await page.getByRole('button', { name: 'File Management' }).click();
  for (const b of await page.getByRole('button', { name: 'Download as .frag' }).all()) await expect(b).toBeEnabled({ timeout: 45_000 });
  expect(foreign.filter((u) => !u.startsWith('data:') && !u.startsWith('blob:'))).toEqual([]);
});
