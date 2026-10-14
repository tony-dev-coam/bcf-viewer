// Spike S1: does That Open BCFTopics round-trip BCF 2.1 / 3.0 without data loss?
// Samples (buildingSMART BCF-XML test cases, licence unclear → not committed) are read from BCF_SAMPLES.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import * as OBC from '@thatopen/components';
import { patchBcfExceptions, patchBcfClippingPlanes } from '../patches/bcf';
import { normalizeBcfForImport } from './coloring';

patchBcfExceptions();
patchBcfClippingPlanes();

const DIR = process.env.BCF_SAMPLES ?? '';
const files = DIR && existsSync(DIR) ? readdirSync(DIR).filter((f) => f.endsWith('.bcf')) : [];

function digest(components: OBC.Components) {
  const bcf = components.get(OBC.BCFTopics);
  const vps = components.get(OBC.Viewpoints);
  const d = (x?: Date) => (x ? new Date(x).toISOString().slice(0, 19) : undefined);
  return [...bcf.list.values()].map((t) => ({
    guid: t.guid, title: t.title, type: t.type, status: t.status, priority: t.priority, stage: t.stage,
    assignedTo: t.assignedTo, labels: [...t.labels].sort(), description: t.description,
    creationAuthor: t.creationAuthor, creationDate: d(t.creationDate), dueDate: d(t.dueDate),
    modifiedAuthor: t.modifiedAuthor, relatedTopics: [...t.relatedTopics].sort(),
    comments: [...t.comments.values()].map((c) => ({ guid: c.guid, text: c.comment, author: c.author, date: d(c.date), vp: c.viewpoint })),
    viewpoints: [...t.viewpoints].map((g) => {
      const v = vps.list.get(g);
      if (!v) return { g, missing: true };
      return {
        g, proj: v.projection, pos: v.position.toArray().map((n) => +n.toFixed(3)), dir: v.direction.toArray().map((n) => +n.toFixed(3)),
        sel: [...v.selectionComponents].sort(), exc: [...v.exceptionComponents].sort(), def: v.defaultVisibility,
        colors: [...v.componentColors.entries()].map(([c, ids]) => [c, [...ids].sort()]).sort(),
        clips: v.clippingPlanes.size, snapshot: !!(v.snapshot && vps.snapshots.has(v.snapshot)),
      };
    }),
  }));
}

async function load(bytes: Uint8Array, version?: '2.1' | '3') {
  const components = new OBC.Components();
  const bcf = components.get(OBC.BCFTopics);
  bcf.setup({ version: version ?? '3', strict: false, updateExtensionsOnImport: true, ignoreIncompleteTopicsOnImport: false });
  await bcf.load(normalizeBcfForImport(bytes).bytes);
  return components;
}

describe.skipIf(!files.length)('S1 BCF round-trip', () => {
  for (const f of files) {
    for (const target of ['2.1', '3'] as const) {
      it(`${f} → export ${target} → re-import`, async () => {
        const original = await load(new Uint8Array(readFileSync(`${DIR}/${f}`)));
        const before = digest(original);
        expect(before.length).toBeGreaterThan(0);
        const bcf = original.get(OBC.BCFTopics);
        bcf.config.version = target;
        const blob = await bcf.export();
        const after = digest(await load(new Uint8Array(await blob.arrayBuffer()), target));
        expect(after).toEqual(before);
      });
    }
  }
});
