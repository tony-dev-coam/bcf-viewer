import { describe, it, expect } from 'vitest';
import * as OBC from '@thatopen/components';
import { patchBcfExceptions, patchBcfClippingPlanes } from '../patches/bcf';
import { normalizeBcfForImport } from './coloring';

patchBcfExceptions();
patchBcfClippingPlanes();

async function roundTrip(version: '2.1' | '3') {
  const a = new OBC.Components();
  const bcf = a.get(OBC.BCFTopics);
  bcf.setup({ version, author: 'tester@example.com', strict: false });
  const vp = a.get(OBC.Viewpoints).create({
    perspective_camera: {
      camera_view_point: { x: 1, y: 2, z: 3 }, camera_direction: { x: 0, y: 0, z: -1 }, camera_up_vector: { x: 0, y: 1, z: 0 },
      field_of_view: 60, aspect_ratio: 1.5,
    },
  });
  vp.selectionComponents.add('2UD3D7uxP8kecbbBCRtzEl');
  vp.exceptionComponents.add('1bbI761TbBCOoIa5Kt6PXt');
  vp.defaultVisibility = false;
  vp.componentColors.set('FF0000', ['0vpT3kKsfEaQxwxwIGKYhw']);
  const topic = bcf.create({ title: 'STR / ARC - Clash', type: 'Issue', status: 'Open', priority: 'Critical', labels: new Set(['STR', 'ARC']) });
  topic.dueDate = new Date('2026-08-06T00:00:00Z');
  topic.assignedTo = 'fp@example.com';
  topic.viewpoints.add(vp.guid);
  topic.createComment('Please check the beam.', vp.guid);

  const bytes = new Uint8Array(await (await bcf.export()).arrayBuffer());
  const b = new OBC.Components();
  b.get(OBC.BCFTopics).setup({ version, strict: false });
  await b.get(OBC.BCFTopics).load(normalizeBcfForImport(bytes).bytes);
  const t = [...b.get(OBC.BCFTopics).list.values()][0];
  const v = b.get(OBC.Viewpoints).list.get([...t.viewpoints][0])!;
  return { t, v };
}

describe.each(['2.1', '3'] as const)('BCF %s export → import keeps data (BM-08)', (version) => {
  it('topic fields, labels, comment and viewpoint components', async () => {
    const { t, v } = await roundTrip(version);
    expect(t).toMatchObject({ title: 'STR / ARC - Clash', type: 'Issue', status: 'Open', priority: 'Critical', assignedTo: 'fp@example.com' });
    expect([...t.labels].sort()).toEqual(['ARC', 'STR']);
    expect(t.dueDate?.toISOString().slice(0, 10)).toBe('2026-08-06');
    expect([...t.comments.values()].map((c) => c.comment)).toEqual(['Please check the beam.']);
    expect([...v.selectionComponents]).toEqual(['2UD3D7uxP8kecbbBCRtzEl']);
    // Regression for the upstream bug patched in patches/bcf.ts.
    expect([...v.exceptionComponents]).toEqual(['1bbI761TbBCOoIa5Kt6PXt']);
    expect(v.defaultVisibility).toBe(false);
    expect([...v.componentColors.entries()]).toEqual([['FF0000', ['0vpT3kKsfEaQxwxwIGKYhw']]]);
  });
});
