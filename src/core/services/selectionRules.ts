// Pure selection rules (kept free of three.js so they unit-test in jsdom).
export type IdMap = Record<string, Set<number>>;
export type Pick = { modelId: string; localId: number } | null;

export const countItems = (map: IdMap) => Object.values(map).reduce((n, s) => n + s.size, 0);

/** SE-01: click replaces; CTRL+click toggles the item; click on empty space clears (CTRL keeps). */
export function applyPick(current: IdMap, pick: Pick, ctrl: boolean): IdMap {
  if (!pick) return ctrl ? current : {};
  if (!ctrl) return { [pick.modelId]: new Set([pick.localId]) };
  const next: IdMap = {};
  for (const [id, set] of Object.entries(current)) next[id] = new Set(set);
  const set = (next[pick.modelId] ??= new Set());
  if (set.has(pick.localId)) set.delete(pick.localId);
  else set.add(pick.localId);
  if (!set.size) delete next[pick.modelId];
  return next;
}
