import * as THREE from 'three';
import * as OBC from '@thatopen/components';
import { createStore } from '../store';
import type { Engine } from '../engine';

export type ModelIdMap = OBC.ModelIdMap;

export function isEmptyMap(map: ModelIdMap): boolean {
  return Object.values(map).every((s) => s.size === 0);
}

/** VI-01…03, MT-07. `version` bumps on every change so UI (tree eye icons) can re-query visibility. */
export function createVisibilityService(engine: Engine) {
  const hider = engine.components.get(OBC.Hider);
  const store = createStore({ version: 0, isolated: false });
  const changed = (isolated = store.getSnapshot().isolated) => store.set({ version: store.getSnapshot().version + 1, isolated });

  async function fitBox(box: THREE.Box3) {
    if (box.isEmpty()) return;
    await engine.world.camera.controls.fitToSphere(box.getBoundingSphere(new THREE.Sphere()), true);
  }

  return {
    store,
    async hide(items: ModelIdMap) {
      if (isEmptyMap(items)) return;
      await hider.set(false, items);
      changed();
    },
    async show(items: ModelIdMap) {
      if (isEmptyMap(items)) return;
      await hider.set(true, items);
      changed();
    },
    async isolate(items: ModelIdMap) {
      if (isEmptyMap(items)) return;
      await hider.isolate(items);
      changed(true);
    },
    async showAll() {
      await hider.set(true);
      changed(false);
    },
    /** Visible element ids per model, for tree eye toggles. */
    visibleMap: () => hider.getVisibilityMap(true),
    async fitAll() {
      const box = new THREE.Box3();
      for (const [, model] of engine.fragments.list) box.union(model.box);
      await fitBox(box);
    },
    async fitItems(items: ModelIdMap) {
      if (isEmptyMap(items)) return;
      const box = new THREE.Box3();
      for (const b of await engine.fragments.getBBoxes(items)) box.union(b);
      await fitBox(box);
    },
  };
}

export type VisibilityService = ReturnType<typeof createVisibilityService>;
