import { describe, it, expect } from 'vitest';
import { visibilityForViewpoint, filterTopics, type TopicRow } from './helpers';

describe('visibilityForViewpoint', () => {
  it('few hidden → default visible + hidden as exceptions', () => {
    expect(visibilityForViewpoint(['a', 'b', 'c', 'd'], ['e'])).toEqual({ defaultVisibility: true, exceptions: ['e'] });
  });
  it('isolated (few visible) → default hidden + visible as exceptions', () => {
    expect(visibilityForViewpoint(['a'], ['b', 'c', 'd'])).toEqual({ defaultVisibility: false, exceptions: ['a'] });
  });
  it('nothing hidden → no exceptions', () => {
    expect(visibilityForViewpoint(['a', 'b'], [])).toEqual({ defaultVisibility: true, exceptions: [] });
  });
});

const row = (p: Partial<TopicRow>): TopicRow => ({
  guid: 'g', title: 't', type: 'Issue', status: 'Open', labels: [], creationDate: '2026-01-01', creationAuthor: 'a', commentCount: 0, ...p,
});

describe('filterTopics (BM-04)', () => {
  const rows = [row({ guid: '1', title: 'STR / ARC - Clash', status: 'Open', labels: ['STR'] }), row({ guid: '2', title: 'Missing railing', status: 'Closed', priority: 'Critical' })];
  it('free-text search over title, description, labels, assignee', () => {
    expect(filterTopics(rows, 'clash', {}).map((r) => r.guid)).toEqual(['1']);
    expect(filterTopics(rows, 'str', {}).map((r) => r.guid)).toEqual(['1']);
  });
  it('column filters are AND-ed, values within a column OR-ed', () => {
    expect(filterTopics(rows, '', { status: ['Open', 'Closed'] }).length).toBe(2);
    expect(filterTopics(rows, '', { status: ['Closed'], priority: ['Critical'] }).map((r) => r.guid)).toEqual(['2']);
    expect(filterTopics(rows, '', { labels: ['STR'] }).map((r) => r.guid)).toEqual(['1']);
  });
});
