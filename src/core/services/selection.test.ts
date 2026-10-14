import { describe, it, expect } from 'vitest';
import { applyPick, countItems } from './selectionRules';

const hit = (modelId: string, localId: number) => ({ modelId, localId });

describe('applyPick (SE-01)', () => {
  it('click replaces the selection', () => {
    expect(applyPick({ a: new Set([1]) }, hit('b', 2), false)).toEqual({ b: new Set([2]) });
  });
  it('ctrl+click adds, and removes an already selected item', () => {
    const added = applyPick({ a: new Set([1]) }, hit('a', 2), true);
    expect(added).toEqual({ a: new Set([1, 2]) });
    expect(applyPick(added, hit('a', 1), true)).toEqual({ a: new Set([2]) });
  });
  it('click on empty space clears; ctrl+click on empty space keeps', () => {
    expect(applyPick({ a: new Set([1]) }, null, false)).toEqual({});
    expect(applyPick({ a: new Set([1]) }, null, true)).toEqual({ a: new Set([1]) });
  });
  it('drops models that become empty', () => {
    expect(applyPick({ a: new Set([1]) }, hit('a', 1), true)).toEqual({});
  });
  it('does not mutate the input', () => {
    const before = { a: new Set([1]) };
    applyPick(before, hit('a', 2), true);
    expect(before).toEqual({ a: new Set([1]) });
  });
});

describe('countItems', () => {
  it('sums across models', () => expect(countItems({ a: new Set([1, 2]), b: new Set([3]) })).toBe(3));
});
