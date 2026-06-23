import { describe, expect, it } from 'vitest';

import {
  filterNav,
  SECTIONS_BY_SCOPE,
  sectionsForOrgType,
  SETTINGS_NAV,
} from './settings-sections.ts';

describe('SETTINGS_NAV registry', () => {
  it('lists every section of both scopes exactly once', () => {
    for (const group of SETTINGS_NAV) {
      const sections = group.items.map((i) => i.section);
      expect(sections).toEqual([...SECTIONS_BY_SCOPE[group.scope]]);
      expect(new Set(sections).size).toBe(sections.length);
    }
  });

  it('every item carries its group scope', () => {
    for (const group of SETTINGS_NAV) {
      for (const item of group.items) {
        expect(item.scope).toBe(group.scope);
      }
    }
  });
});

describe('filterNav', () => {
  it('returns all groups when the query is empty', () => {
    expect(filterNav(SETTINGS_NAV, '')).toEqual(SETTINGS_NAV);
    expect(filterNav(SETTINGS_NAV, '   ')).toEqual(SETTINGS_NAV);
  });

  it('matches by label (case-insensitive)', () => {
    const sections = filterNav(SETTINGS_NAV, 'SECURITY').flatMap((g) =>
      g.items.map((i) => i.section),
    );
    expect(sections).toContain('security');
  });

  it('matches by keyword', () => {
    const sections = filterNav(SETTINGS_NAV, 'invoices').flatMap((g) =>
      g.items.map((i) => i.section),
    );
    expect(sections).toEqual(['billing']);
  });

  it('drops groups with no matching items', () => {
    const groups = filterNav(SETTINGS_NAV, 'passkey');
    expect(groups).toHaveLength(1);
    expect(groups[0]?.scope).toBe('account');
  });

  it('returns no groups when nothing matches', () => {
    expect(filterNav(SETTINGS_NAV, 'zzznomatch')).toEqual([]);
  });
});

describe('sectionsForOrgType', () => {
  it('gives a team the full management set', () => {
    const team = sectionsForOrgType('TEAM');
    expect(team).toEqual(['general', 'members', 'roles', 'billing', 'integrations']);
  });

  it('keeps a personal org lean — General + Billing only', () => {
    const personal = sectionsForOrgType('PERSONAL');
    expect(personal).toEqual(['general', 'billing']);
    expect(personal).not.toContain('members');
    expect(personal).not.toContain('roles');
    expect(personal).not.toContain('integrations');
  });
});
