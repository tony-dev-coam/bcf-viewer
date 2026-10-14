export interface TopicRow {
  guid: string;
  index?: number;
  title: string;
  type: string;
  status: string;
  priority?: string;
  stage?: string;
  labels: string[];
  assignedTo?: string;
  dueDate?: string; // ISO
  description?: string;
  creationDate: string;
  creationAuthor: string;
  modifiedDate?: string;
  modifiedAuthor?: string;
  thumbnail?: string; // blob: URL of the first viewpoint snapshot
  commentCount: number;
}

export type TopicFilters = Partial<Record<'type' | 'status' | 'priority' | 'stage' | 'labels' | 'assignedTo', string[]>>;

/** Smallest BCF visibility description: list whichever side (hidden or visible) is shorter as exceptions. */
export function visibilityForViewpoint(visibleGuids: string[], hiddenGuids: string[]) {
  return hiddenGuids.length <= visibleGuids.length
    ? { defaultVisibility: true, exceptions: hiddenGuids }
    : { defaultVisibility: false, exceptions: visibleGuids };
}

export function filterTopics(rows: TopicRow[], query: string, filters: TopicFilters): TopicRow[] {
  const q = query.trim().toLowerCase();
  return rows.filter((r) => {
    if (q && ![r.title, r.description, r.assignedTo, ...r.labels].some((s) => s?.toLowerCase().includes(q))) return false;
    for (const [key, values] of Object.entries(filters) as [keyof TopicFilters, string[]][]) {
      if (!values?.length) continue;
      const v = r[key];
      const have = Array.isArray(v) ? v : v ? [v] : [];
      if (!have.some((x) => values.includes(x))) return false;
    }
    return true;
  });
}
