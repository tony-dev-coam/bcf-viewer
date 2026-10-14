// Interop with the reference viewer's own files. Fixtures are crais's (all rights reserved) → kept local in
// test-fixtures/crais (gitignored); this spec skips when they are absent.
import { test, expect, type Page } from '@playwright/test';
import { existsSync } from 'node:fs';

const DIR = 'test-fixtures/crais';
const BASE = `/@fs/${process.cwd()}/${DIR}/`;
test.skip(!existsSync(`${DIR}/example-bcf.bcfzip`), 'crais fixtures not downloaded');
test.setTimeout(240_000);

async function load(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.evaluate(async (base) => {
    const v = (window as any).__viewer;
    await v.models.loadUrls(['example-arc', 'example-mep', 'example-str'].map((n) => base + n + '.frag'));
    const blob = await (await fetch(base + 'example-bcf.bcfzip')).blob();
    await v.bcf.importFile(new File([blob], 'example-bcf.bcfzip'));
  }, BASE);
}

const state = (page: Page, title: string) =>
  page.evaluate(async (t) => {
    const v = (window as any).__viewer;
    const row = v.bcf.store.getSnapshot().rows.find((r: any) => r.title === t);
    await v.bcf.openTopic(row.guid);
    const vpGuid = v.bcf.store.getSnapshot().active.viewpoints[0].guid;
    const vp = v.engine.components.list.get('ee867824-a796-408d-8aa0-4e5962a83c66').list.get(vpGuid);
    await new Promise((r) => setTimeout(r, 3000));
    const ctl = v.engine.world.camera.controls;
    const cam = ctl.getPosition(vp.position.clone());
    const clipper = v.engine.components.list.get('66290bc5-18c4-4cd1-9379-2e17a0617611');
    const planes = [...clipper.list.values()];
    // Inward box: the box centre is on the kept (positive) side of every plane.
    const centre = planes.reduce((c: any, p: any) => c.add(p.origin), vp.position.clone().set(0, 0, 0)).divideScalar(planes.length || 1);
    return {
      pins: v.bcf.allPins().length,
      planes: planes.length,
      inward: planes.every((p: any) => p.three.distanceToPoint(centre) > 0),
      camDist: cam.distanceTo(vp.position),
    };
  }, title);

test('imports crais BCF: pins (zero-length lines), section box, camera (BM-05, BT-04)', async ({ page }) => {
  await load(page);
  const s = await state(page, 'MEP / ARC - Clash');
  expect(s.pins).toBe(8);
  expect(s.planes).toBe(6);
  expect(s.inward).toBe(true);
  expect(s.camDist).toBeLessThan(0.5);
});

test('re-export of crais topics keeps pins and clipping planes (BM-08)', async ({ page }) => {
  await load(page);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.evaluate(() => (window as any).__viewer.bcf.exportFile(null, '3', 'again')),
  ]);
  const path = test.info().outputPath('again.bcfzip');
  await download.saveAs(path);
  await page.evaluate(() => (window as any).__viewer.bcf.deleteTopics(null));
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.evaluate(() => document.querySelector<HTMLElement>('[aria-label="BCF Management"]')!.click()).then(() => page.getByRole('button', { name: 'Import BCF' }).click())]);
  await chooser.setFiles(path);
  await expect.poll(() => page.evaluate(() => (window as any).__viewer.bcf.store.getSnapshot().rows.length)).toBe(8);
  const s = await state(page, 'MEP / ARC - Clash');
  expect(s.pins).toBe(8);
  expect(s.planes).toBe(6);
  expect(s.inward).toBe(true);
});
