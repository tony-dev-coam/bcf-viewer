import { createContext, useContext, useSyncExternalStore } from 'react';
import type { Store, Viewer } from '../core';

export const ViewerContext = createContext<Viewer | null>(null);

export function useViewer(): Viewer {
  const v = useContext(ViewerContext);
  if (!v) throw new Error('useViewer outside ViewerContext');
  return v;
}

export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}
