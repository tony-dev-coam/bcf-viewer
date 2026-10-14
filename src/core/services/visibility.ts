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
  // Items that "show all" must not reveal (MT-08: spaces/openings while their toggle is off).
  let alwaysHidden: () => Promise<ModelIdMap> = async () => ({});
  const changed = (isolated = store.getSnapshot().isolated) => {
    void engine.fragments.core.update(true);
    store.set({ version: store.getSnapshot().version + 1, isolated });
  };

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
      const keep = await alwaysHidden();
      if (!isEmptyMap(keep)) await hider.set(false, keep);
      changed(false);
    },
    setAlwaysHidden(getter: () => Promise<ModelIdMap>) {
      alwaysHidden = getter;
    },
    /** Visible element ids per model (geometry items only), for tree eye toggles. */
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
