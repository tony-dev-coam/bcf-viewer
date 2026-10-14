import * as THREE from 'three';
import * as OBC from '@thatopen/components';
import { createStore } from '../store';
import type { Engine } from '../engine';
import type { Tool, ToolManager } from '../tools/toolManager';
import type { SelectionService } from './selection';
import { countItems } from './selectionRules';

export const MAX_PLANES = 10; // CL-01

/** CL-01…05 on That Open's Clipper. */
export function createClipService(engine: Engine, tools: ToolManager, selection: SelectionService) {
  const clipper = engine.components.get(OBC.Clipper);
  // Fragments materials only clip with per-material (local) planes; global renderer planes are ignored.
  clipper.localClippingPlanes = true;
  clipper.enabled = true;
  clipper.visible = true;
  const store = createStore({ planes: 0, enabled: true, helpersVisible: true, capReached: false });
  const sync = () => store.update({ planes: clipper.list.size, capReached: false });

  clipper.onAfterCreate.add(sync);
  clipper.onAfterDelete.add(sync);

  const room = (n: number) => {
    if (clipper.list.size + n <= MAX_PLANES) return true;
    store.update({ capReached: true });
    return false;
  };

  async function boxAround(items: Record<string, Set<number>>) {
    if (!room(6)) return;
    const box = new THREE.Box3();
    for (const b of await engine.fragments.getBBoxes(items)) box.union(b);
    if (box.isEmpty()) return;
    box.expandByScalar(0.05);
    const { min, max } = box;
    // Inward normals: everything outside the box is clipped.
    const faces: [THREE.Vector3, THREE.Vector3][] = [
      [new THREE.Vector3(1, 0, 0), min], [new THREE.Vector3(-1, 0, 0), max],
      [new THREE.Vector3(0, 1, 0), min], [new THREE.Vector3(0, -1, 0), max],
      [new THREE.Vector3(0, 0, 1), min], [new THREE.Vector3(0, 0, -1), max],
    ];
    for (const [n, p] of faces) clipper.createFromNormalAndCoplanarPoint(engine.world, n, p.clone());
    setEnabled(true);
  }

  function setEnabled(enabled: boolean) {
    clipper.enabled = enabled; // CL-03: keep planes, stop clipping
    for (const [, plane] of clipper.list) plane.enabled = enabled;
    store.update({ enabled });
  }

  const planeTool: Tool = {
    async onClick() {
      if (!room(1)) return;
      await clipper.create(engine.world); // CL-01: plane aligned to the clicked face (raycast under pointer)
      setEnabled(true);
      tools.exit();
    },
  };
  const boxTool: Tool = {
    activate() {
      // CL-02: with a selection, box it immediately; otherwise wait for an element click.
      const { items } = selection.store.getSnapshot();
      if (countItems(items)) void boxAround(items).then(() => tools.exit());
    },
    async onClick(e) {
      const hit = await tools.pick(e);
      if (!hit) return;
      await boxAround({ [hit.modelId]: new Set([hit.localId]) });
      tools.exit();
    },
  };
  tools.register('clip-plane', planeTool);
  tools.register('clip-box', boxTool);

  return {
    store,
    setEnabled,
    setHelpersVisible(helpersVisible: boolean) {
      // CL-04: hide helpers, keep the model clipped.
      for (const [, plane] of clipper.list) plane.visible = helpersVisible;
      store.update({ helpersVisible });
    },
    deleteAll() {
      clipper.deleteAll();
      sync();
    },
    /** For BCF viewpoints. */
    planes: () => [...clipper.list.values()].map((p) => ({ normal: p.normal.clone(), origin: p.origin.clone() })),
    addPlane(normal: THREE.Vector3, origin: THREE.Vector3) {
      if (room(1)) clipper.createFromNormalAndCoplanarPoint(engine.world, normal, origin);
    },
  };
}

export type ClipService = ReturnType<typeof createClipService>;
