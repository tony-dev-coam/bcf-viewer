import { test, expect } from '@playwright/test';

// One topic per entry, pinned on a real element of the office example models (public/examples/office_*.frag).
// view: 'cut' = section plane just above the element (interior), 'out' = exterior view, no section.
interface Topic {
  title: string; type: string; status: string; priority: string; labels: string[]; assignee: string; due: string;
  comments: [author: string, text: string][]; guids: string[]; view: 'cut' | 'out'; dir: [number, number, number];
}
const ARC = 'architect@nordic-office.example', STR = 'structure@nordic-office.example', HVAC = 'hvac@nordic-office.example';
const ELE = 'electrical@nordic-office.example', BIM = 'bim.coordinator@nordic-office.example', SITE = 'site.manager@nordic-office.example';
const FM = 'facility@nordic-office.example';

const TOPICS: Topic[] = [
  { title: 'HVAC / STR - Silencer clashes with beam', type: 'Clash', status: 'Open', priority: 'Critical', labels: ['HVAC', 'STR'], assignee: HVAC, due: '2026-11-06',
    comments: [[BIM, 'Duct silencer PVD 250 runs through the beam flange on level 1. Clearance needed: 50 mm.'], [HVAC, 'We can drop the duct 120 mm if the ceiling void allows it.'], [ARC, 'Ceiling void is 450 mm here, dropping is fine.']],
    guids: ['3yAbV3UuX2N9VTNgZqM2Ux'], view: 'cut', dir: [1, 1.6, 0.8] },
  { title: 'HVAC - Chiller service clearance', type: 'Issue', status: 'Open', priority: 'Major', labels: ['HVAC', 'Maintenance'], assignee: HVAC, due: '2026-11-13',
    comments: [[FM, 'Cooling battery in the roof plant room has < 600 mm service clearance on the coil side. Manufacturer asks for 900 mm.']],
    guids: ['3sfOszyST8$xXH9ze4lE7J'], view: 'cut', dir: [-1, 1.4, 1] },
  { title: 'HVAC - Standby pump missing', type: 'Request', status: 'In Progress', priority: 'Major', labels: ['HVAC'], assignee: HVAC, due: '2026-11-20',
    comments: [[BIM, 'Main 22 kW circulation pump has no standby. Brief requires N+1 for the cooling circuit.'], [HVAC, 'Second pump being added in the next model revision.']],
    guids: ['0xLmiKZU19S9SqaMCe2ymJ', '0jV_joE3n0kQ9DRrI3mQMm'], view: 'cut', dir: [1, 1.5, -1] },
  { title: 'HVAC / ELE - Cooled beam vs light fixture', type: 'Clash', status: 'Open', priority: 'Normal', labels: ['HVAC', 'ELE'], assignee: ELE, due: '2026-11-27',
    comments: [[BIM, 'Cooled beam and recessed luminaire overlap in the level 3 open office. Please coordinate the ceiling grid.']],
    guids: ['09EBwb92zBBOKhhLNhwwHV'], view: 'cut', dir: [0.6, 1.8, 1] },
  { title: 'HVAC - Kitchen hood H1.1 exhaust capacity', type: 'Inquiry', status: 'Open', priority: 'Normal', labels: ['HVAC', 'Restaurant'], assignee: HVAC, due: '2026-12-04',
    comments: [[ARC, 'Restaurant tenant wants a combi-steamer under hood H1.1. Is the exhaust flow enough?'], [HVAC, 'Current design 0.9 m³/s. Need the appliance list to confirm.']],
    guids: ['3y6T3$y1rD2AZeupqaKa4L'], view: 'cut', dir: [-1, 1.5, -0.8] },
  { title: 'HVAC - Roof fan noise to neighbours', type: 'Issue', status: 'Open', priority: 'Major', labels: ['HVAC', 'Acoustics'], assignee: HVAC, due: '2026-11-18',
    comments: [[BIM, 'Exhaust fan on the roof faces the residential block. Check the 45 dB(A) night limit at the boundary.']],
    guids: ['0_D0jeYc9CpxuMNOeZGYhg'], view: 'out', dir: [1, 1.2, 1] },
  { title: 'HVAC - Radiator below window sill', type: 'Issue', status: 'Resolved', priority: 'Minor', labels: ['HVAC', 'ARC'], assignee: HVAC, due: '2026-10-28',
    comments: [[ARC, 'Radiator top is 30 mm above the window sill.'], [HVAC, 'Swapped to the 286 mm type. Fixed in rev C.']],
    guids: ['0FGSOLX_T7GBvu1mZeMlOG'], view: 'cut', dir: [1, 1.3, 1] },
  { title: 'HVAC - Flow meter not accessible', type: 'Issue', status: 'Open', priority: 'Minor', labels: ['HVAC', 'Maintenance'], assignee: FM, due: '2026-12-11',
    comments: [[FM, 'Water flow meter DN15 sits above a fixed ceiling. Add an access hatch or move it to the shaft.']],
    guids: ['3AXv0goI15UhD33Wv6UwPD'], view: 'cut', dir: [-0.8, 1.6, 1] },
  { title: 'ELE - Distribution board fire rating', type: 'Issue', status: 'Open', priority: 'Critical', labels: ['ELE', 'Fire'], assignee: ELE, due: '2026-11-04',
    comments: [[BIM, 'Basement distribution board is in the escape corridor. Needs an EI 30 enclosure.'], [ELE, 'Checking whether it can move into the electrical room next door.']],
    guids: ['1BFJi9GR9EgeQt8GQ9AUhL'], view: 'cut', dir: [1, 1.4, -1] },
  { title: 'ELE - Board missing in level 3 riser', type: 'Request', status: 'Closed', priority: 'Normal', labels: ['ELE'], assignee: ELE, due: '2026-10-21',
    comments: [[ELE, 'Sub-board for level 3 added to the riser.'], [BIM, 'Checked, closing.']],
    guids: ['2ILcbW7IvEOAriHq5LuDGn'], view: 'cut', dir: [-1, 1.5, -1] },
  { title: 'ELE - Fire alarm sounder position', type: 'Inquiry', status: 'Open', priority: 'Normal', labels: ['ELE', 'Fire'], assignee: ELE, due: '2026-12-01',
    comments: [[SITE, 'Sounder clashes with the entrance signage. Can it move 500 mm left?']],
    guids: ['3B_HSwvvv2twUmnPkefFAX'], view: 'cut', dir: [1, 1.2, 0.6] },
  { title: 'ARC - Entrance ramp gradient', type: 'Inquiry', status: 'Open', priority: 'Major', labels: ['ARC', 'Accessibility'], assignee: ARC, due: '2026-11-25',
    comments: [[BIM, 'Outdoor ramp measures about 1:15. Accessibility requires 1:20 or a landing every 6 m.']],
    guids: ['1UkLw8a7mtl6AzLNAQg0Fq'] /* ramp flight: the IfcRamp itself has no geometry */, view: 'out', dir: [1, 0.8, 1] },
  { title: 'CC - Missing safety railing on roof terrace', type: 'Issue', status: 'Open', priority: 'Critical', labels: ['Safety', 'ARC'], assignee: SITE, due: '2026-10-30',
    comments: [[SITE, 'Railing on the level 5 terrace ends 2 m short of the corner. Temporary edge protection installed.'], [ARC, 'Will extend the railing in the next issue.']],
    guids: ['1VG1As2i9CNAES2YSNmvmV'], view: 'out', dir: [-1, 1, 1] },
  { title: 'ARC - Stair headroom', type: 'Issue', status: 'In Progress', priority: 'Major', labels: ['ARC', 'STR'], assignee: ARC, due: '2026-11-15',
    comments: [[STR, 'Headroom under the level 4 landing is 1950 mm. Minimum is 2000 mm.']],
    guids: ['2HM8XWPUz6WgsmzelJ_kpA'] /* stair landing: the IfcStair itself has no geometry */, view: 'cut', dir: [1, 1.5, 1] },
  { title: 'ARC - Fire hose cabinet blocked by door', type: 'Issue', status: 'Open', priority: 'Major', labels: ['ARC', 'Fire'], assignee: ARC, due: '2026-11-10',
    comments: [[FM, 'The open door covers the fire hose cabinet. Swap the door swing or move the cabinet.']],
    guids: ['3Hoy_ktiTCmxcMfV1Gic9n'], view: 'cut', dir: [-1, 1.4, 0.8] },
  { title: 'ARC - Accessible WC turning circle', type: 'Request', status: 'Open', priority: 'Normal', labels: ['ARC', 'Accessibility'], assignee: ARC, due: '2026-12-08',
    comments: [[BIM, 'Turning circle of 1500 mm does not fit beside the WC. Check the room layout.']],
    guids: ['3UsKEwm0X6VxOk1QdomKjd'], view: 'cut', dir: [0.8, 1.6, -1] },
  { title: 'STR - Column off grid', type: 'Issue', status: 'In Progress', priority: 'Major', labels: ['STR'], assignee: STR, due: '2026-11-20',
    comments: [[ARC, 'Column is about 150 mm off grid line C. It clashes with the partition wall.'], [STR, 'Moving it back to the grid. The load path is checked.']],
    guids: ['09dmXcolr5Hhf1pnPptVOq'], view: 'cut', dir: [1, 1.2, -1] },
  { title: 'STR / HVAC - Beam penetration for duct', type: 'Clash', status: 'Open', priority: 'Critical', labels: ['STR', 'HVAC'], assignee: STR, due: '2026-11-08',
    comments: [[HVAC, 'Supply duct needs a 400 mm hole through this beam.'], [STR, 'Not possible at mid-span. Proposing an opening at 1/4 span with reinforcement.']],
    guids: ['0Z4gJ8sVL51Q0O8SZlvZ8E'], view: 'cut', dir: [-1, 1.5, -1] },
  { title: 'STR - Roof drainage falls', type: 'Remark', status: 'Closed', priority: 'Minor', labels: ['STR', 'ARC'], assignee: STR, due: '2026-10-20',
    comments: [[ARC, 'Roof slab falls approved: 1:80 towards the drains.']],
    guids: ['0yMMauc0X3aRAKU0dtp$Ic'], view: 'out', dir: [0.4, 1.4, 0.6] },
];

