import { describe, it, expect } from 'vitest';
import { buildRelationsTree, buildTypesTree, buildStoreysTree, collectItems, type SpatialNode } from './trees';

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
  it('merges storeys of federated models whose elevations are within 1 m, ordered by elevation', () => {
    const t = buildStoreysTree([
      { modelId: 'arc', storeys: [{ localId: 10, name: 'L1', elevation: 0, elements: [100] }, { localId: 11, name: 'L2', elevation: 3.2, elements: [200] }] },
      { modelId: 'str', storeys: [{ localId: 7, name: 'Level 1', elevation: 0.4, elements: [70] }] },
    ], (_m, id) => new Map([[100, 'Wall A'], [200, 'Slab'], [70, 'Beam']]).get(id) ?? '');
    expect(t.map((n) => n.title)).toEqual(['L1', 'L2']);
    expect(collectItems(t[0])).toEqual({ arc: new Set([10, 100]), str: new Set([7, 70]) });
  });
});
