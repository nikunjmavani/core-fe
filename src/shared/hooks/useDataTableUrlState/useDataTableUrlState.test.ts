import { describe, expect, it } from 'vitest';

import {
  filtersFromSearch,
  sortingFromSearch,
  sortingToSearch,
} from './useDataTableUrlState.ts';

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

  it('filtersFromSearch maps q and role to column filters', () => {
    expect(filtersFromSearch({ q: 'ada', role: 'admin' }, true)).toEqual([
      { id: 'name', value: 'ada' },
      { id: 'role', value: 'admin' },
    ]);
  });

  it('filtersFromSearch drops the "all" role sentinel and empty query', () => {
    expect(filtersFromSearch({ q: '', role: 'all' }, true)).toEqual([]);
    expect(filtersFromSearch({ role: 'member' }, true)).toEqual([
      { id: 'role', value: 'member' },
    ]);
  });

  it('filtersFromSearch returns empty when disabled (local-only table)', () => {
    // Guards the seed-once contract: the hook memoizes this on [enabled] only,
    // so when disabled it must never surface URL-derived filters.
    expect(filtersFromSearch({ q: 'ada', role: 'admin' }, false)).toEqual([]);
  });
});
