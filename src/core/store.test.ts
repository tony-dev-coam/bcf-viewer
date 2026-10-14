import { describe, it, expect, vi } from 'vitest';
import { createStore } from './store';

describe('createStore', () => {
  it('returns the same snapshot until set, then notifies subscribers', () => {
    const s = createStore({ n: 1 });
    const first = s.getSnapshot();
    expect(s.getSnapshot()).toBe(first);
    const cb = vi.fn();
    const off = s.subscribe(cb);
    s.set({ n: 2 });
    expect(cb).toHaveBeenCalledTimes(1);
    expect(s.getSnapshot()).toEqual({ n: 2 });
    off();
    s.set({ n: 3 });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('update merges a partial patch', () => {
    const s = createStore({ a: 1, b: 2 });
    s.update({ b: 5 });
    expect(s.getSnapshot()).toEqual({ a: 1, b: 5 });
  });
});
