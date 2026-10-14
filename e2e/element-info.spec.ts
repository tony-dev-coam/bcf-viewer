import { test, expect } from '@playwright/test';
import { loadExample, clickViewport } from './helpers';

test('selecting an element shows its IFC data (EI-01/02)', async ({ page }) => {
  await loadExample(page);
  await page.getByRole('button', { name: 'Element Information' }).click();
  const panel = page.locator('section');
  await expect(panel.getByText('Select one element to view its information')).toBeVisible();
  await clickViewport(page, 0.5, 0.62);
  await expect(panel.getByRole('heading', { name: 'IFCSLAB' })).toBeVisible();
  await expect(panel.getByText('GlobalId')).toBeVisible();
  await panel.getByRole('tab', { name: 'Properties' }).click();
  await expect(panel.getByText('Dimensiones')).toBeVisible();
  await panel.getByRole('tab', { name: 'Materials' }).click();
  await expect(panel.getByRole('tabpanel').getByText(/Concrete/).first()).toBeVisible();
});
