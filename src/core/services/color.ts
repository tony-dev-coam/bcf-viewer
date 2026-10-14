import * as THREE from 'three';
import * as OBF from '@thatopen/components-front';
import { createStore } from '../store';
import type { Engine } from '../engine';
import type { Tool, ToolManager } from '../tools/toolManager';
import type { SelectionService } from './selection';
import { countItems, type IdMap } from './selectionRules';

export type ColorMode = 'original' | 'white';
const PAPER = 'paper';
const customStyle = (hex: string) => `c:${hex.toLowerCase()}`;

/** CO-01…05, MT-05. Colors are Highlighter styles: paper (-1) < custom colors (1) < selection (top). */
export function createColorService(engine: Engine, tools: ToolManager, selection: SelectionService) {
  const highlighter = engine.components.get(OBF.Highlighter);
  highlighter.styles.set(PAPER, { color: new THREE.Color('#ffffff'), opacity: 1, transparent: false, renderedFaces: 0, priority: -1 });
  const store = createStore<{ mode: ColorMode; custom: Record<string, IdMap>; paintColor: string; eraser: boolean }>({
    mode: 'original', custom: {}, paintColor: '#e74c3c', eraser: false,
  });

  const update = () => engine.fragments.core.update(true);

  async function allItems(): Promise<IdMap> {
    const out: IdMap = {};
    for (const [id, model] of engine.fragments.list) out[id] = new Set(await model.getItemsIdsWithGeometry());
    return out;
  }

  /** Removes items from every custom color (map is copied, not mutated). */
  function without(custom: Record<string, IdMap>, items: IdMap): Record<string, IdMap> {
    const next: Record<string, IdMap> = {};
    for (const [hex, map] of Object.entries(custom)) {
      const m: IdMap = {};
      for (const [model, ids] of Object.entries(map)) {
        const kept = [...ids].filter((id) => !items[model]?.has(id));
        if (kept.length) m[model] = new Set(kept);
      }
      if (countItems(m)) next[hex] = m;
    }
    return next;
  }

  async function erase(items: IdMap) {
    if (!countItems(items)) return;
    for (const hex of Object.keys(store.getSnapshot().custom)) await highlighter.clear(customStyle(hex), items);
    store.update({ custom: without(store.getSnapshot().custom, items) });
    await update();
  }

  async function paint(items: IdMap, hex: string) {
    if (!countItems(items)) return;
    await erase(items);
    const name = customStyle(hex);
    if (!highlighter.styles.has(name)) {
      highlighter.styles.set(name, { color: new THREE.Color(hex), opacity: 1, transparent: false, renderedFaces: 0, priority: 1 });
    }
    await highlighter.highlightByID(name, items, false, false);
    const custom = { ...store.getSnapshot().custom };
    const merged: IdMap = {};
    for (const map of [custom[hex] ?? {}, items]) for (const [m, ids] of Object.entries(map)) for (const id of ids) (merged[m] ??= new Set()).add(id);
    custom[hex] = merged;
    store.update({ custom });
    await update();
  }

  async function clearCustom() {
    for (const hex of Object.keys(store.getSnapshot().custom)) await highlighter.clear(customStyle(hex));
    store.update({ custom: {} });
    await update();
  }

  async function setMode(mode: ColorMode) {
    if (mode === 'white') await highlighter.highlightByID(PAPER, await allItems(), true, false);
    else await highlighter.clear(PAPER);
    store.update({ mode });
    await update();
  }

  const paintTool: Tool = {
    activate() {
      // CO-03: elements selected when opening the picker are colored at once.
      const { items } = selection.store.getSnapshot();
      if (countItems(items)) void paint(items, store.getSnapshot().paintColor);
      selection.setHoverEnabled(true);
    },
    async onClick(e) {
      const hit = await tools.pick(e);
      if (!hit) return;
      const items = { [hit.modelId]: new Set([hit.localId]) };
      const { eraser, paintColor } = store.getSnapshot();
      await (eraser ? erase(items) : paint(items, paintColor));
    },
  };
  tools.register('color-paint', paintTool);

  return {
    store,
    setMode,
    paint,
    erase,
    clearCustom,
    setPaintColor: (paintColor: string) => store.update({ paintColor, eraser: false }),
    setEraser: (eraser: boolean) => store.update({ eraser }),
    /** Custom color of one element, if any. */
    colorOf(modelId: string, localId: number): string | undefined {
      for (const [hex, map] of Object.entries(store.getSnapshot().custom)) if (map[modelId]?.has(localId)) return hex;
      return undefined;
    },
    async reset() {
      await clearCustom();
      await setMode('original');
    },
  };
}

export type ColorService = ReturnType<typeof createColorService>;
