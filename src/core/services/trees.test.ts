import { describe, it, expect } from 'vitest';
import { buildRelationsTree, spatialFromRelations, buildTypesTree, buildStoreysTree, collectItems, type SpatialNode } from './trees';

// IFCPROJECT(1) > IFCBUILDINGSTOREY(10) > [IFCWALL group: 100, 101] ; IFCBUILDINGSTOREY(11) > [IFCSLAB group: 200]
const spatial: SpatialNode = {
  category: 'IFCPROJECT', localId: null, children: [{ category: null, localId: 1, children: [
    { category: 'IFCBUILDINGSTOREY', localId: null, children: [
      { category: null, localId: 10, children: [{ category: 'IFCWALL', localId: null, children: [{ category: null, localId: 100 }, { category: null, localId: 101 }] }] },
      { category: null, localId: 11, children: [{ category: 'IFCSLAB', localId: null, children: [{ category: null, localId: 200 }] }] },
    ] },
  ] }],
};
const names = new Map<number, string>([[1, 'Proj'], [10, 'L1'], [11, 'L2'], [100, 'Wall A'], [101, 'Wall B'], [200, 'Slab']]);
const cats = new Map<number, string>([[1, 'IFCPROJECT'], [10, 'IFCBUILDINGSTOREY'], [11, 'IFCBUILDINGSTOREY'], [100, 'IFCWALL'], [101, 'IFCWALL'], [200, 'IFCSLAB']]);

describe('buildRelationsTree (MT-01)', () => {
  const root = buildRelationsTree('arc', spatial, names, cats);
  it('root is the model with all its elements', () => {
    expect(root.title).toBe('arc');
    expect(collectItems(root)).toEqual({ arc: new Set([1, 10, 11, 100, 101, 200]) });
  });
  it('entity nodes carry name + class; category group nodes wrap their elements', () => {
    const proj = root.children![0];
    expect(proj).toMatchObject({ title: 'Proj', ifcClass: 'IFCPROJECT' });
    const l1 = proj.children![0];
    expect(l1.title).toBe('L1');
    expect(l1.children![0]).toMatchObject({ title: 'IFCWALL', isGroup: true });
    expect(l1.children![0].children!.map((n) => n.title)).toEqual(['Wall A', 'Wall B']);
  });
  it('keys are unique', () => {
    const keys: string[] = [];
    const walk = (n: typeof root) => { keys.push(n.key); n.children?.forEach(walk); };
    walk(root);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('buildTypesTree (MT-02)', () => {
  it('groups elements by IFC class across models, sorted', () => {
    const t = buildTypesTree([{ modelId: 'arc', items: new Map([[100, 'IFCWALL'], [200, 'IFCSLAB']]), names }, { modelId: 'str', items: new Map([[5, 'IFCWALL']]), names: new Map([[5, 'W']]) }]);
    expect(t.map((n) => n.title)).toEqual(['IFCSLAB', 'IFCWALL']);
    expect(collectItems(t[1])).toEqual({ arc: new Set([100]), str: new Set([5]) });
  });
});

describe('buildStoreysTree (MT-03)', () => {
  const leaf = (m: string, id: number) => ({ key: `r:${m}:${id}`, title: String(id), own: { [m]: new Set([id]) } });
  const t = buildStoreysTree([
    { modelId: 'arc', storeys: [{ localId: 10, name: 'L1', elevation: 0, children: [leaf('arc', 100)] }, { localId: 11, name: 'L2', elevation: 3.2, children: [leaf('arc', 200)] }, { localId: 12, name: 'Footing', elevation: -1 }] },
    { modelId: 'str', storeys: [{ localId: 7, name: 'Level 1', elevation: 0.4, children: [leaf('str', 70)] }] },
  ]);
  it('groups storeys less than 1 m apart into ELEVATIONGROUP levels, ordered by elevation', () => {
    expect(t.map((n) => [n.title, n.label])).toEqual([['ELEVATIONGROUP', 'Level -1.00m'], ['ELEVATIONGROUP', 'Level 0.00m'], ['ELEVATIONGROUP', 'Level 3.20m']]);
    expect(collectItems(t[1])).toEqual({ arc: new Set([10, 100]), str: new Set([7, 70]) });
  });
  it('each level lists one row per model storey: model name + storey name', () => {
    expect(t[1].children!.map((n) => [n.title, n.label])).toEqual([['arc', 'L1'], ['str', 'Level 1']]);
  });
});
describe('spatialFromRelations', () => {
  it('rebuilds a relations-derived spatial tree that feeds the Relations / Types / Storeys builders', () => {
    const cats = new Map([[1, 'IFCPROJECT'], [2, 'IFCSITE'], [3, 'IFCBUILDINGSTOREY'], [4, 'IFCWALL'], [5, 'IFCWALL'], [6, 'IFCSLAB']]);
    const children = new Map([[1, [2]], [2, [3]], [3, [4, 5, 6]], [4, [1]]]); // 4 → 1 is a cycle and is ignored
    const sp = spatialFromRelations(1, children, cats);
    const storey = sp.children![0].children![0].children![0].children![0].children![0];
    expect(storey.localId).toBe(3);
    expect(storey.children!.map((g) => [g.category, g.children!.map((c) => c.localId)])).toEqual([['IFCWALL', [4, 5]], ['IFCSLAB', [6]]]);
    const tree = buildRelationsTree('m', sp, new Map(), cats);
    expect(collectItems(tree).m.size).toBe(6);
  });
});
