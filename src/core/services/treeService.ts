import { createStore } from '../store';
import type { Engine } from '../engine';
import type { VisibilityService } from './visibility';
import { buildRelationsTree, buildStoreysTree, buildTypesTree, spatialFromRelations, type SpatialNode, type StoreyInfo, type TreeNode, type ModelCategories } from './trees';

const SPATIAL = /^IFC(PROJECT|SITE|BUILDING|BUILDINGSTOREY)$/;

interface ModelIndex { modelId: string; spatial: SpatialNode; names: Map<number, string>; cats: Map<number, string>; elevations: Map<number, number> }

function spatialIds(n: SpatialNode, out: number[] = []): number[] {
  if (n.localId !== null) out.push(n.localId);
  n.children?.forEach((c) => spatialIds(c, out));
  return out;
}

/** Reference Storeys tab names class groups without the IFC prefix (DOOR, not IFCDOOR). */
function stripIfc(n: TreeNode): TreeNode {
  return { ...n, title: n.isGroup ? n.title.replace(/^IFC/, '') : n.title, children: n.children?.map(stripIfc) };
}

/** Storeys of a model, reusing their element subtrees from the Relations tree. */
function storeysOf(idx: ModelIndex, relations: TreeNode): StoreyInfo[] {
  const out: StoreyInfo[] = [];
  const walk = (n: TreeNode) => {
    const id = n.own?.[idx.modelId] && [...n.own[idx.modelId]][0];
    if (id !== undefined && n.ifcClass === 'IFCBUILDINGSTOREY') {
      out.push({ localId: id, name: idx.names.get(id) || `Storey ${id}`, elevation: idx.elevations.get(id) ?? 0, children: n.children?.map(stripIfc) });
      return;
    }
    n.children?.forEach(walk);
  };
  walk(relations);
  return out;
}

/** MT-01…03, MT-08. Rebuilt once per model set change; trees are immutable snapshots. */
export function createTreeService(engine: Engine, visibility: VisibilityService) {
  const store = createStore<{ relations: TreeNode[]; types: TreeNode[]; storeys: TreeNode[]; loading: boolean; showSpaces: boolean; showOpenings: boolean }>({
    relations: [], types: [], storeys: [], loading: false, showSpaces: false, showOpenings: false,
  });
  const indexes = new Map<string, ModelIndex>();

  /** Parent → children via aggregation + containment, for frags whose getSpatialStructure() is empty. */
  async function relationChildren(model: any): Promise<{ root?: number; children: Map<number, number[]> }> {
    const children = new Map<number, number[]>();
    const root = (Object.values(await model.getItemsOfCategories([/^IFCPROJECT$/])).flat() as number[])[0];
    let frontier = root === undefined ? [] : [root];
    while (frontier.length) {
      const rels: Map<number, { data: Record<string, number[]> }> = await model.getRelations(frontier);
      const next: number[] = [];
      for (const [id, r] of rels) {
        const d = r?.data ?? {};
        // Older converters: RelatingAggregates / RelatingSpatialStructure; current: IsDecomposedBy / ContainsElements.
        const kids = [...(d.RelatingAggregates ?? d.IsDecomposedBy ?? []), ...(d.RelatingSpatialStructure ?? d.ContainsElements ?? [])].filter((k) => !children.has(k));
        if (kids.length) { children.set(id, kids); next.push(...kids); }
      }
      frontier = next;
    }
    return { root, children };
  }

  async function indexModel(modelId: string): Promise<ModelIndex> {
    const model = engine.fragments.list.get(modelId)!;
    let spatial = (await model.getSpatialStructure()) as SpatialNode;
    let rel: Awaited<ReturnType<typeof relationChildren>> | undefined;
    if (spatialIds(spatial).length <= 1) {
      rel = await relationChildren(model);
      if (rel.root === undefined) rel = undefined;
    }
    const ids = rel ? [rel.root!, ...new Set([...rel.children.values()].flat())] : spatialIds(spatial);
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
    if (rel) spatial = spatialFromRelations(rel.root!, rel.children, cats);
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
      const relations = all.map((m) => buildRelationsTree(m.modelId, m.spatial, m.names, m.cats));
      store.update({
        relations,
        types: buildTypesTree(typesInput),
        storeys: buildStoreysTree(all.map((m, i) => ({ modelId: m.modelId, storeys: storeysOf(m, relations[i]) }))),
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
