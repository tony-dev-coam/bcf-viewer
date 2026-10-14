import { test, expect } from '@playwright/test';
import { loadExample } from './helpers';

test('model trees: relations, types, storeys, search, select, hide (MT-01…07)', async ({ page }) => {
  await loadExample(page);
  await page.getByRole('button', { name: 'Model Trees' }).click();
  const panel = page.locator('section');
  const tree = panel.getByRole('tree');
  await expect(tree.getByText('school_str', { exact: true })).toBeVisible({ timeout: 20_000 });

  await panel.getByRole('tab', { name: 'Types' }).click();
  await expect(tree.getByText('IFCSLAB', { exact: true })).toBeVisible();

  await panel.getByRole('tab', { name: 'Storeys' }).click();
  await expect(tree.getByText('03 - Floor', { exact: true })).toBeVisible();

  // Click a storey row → its elements are selected in 3D (Zoom to selection enabled via Element Info count).
  await tree.getByText('03 - Floor', { exact: true }).click();
  await page.getByRole('button', { name: 'Element Information' }).click();
  await expect(panel.getByText('Multiple elements selected')).toBeVisible();
  await page.getByRole('button', { name: 'Model Trees' }).click();

  // Hide the storey via its eye; it becomes dimmed / eye-closed.
  await panel.getByRole('tab', { name: 'Storeys' }).click();
  await tree.getByRole('button', { name: 'Show / hide 03 - Floor' }).click();
  await expect(tree.getByRole('button', { name: 'Show / hide 03 - Floor' }).locator('[aria-label="eye-invisible"]')).toBeVisible();

  // Search filters the tree.
  await panel.getByRole('tab', { name: 'Types' }).click();
  await panel.getByPlaceholder('Search...').fill('IFCBEAM');
  await expect(tree.getByText('IFCSLAB', { exact: true })).toHaveCount(0);
  await expect(tree.getByText('IFCBEAM', { exact: true })).toBeVisible();
});
