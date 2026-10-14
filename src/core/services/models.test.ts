import { describe, it, expect } from 'vitest';
import { uniqueModelId, fileKind } from './models';

describe('uniqueModelId', () => {
  it('strips the extension', () => expect(uniqueModelId('house.ifc', [])).toBe('house'));
  it('suffixes duplicates', () => {
    expect(uniqueModelId('house.ifc', ['house'])).toBe('house (2)');
    expect(uniqueModelId('house.frag', ['house', 'house (2)'])).toBe('house (3)');
  });
});

describe('fileKind', () => {
  it('detects ifc / frag case-insensitively', () => {
    expect(fileKind('a.IFC')).toBe('ifc');
    expect(fileKind('a.frag')).toBe('frag');
  });
  it('returns null for unsupported files', () => expect(fileKind('a.rvt')).toBeNull());
});
