import { createStore } from '../store';
import type { Engine } from '../engine';
import type { VisibilityService } from './visibility';
import { buildRelationsTree, buildStoreysTree, buildTypesTree, type SpatialNode, type StoreyInfo, type TreeNode, type ModelCategories } from './trees';

const SPATIAL = /^IFC(PROJECT|SITE|BUILDING|BUILDINGSTOREY)$/;

interface ModelIndex { modelId: string; spatial: SpatialNode; names: Map<number, string>; cats: Map<number, string>; elevations: Map<number, number> }

function spatialIds(n: SpatialNode, out: number[] = []): number[] {
  if (n.localId !== null) out.push(n.localId);
  n.children?.forEach((c) => spatialIds(c, out));
  return out;
}

/** Storeys with all element ids below them (excluding nested spatial entities). */
function storeysOf(idx: ModelIndex): StoreyInfo[] {
  const out: StoreyInfo[] = [];
  const walk = (n: SpatialNode) => {
    if (n.localId !== null && idx.cats.get(n.localId) === 'IFCBUILDINGSTOREY') {
      const elements = spatialIds(n).filter((id) => id !== n.localId && !SPATIAL.test(idx.cats.get(id) ?? ''));
      out.push({ localId: n.localId, name: idx.names.get(n.localId) || `Storey ${n.localId}`, elevation: idx.elevations.get(n.localId) ?? 0, elements });
      return;
    }
    n.children?.forEach(walk);
  };
  walk(idx.spatial);
  return out;
}

/** MT-01…03, MT-08. Rebuilt once per model set change; trees are immutable snapshots. */
export function createTreeService(engine: Engine, visibility: VisibilityService) {
  const store = createStore<{ relations: TreeNode[]; types: TreeNode[]; storeys: TreeNode[]; loading: boolean; showSpaces: boolean; showOpenings: boolean }>({
    relations: [], types: [], storeys: [], loading: false, showSpaces: false, showOpenings: false,
  });
  const indexes = new Map<string, ModelIndex>();

  async function indexModel(modelId: string): Promise<ModelIndex> {
    const model = engine.fragments.list.get(modelId)!;
    const spatial = (await model.getSpatialStructure()) as SpatialNode;
    const ids = spatialIds(spatial);
    const data = await model.getItemsData(ids, {
      attributesDefault: false,
      attributes: ['Name', 'Elevation'],
      relationsDefault: { attributes: false, relations: false },
    });
    const names = new Map<number, string>(), cats = new Map<number, string>(), elevations = new Map<number, number>();
    data.forEach((d: any, i: number) => {
      const id = ids[i];
      if (d?.Name?.value) names.set(id, String(d.Name.value));
      if (d?._category?.value) cats.set(id, String(d._category.value));
      if (typeof d?.Elevation?.value === 'number') elevations.set(id, d.Elevation.value);
    });
    return { modelId, spatial, names, cats, elevations };
  }

  async function categoryItems(pattern: RegExp) {
    const map: Record<string, Set<number>> = {};
    for (const [id, model] of engine.fragments.list) {
      const found = await model.getItemsOfCategories([pattern]);
      const ids = Object.values(found).flat() as number[];
      if (ids.length) map[id] = new Set(ids);
    }
    return map;
  }

  const hiddenByToggles = async () => {
    const { showSpaces, showOpenings } = store.getSnapshot();
    const out: Record<string, Set<number>> = {};
    for (const [on, re] of [[showSpaces, /^IFCSPACE$/], [showOpenings, /^IFCOPENINGELEMENT$/]] as const) {
      if (on) continue;
      for (const [m, ids] of Object.entries(await categoryItems(re))) for (const id of ids) (out[m] ??= new Set()).add(id);
    }
    return out;
  };
  visibility.setAlwaysHidden(hiddenByToggles);

  async function applySpaceOpeningVisibility() {
    const { showSpaces, showOpenings } = store.getSnapshot();
    const spaces = await categoryItems(/^IFCSPACE$/);
    const openings = await categoryItems(/^IFCOPENINGELEMENT$/);
    await (showSpaces ? visibility.show(spaces) : visibility.hide(spaces));
    await (showOpenings ? visibility.show(openings) : visibility.hide(openings));
  }

  return {
    store,
    /** Call after models are added/removed. */
    async rebuild() {
      store.update({ loading: true });
      const loaded = [...engine.fragments.list.keys()];
      for (const id of [...indexes.keys()]) if (!loaded.includes(id)) indexes.delete(id);
      for (const id of loaded) if (!indexes.has(id)) indexes.set(id, await indexModel(id));
      const all = [...indexes.values()];
      const typesInput: ModelCategories[] = all.map((m) => ({
        modelId: m.modelId,
        names: m.names,
        items: new Map([...m.cats].filter(([, c]) => !SPATIAL.test(c))),
      }));
      store.update({
        relations: all.map((m) => buildRelationsTree(m.modelId, m.spatial, m.names, m.cats)),
        types: buildTypesTree(typesInput),
        storeys: buildStoreysTree(all.map((m) => ({ modelId: m.modelId, storeys: storeysOf(m) })), (m, id) => indexes.get(m)?.names.get(id) ?? ''),
        loading: false,
      });
      await applySpaceOpeningVisibility();
    },
    async setShowSpaces(on: boolean) {
      store.update({ showSpaces: on });
      await applySpaceOpeningVisibility();
    },
    async setShowOpenings(on: boolean) {
      store.update({ showOpenings: on });
      await applySpaceOpeningVisibility();
    },
  };
}

export type TreeService = ReturnType<typeof createTreeService>;