test('generate demo.bcfzip', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 850 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Close', exact: true }).click(); // not the example button: it imports the old demo BCF
  await page.evaluate(() => (window as any).__viewer.models.loadUrls(['arc', 'str', 'ele', 'hvac'].map((n) => `/examples/office_${n}.frag`)));
  const box = (await page.getByTestId('viewport').boundingBox())!;
  await page.waitForTimeout(2500); // let the load-time "fit all" camera animation finish

  page.on('console', (m) => { if (m.text().startsWith('[gen]')) console.log(m.text()); });
  page.on('crash', () => console.log('[gen] page crashed'));
  page.on('framenavigated', (f) => console.log(`[gen] navigated: ${f.url()}`));
  let skipped = 0;
  for (const [i, t] of TOPICS.entries()) {
    console.log(`[gen] topic ${i + 1}/${TOPICS.length}: ${t.title}`);
    const card = page.getByRole('dialog', { name: 'BCF Topic' });
    if (await card.isVisible()) await card.getByRole('button', { name: 'Close' }).click(); // the card would cover the click
    await page.evaluate(async ({ guids, view, dir }) => {
      const v = (window as any).__viewer;
      const THREE = await import('/node_modules/.vite/deps/three.js');
      const log = (s: string) => console.log(`[gen]   ${s}`);
      const map = await v.engine.fragments.guidsToModelIdMap(guids);
      log('guids mapped');
      const b = new THREE.Box3();
      for (const [model, ids] of Object.entries(map)) b.union(await v.engine.fragments.list.get(model).getMergedBox([...(ids as Set<number>)]));
      log('box ok');
      // Highlighting can stall under SwiftShader on these big models; the viewpoint only needs the selection itself.
      const highlighted = await Promise.race([v.selection.set(map).then(() => true), new Promise((r) => setTimeout(() => r(false), 90_000))]);
      if (!highlighted) v.selection.store.set({ items: map, count: guids.length });
      log(highlighted ? 'selected' : 'selected (no highlight: timed out)');
      v.clip.deleteAll();
      if (view === 'cut') { // cut the storeys above so the element is visible from outside
        v.clip.addPlane(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, b.max.y + 0.05, 0));
        v.clip.setHelpersVisible(false);
      }
      const c = b.getCenter(new THREE.Vector3());
      const r = Math.max(view === 'cut' ? 7 : 25, b.getSize(new THREE.Vector3()).length() * 1.5);
      const p = c.clone().add(new THREE.Vector3(...dir).normalize().multiplyScalar(r));
      await v.engine.world.camera.controls.setLookAt(p.x, p.y, p.z, c.x, c.y, c.z, false);
    }, t);
    await page.waitForTimeout(1200);
    // Pin on the element itself: probe around the centre (a stair's box centre is empty stairwell).
    const at = await page.evaluate(async (box) => {
      const v = (window as any).__viewer;
      const sel = v.selection.store.getSnapshot().items;
      let fallback: [number, number] | null = null;
      for (let r = 0; r <= 180; r += 60) {
        for (let a = 0; a < (r ? 8 : 1); a++) {
          const x = box.x + box.width / 2 + r * Math.cos((a * Math.PI) / 4), y = box.y + box.height / 2 + r * Math.sin((a * Math.PI) / 4);
          const hit = await v.tools.pick({ clientX: x, clientY: y });
          if (hit && sel[hit.modelId]?.has(hit.localId)) return [x, y];
          if (hit) fallback ??= [x, y];
        }
      }
      return fallback;
    }, box);
    if (!at) { console.log(`[gen] SKIPPED (nothing to pin): ${t.title}`); skipped++; continue; }
    await page.evaluate(() => (window as any).__viewer.bcf.placePin(null));
    await page.mouse.click(at[0], at[1]);
    await page.waitForFunction(() => (window as any).__viewer.bcf.store.getSnapshot().session?.dirty, null, { timeout: 120_000 });
    await page.evaluate(async (t) => {
      const bcf = (window as any).__viewer.bcf;
      bcf.updateDraft({ title: t.title, type: t.type, status: t.status, priority: t.priority, labels: t.labels, assignedTo: t.assignee, dueDate: new Date(t.due).toISOString() });
      for (const [author, text] of t.comments) {
        bcf.setAuthor(author, false);
        await bcf.addComment(text, false);
      }
      bcf.setAuthor(t.comments[0][0], false); // the topic's creation author
      const err = bcf.saveSession();
      if (err) throw new Error(err);
    }, t);
  }
  await expect.poll(() => page.evaluate(() => (window as any).__viewer.bcf.store.getSnapshot().rows.length)).toBe(TOPICS.length - skipped);
  const [download] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => (window as any).__viewer.bcf.exportFile(null, '3', 'demo'))]);
  await download.saveAs('public/examples/demo.bcfzip');
});
