import { test, expect } from '@playwright/test';

// [title, type, status, priority, labels, assignee, due, comment, camera dir (x,y,z), click (x,y)]
const TOPICS: [string, string, string, string, string[], string, string, string, [number, number, number], [number, number]][] = [
  ['STR / ARC - Clash', 'Clash', 'Open', 'Critical', ['STR', 'ARC'], 'structure@example.com', '2026-11-06', 'Beam penetrates the architectural ceiling. Please coordinate.', [1, 0.8, 1], [0.5, 0.55]],
  ['ARC - Missing door in corridor', 'Issue', 'Open', 'Major', ['ARC'], 'architect@example.com', '2026-11-13', 'Fire escape route needs a door here.', [1, 0.5, -1], [0.5, 0.5]],
  ['STR - Column grid offset', 'Issue', 'In Progress', 'Major', ['STR'], 'structure@example.com', '2026-11-20', 'Column is 150 mm off the grid line.', [-1, 0.6, 1], [0.48, 0.58]],
  ['ARC - Window sill height', 'Request', 'Open', 'Normal', ['ARC'], 'architect@example.com', '2026-12-01', 'Check the sill height against the brief (900 mm).', [-1, 0.4, -1], [0.52, 0.5]],
  ['CC - Missing safety railing', 'Issue', 'Open', 'Critical', ['Safety'], 'site@example.com', '2026-10-30', 'Roof edge has no railing in the model.', [0.2, 1.4, 0.2], [0.5, 0.5]],
  ['STR / ARC - Slab opening mismatch', 'Clash', 'Resolved', 'Normal', ['STR', 'ARC'], 'structure@example.com', '2026-10-25', 'Opening in slab does not match the stair.', [1, 1, 0.3], [0.46, 0.52]],
  ['ARC - Ramp gradient', 'Inquiry', 'Open', 'Minor', ['ARC', 'Access'], 'architect@example.com', '2026-12-10', 'Is the entrance ramp within 1:20?', [0.3, 0.5, 1], [0.5, 0.6]],
  ['SITE - Parking layout', 'Remark', 'Closed', 'Minor', ['Site'], 'site@example.com', '2026-10-20', 'Parking bays approved.', [1, 0.7, -0.2], [0.42, 0.62]],
];

test('generate demo.bcfzip', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('bcf.author', 'demo@example.com'));
  await page.goto('/');
  await page.getByRole('button', { name: 'Close', exact: true }).click(); // not the example button: it imports the old demo BCF
  await page.evaluate(() => (window as any).__viewer.models.loadUrls(['/examples/school_arq.frag', '/examples/school_str.frag']));
  const box = (await page.getByTestId('viewport').boundingBox())!;
  await page.waitForTimeout(2500); // let the load-time "fit all" camera animation finish

  for (const [title, type, status, priority, labels, assignedTo, due, comment, dir, click] of TOPICS) {
    const card = page.getByRole('dialog', { name: 'BCF Topic' });
    if (await card.isVisible()) await card.getByRole('button', { name: 'Close' }).click(); // the card would cover the click
    await page.evaluate(async (d) => {
      const v = (window as any).__viewer;
      const THREE = await import('/node_modules/.vite/deps/three.js');
      const b = new THREE.Box3();
      b.union(v.engine.fragments.list.get('school_str').box); // the building, not the site terrain
      const s = b.getBoundingSphere(new THREE.Sphere());
      const r = s.radius * 1.6;
      const p = s.center.clone().add(new THREE.Vector3(...d).normalize().multiplyScalar(r));
      await v.engine.world.camera.controls.setLookAt(p.x, p.y, p.z, s.center.x, s.center.y, s.center.z, false);
    }, dir);
    await page.waitForTimeout(800);
    await page.evaluate(() => (window as any).__viewer.bcf.placePin(null));
    await page.mouse.click(box.width * click[0], box.height * click[1]);
    await page.waitForFunction(() => (window as any).__viewer.bcf.store.getSnapshot().session?.dirty, null, { timeout: 20_000 });
    await page.evaluate(async (t) => {
      const bcf = (window as any).__viewer.bcf;
      bcf.updateDraft({ title: t.title, type: t.type, status: t.status, priority: t.priority, labels: t.labels, assignedTo: t.assignedTo, dueDate: new Date(t.due).toISOString() });
      await bcf.addComment(t.comment, false);
      const err = bcf.saveSession();
      if (err) throw new Error(err);
    }, { title, type, status, priority, labels, assignedTo, due, comment });
  }
  await expect.poll(() => page.evaluate(() => (window as any).__viewer.bcf.store.getSnapshot().rows.length)).toBe(TOPICS.length);
  const [download] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => (window as any).__viewer.bcf.exportFile(null, '3', 'demo'))]);
  await download.saveAs('public/examples/demo.bcfzip');
});
