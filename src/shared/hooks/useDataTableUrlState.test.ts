import { describe, expect, it } from 'vitest';

import { sortingFromSearch, sortingToSearch } from './useDataTableUrlState.ts';

describe('useDataTableUrlState helpers', () => {
  it('sortingFromSearch parses column:direction', () => {
    expect(sortingFromSearch('name:asc')).toEqual([{ id: 'name', desc: false }]);
    expect(sortingFromSearch('joinedAt:desc')).toEqual([{ id: 'joinedAt', desc: true }]);
  });

  it('sortingFromSearch returns empty for invalid input', () => {
    expect(sortingFromSearch(undefined)).toEqual([]);
    expect(sortingFromSearch('bad')).toEqual([]);
  });

  it('sortingToSearch serializes the first sort column', () => {
    expect(sortingToSearch([{ id: 'role', desc: true }])).toBe('role:desc');
    expect(sortingToSearch([])).toBeUndefined();
  });
});
