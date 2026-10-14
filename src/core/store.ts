/** Minimal observable value for React's useSyncExternalStore. Snapshots are replaced, never mutated. */
export interface Store<T> {
  getSnapshot(): T;
  subscribe(cb: () => void): () => void;
}

export interface WritableStore<T> extends Store<T> {
  set(value: T): void;
  update(patch: Partial<T>): void;
}

export function createStore<T>(initial: T): WritableStore<T> {
  let value = initial;
  const subs = new Set<() => void>();
  const set = (next: T) => {
    value = next;
    subs.forEach((cb) => cb());
  };
  return {
    getSnapshot: () => value,
    subscribe(cb) {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    set,
    update: (patch) => set({ ...value, ...patch }),
  };
}
