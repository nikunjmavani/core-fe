import { describe, expect, it } from 'vitest';

import { isSettingsHash, parseSettingsHash, settingsHash } from './settings-hash.ts';

describe('settingsHash', () => {
  it('builds the hash value without a leading #', () => {
    expect(settingsHash('account', 'profile')).toBe('settings/account/profile');
    expect(settingsHash('organization', 'general')).toBe('settings/organization/general');
  });
});

describe('isSettingsHash', () => {
  it('matches the bare settings hash', () => {
    expect(isSettingsHash('settings')).toBe(true);
    expect(isSettingsHash('#settings')).toBe(true);
  });

  it('matches scoped hashes', () => {
    expect(isSettingsHash('settings/account/profile')).toBe(true);
    expect(isSettingsHash('#settings/organization/members')).toBe(true);
  });

  it('does not match other hashes', () => {
    expect(isSettingsHash('')).toBe(false);
    expect(isSettingsHash('main-content')).toBe(false);
    expect(isSettingsHash('settings-other')).toBe(false);
  });
});

describe('parseSettingsHash', () => {
  it.each([
    ['settings/account/profile', 'account', 'profile'],
    ['settings/account/sessions', 'account', 'sessions'],
    ['#settings/organization/general', 'organization', 'general'],
    ['settings/organization/integrations', 'organization', 'integrations'],
  ])('parses %s', (hash, scope, section) => {
    expect(parseSettingsHash(hash)).toEqual({ scope, section });
  });

  it('returns null for non-settings hashes (modal closed)', () => {
    expect(parseSettingsHash('')).toBeNull();
    expect(parseSettingsHash('main-content')).toBeNull();
    expect(parseSettingsHash('#settingsx/account/profile')).toBeNull();
  });

  it('falls back to account/profile for a bare settings hash', () => {
    expect(parseSettingsHash('settings')).toEqual({
      scope: 'account',
      section: 'profile',
    });
  });

  it('falls back to account/profile for invalid scope or section', () => {
    expect(parseSettingsHash('settings/bogus/profile')).toEqual({
      scope: 'account',
      section: 'profile',
    });
    expect(parseSettingsHash('settings/account/bogus')).toEqual({
      scope: 'account',
      section: 'profile',
    });
    // Section from the wrong scope is invalid too.
    expect(parseSettingsHash('settings/account/general')).toEqual({
      scope: 'account',
      section: 'profile',
    });
  });
});
