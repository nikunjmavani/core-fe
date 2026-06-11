import { describe, expect, it } from 'vitest';

import { filterNav, SETTINGS_NAV } from './nav-items.ts';

describe('filterNav', () => {
  it('returns all groups when the query is empty', () => {
    expect(filterNav(SETTINGS_NAV, '')).toEqual(SETTINGS_NAV);
    expect(filterNav(SETTINGS_NAV, '   ')).toEqual(SETTINGS_NAV);
  });

  it('matches by label (case-insensitive)', () => {
    const ids = filterNav(SETTINGS_NAV, 'SECURITY').flatMap((g) =>
      g.items.map((i) => i.id),
    );
    expect(ids).toContain('security');
  });

  it('matches by keyword', () => {
    const ids = filterNav(SETTINGS_NAV, 'passkey').flatMap((g) =>
      g.items.map((i) => i.id),
    );
    expect(ids).toContain('security');
  });

  it('drops groups that have no matching items', () => {
    const groups = filterNav(SETTINGS_NAV, 'security');
    expect(groups.every((g) => g.items.length > 0)).toBe(true);
    expect(groups.some((g) => g.id === 'organization')).toBe(false);
  });

  it('returns an empty array when nothing matches', () => {
    expect(filterNav(SETTINGS_NAV, 'xyznevermatches')).toEqual([]);
  });
});
