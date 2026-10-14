import { test, expect, type Page } from '@playwright/test';
import { loadExample, openGroup, clickViewport } from './helpers';

const topicCard = (page: Page) => page.getByRole('dialog', { name: 'BCF Topic' });
const bcfPanel = (page: Page) => page.locator('section');

async function createTopic(page: Page, title: string) {
  await bcfPanel(page).getByRole('button', { name: 'New topic' }).click();
  const card = topicCard(page);
  await expect(card).toBeVisible();
  await card.getByPlaceholder('Short summary of the issue').fill(title);
  await card.getByRole('textbox', { name: 'Add comment' }).fill('Beam clashes with duct');
  await card.getByRole('button', { name: 'Send' }).click();
  await expect(card.getByRole('textbox', { name: 'Add comment' })).toHaveValue(''); // sent
  await expect(card.getByRole('button', { name: 'Remove comment' })).toHaveCount(1); // editable session comment
  await card.getByRole('button', { name: 'Save' }).click();
  await expect(card.getByRole('button', { name: 'Edit' })).toBeVisible();
}

test('create topic (author prompt), export BCF 2.1, delete, re-import (BM-01/02/08, BT-01/02/03/07)', async ({ page }) => {
  test.setTimeout(150_000); // long end-to-end flow under software WebGL
  await loadExample(page);
  await page.getByRole('button', { name: 'BCF Management' }).click();

  // First creation asks for the author.
  await bcfPanel(page).getByRole('button', { name: 'New topic' }).click();
  const authorDialog = page.getByRole('dialog').filter({ hasText: 'Your name or email' });
  await authorDialog.getByPlaceholder('Name or email (recommended)').fill('qa@example.com');
  await authorDialog.getByRole('button', { name: 'OK' }).click();
  const card = topicCard(page);
  await card.getByRole('button', { name: 'Cancel' }).click();

  await createTopic(page, 'STR / ARC - Clash');
  await expect(bcfPanel(page).getByText('1 topics')).toBeVisible();
  await expect(bcfPanel(page).getByRole('row', { name: /STR \/ ARC - Clash/ }).locator('img')).toBeVisible(); // thumbnail

  // Export as 2.1
  await bcfPanel(page).getByRole('button', { name: 'Export BCF' }).click();
  const exportDialog = page.getByRole('dialog').filter({ hasText: 'BCF version' });
  await exportDialog.getByText('BCF 2.1').click();
  const [download] = await Promise.all([page.waitForEvent('download'), exportDialog.getByRole('button', { name: 'Export BCF' }).click()]);
  const path = test.info().outputPath('topics.bcfzip');
  await download.saveAs(path);

  // Delete all
  await bcfPanel(page).getByRole('button', { name: 'Delete topics' }).click();
  await page.getByRole('dialog').filter({ hasText: 'cannot be restored' }).getByRole('button', { name: /Delete all/ }).click();
  await expect(bcfPanel(page).getByText('Drag & drop BCF files here')).toBeVisible();

  // Re-import
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), bcfPanel(page).getByRole('button', { name: 'Import BCF' }).click()]);
  await chooser.setFiles(path);
  await expect(bcfPanel(page).getByText('1 topics')).toBeVisible();
  await bcfPanel(page).getByText('STR / ARC - Clash').click();
  await expect(card.getByText('Beam clashes with duct')).toBeVisible();
  await expect(card.getByRole('button', { name: /Go to viewpoint/ }).locator('img')).toBeVisible();
});

test('unsaved edits prompt before discarding (BT-07)', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('bcf.author', 'qa@example.com'));
  await loadExample(page);
  await page.getByRole('button', { name: 'BCF Management' }).click();
  await bcfPanel(page).getByRole('button', { name: 'New topic' }).click();
  await topicCard(page).getByPlaceholder('Short summary of the issue').fill('Draft');
  await topicCard(page).getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByText('Unsaved changes will be lost.')).toBeVisible();
  await page.getByRole('button', { name: 'Keep editing' }).click();
  await expect(topicCard(page).getByPlaceholder('Short summary of the issue')).toHaveValue('Draft');
});

test('new topic + pin from the toolbar places a pin (BT-04/08)', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('bcf.author', 'qa@example.com'));
  await loadExample(page);
  const menu = await openGroup(page, 'BCF');
  await menu.getByRole('button', { name: 'New BCF topic + pin' }).click();
  await page.mouse.move(5, 300);
  await clickViewport(page, 0.5, 0.62);
  const card = topicCard(page);
  await card.getByPlaceholder('Short summary of the issue').fill('Missing railing');
  await card.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('button', { name: 'Pin: Missing railing' })).toBeVisible();
});
