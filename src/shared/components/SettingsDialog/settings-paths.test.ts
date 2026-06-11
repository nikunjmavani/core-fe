import { describe, expect, it } from 'vitest';

import {
  DEFAULT_SETTINGS_PATH,
  DEFAULT_SETTINGS_SECTION,
  isSettingsPath,
  pathForSection,
  sectionFromPath,
} from './settings-paths.ts';

describe('isSettingsPath', () => {
  it('matches the bare /settings path', () => {
    expect(isSettingsPath('/settings')).toBe(true);
  });

  it('matches nested settings paths', () => {
    expect(isSettingsPath('/settings/profile')).toBe(true);
    expect(isSettingsPath('/settings/organization')).toBe(true);
  });

  it('does not match other paths', () => {
    expect(isSettingsPath('/')).toBe(false);
    expect(isSettingsPath('/dashboard')).toBe(false);
    expect(isSettingsPath('/settings-other')).toBe(false);
  });
});

describe('sectionFromPath', () => {
  it.each([
    ['/settings/profile', 'profile'],
    ['/settings/account', 'account'],
    ['/settings/security', 'security'],
    ['/settings/appearance', 'appearance'],
    ['/settings/notifications', 'notifications'],
    ['/settings/organization', 'org-general'],
  ])('maps %s → %s', (path, expected) => {
    expect(sectionFromPath(path)).toBe(expected);
  });

  it('normalizes trailing slash', () => {
    expect(sectionFromPath('/settings/security/')).toBe('security');
  });

  it('falls back to the default section for unknown paths', () => {
    expect(sectionFromPath('/settings')).toBe(DEFAULT_SETTINGS_SECTION);
    expect(sectionFromPath('/settings/unknown')).toBe(DEFAULT_SETTINGS_SECTION);
    expect(sectionFromPath('/dashboard')).toBe(DEFAULT_SETTINGS_SECTION);
  });
});

describe('pathForSection', () => {
  it.each([
    ['profile', '/settings/profile'],
    ['account', '/settings/account'],
    ['security', '/settings/security'],
    ['appearance', '/settings/appearance'],
    ['notifications', '/settings/notifications'],
    ['org-general', '/settings/organization'],
  ] as const)('maps %s → %s', (section, expected) => {
    expect(pathForSection(section)).toBe(expected);
  });
});

describe('round-trip', () => {
  it('pathForSection ↔ sectionFromPath are inverse', () => {
    const sections = [
      'profile',
      'account',
      'security',
      'appearance',
      'notifications',
      'org-general',
    ] as const;
    for (const s of sections) {
      expect(sectionFromPath(pathForSection(s))).toBe(s);
    }
  });

  it('DEFAULT_SETTINGS_PATH maps back to DEFAULT_SETTINGS_SECTION', () => {
    expect(sectionFromPath(DEFAULT_SETTINGS_PATH)).toBe(DEFAULT_SETTINGS_SECTION);
  });
});
