// MT-01…03: pure builders for the Relations / Types / Storeys trees.
import type { IdMap } from './selectionRules';

export interface SpatialNode { category: string | null; localId: number | null; children?: SpatialNode[] }

export interface TreeNode {
  key: string;
  title: string;
  /** Secondary text shown right-aligned in the row (e.g. storey name next to its model). */
  label?: string;
  ifcClass?: string;
  /** Category grouping node inside the spatial tree (e.g. all IFCWALL under a storey). */
  isGroup?: boolean;
  /** Elements this node itself stands for (not its descendants). */
  own?: IdMap;
  children?: TreeNode[];
}

/** All elements under a node, cached per node object. */
const cache = new WeakMap<TreeNode, IdMap>();
export function collectItems(node: TreeNode): IdMap {
  const hit = cache.get(node);
  if (hit) return hit;
  const out: IdMap = {};
  const add = (map?: IdMap) => {
    for (const [m, ids] of Object.entries(map ?? {})) for (const id of ids) (out[m] ??= new Set()).add(id);
  };
  add(node.own);
  node.children?.forEach((c) => add(collectItems(c)));
  cache.set(node, out);
  return out;
}

export function buildRelationsTree(modelId: string, spatial: SpatialNode, names: Map<number, string>, cats: Map<number, string>): TreeNode {
  let seq = 0;
  // Fragments alternates: category node (category set, no id) → entity nodes (id set) → category nodes …
  const entity = (n: SpatialNode): TreeNode => {
    const id = n.localId!;
    const kids = (n.children ?? []).flatMap((c) => (c.localId === null ? group(c) : [entity(c)]));
    return {
      key: `r:${modelId}:${id}`,
      title: names.get(id) || cats.get(id) || String(id),
      ifcClass: cats.get(id),
      own: { [modelId]: new Set([id]) },
      children: kids.length ? kids : undefined,
    };
  };
  // Spatial classes (project/site/building/storey) are flattened into their entities; element classes stay as groups.
  const group = (n: SpatialNode): TreeNode[] => {
    const kids = (n.children ?? []).map(entity);
    if (!n.category || /^IFC(PROJECT|SITE|BUILDING|BUILDINGSTOREY|SPACE)$/.test(n.category)) return kids;
    return [{ key: `r:${modelId}:g${seq++}`, title: n.category, isGroup: true, children: kids }];
  };
  return { key: `r:${modelId}`, title: modelId, children: group(spatial) };
}

export interface ModelCategories { modelId: string; items: Map<number, string>; names: Map<number, string> }

export function buildTypesTree(models: ModelCategories[]): TreeNode[] {
  const byClass = new Map<string, TreeNode[]>();
  for (const { modelId, items, names } of models) {
    for (const [id, cls] of items) {
      const list = byClass.get(cls) ?? byClass.set(cls, []).get(cls)!;
      list.push({ key: `t:${modelId}:${id}`, title: names.get(id) || cls, ifcClass: cls, own: { [modelId]: new Set([id]) } });
    }
  }
  return [...byClass.keys()].sort().map((cls) => ({ key: `t:${cls}`, title: cls, isGroup: true, children: byClass.get(cls) }));
}

export interface StoreyInfo { localId: number; name: string; elevation: number; children?: TreeNode[] }

const STOREY_TOLERANCE_M = 1; // MT-03: storeys of federated models less than 1 m apart are the same level (-1 m and 0 m stay apart, as in the reference)

/** Reference layout: ELEVATIONGROUP "Level X.XXm" → one row per model storey (model name, storey name) → its elements. */
export function buildStoreysTree(models: { modelId: string; storeys: StoreyInfo[] }[]): TreeNode[] {
  const levels: { elevation: number; node: TreeNode }[] = [];
  const all = models.flatMap(({ modelId, storeys }) => storeys.map((s) => ({ modelId, s }))).sort((a, b) => a.s.elevation - b.s.elevation);
  for (const { modelId, s } of all) {
    let level = levels.find((l) => Math.abs(l.elevation - s.elevation) < STOREY_TOLERANCE_M);
    if (!level) {
      level = { elevation: s.elevation, node: { key: `s:${levels.length}`, title: 'ELEVATIONGROUP', label: `Level ${s.elevation.toFixed(2)}m`, isGroup: true, children: [] } };
      levels.push(level);
    }
    level.node.children!.push({ key: `s:${modelId}:${s.localId}`, title: modelId, label: s.name, ifcClass: 'IFCBUILDINGSTOREY', own: { [modelId]: new Set([s.localId]) }, children: s.children });
  }
  return levels.map((l) => l.node);
}

/**
 * Rebuilds the Fragments spatial-tree shape (entity → category group → entity …) from a parent → children map.
 * Used for frags whose getSpatialStructure() is empty because their converter named relations differently.
 */
export function spatialFromRelations(rootId: number, children: Map<number, number[]>, cats: Map<number, string>): SpatialNode {
  const seen = new Set<number>();
  const entity = (id: number): SpatialNode => {
    seen.add(id);
    const groups = new Map<string, SpatialNode[]>();
    for (const c of children.get(id) ?? []) {
      if (seen.has(c)) continue; // guard against cyclic relation data
      const cat = cats.get(c) ?? 'UNKNOWN';
      (groups.get(cat) ?? groups.set(cat, []).get(cat)!).push(entity(c));
    }
    const kids = [...groups].map(([category, ns]) => ({ category, localId: null, children: ns }));
    return { category: null, localId: id, children: kids.length ? kids : undefined };
  };
  return { category: cats.get(rootId) ?? 'IFCPROJECT', localId: null, children: [entity(rootId)] };
}
