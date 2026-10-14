import * as THREE from 'three';
import * as OBF from '@thatopen/components-front';
import { createStore } from '../store';
import type { Engine } from '../engine';
import { applyPick, countItems, type IdMap, type Pick } from './selectionRules';

export const SELECT = 'select';

/** SE-01/03. Selection lives in the Highlighter; the store mirrors only an immutable copy for React. */
export function createSelectionService(engine: Engine) {
  const highlighter = engine.components.get(OBF.Highlighter);
  highlighter.setup({
    world: engine.world,
    selectName: SELECT,
    autoHighlightOnClick: false, // tools decide when a click selects (D6)
    selectMaterialDefinition: { color: new THREE.Color('#3b9fd8'), opacity: 1, transparent: false, renderedFaces: 0 },
  });
  const hoverer = engine.components.get(OBF.Hoverer);
  hoverer.world = engine.world;
  hoverer.enabled = true;
  hoverer.material = new THREE.MeshBasicMaterial({ color: '#7fc4ec', transparent: true, opacity: 0.35, depthTest: false });

  const store = createStore<{ items: IdMap; count: number }>({ items: {}, count: 0 });

  async function set(items: IdMap) {
    if (countItems(items)) await highlighter.highlightByID(SELECT, items, true, false);
    else await highlighter.clear(SELECT);
    await engine.fragments.core.update(true);
    store.set({ items, count: countItems(items) });
  }

  return {
    store,
    set,
    clear: () => set({}),
    applyPick: (pick: Pick, ctrl: boolean) => set(applyPick(store.getSnapshot().items, pick, ctrl)),
    setHoverEnabled(on: boolean) {
      hoverer.enabled = on;
    },
  };
}

export type SelectionService = ReturnType<typeof createSelectionService>;
