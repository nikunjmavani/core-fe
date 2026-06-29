import { describe, expect, it, vi } from 'vitest';

const disabledModulesRef = vi.hoisted(() => ({ value: new Set<string>() }));
vi.mock('@/core/config/env.ts', () => ({
  platformConfig: {
    get disabledModules() {
      return disabledModulesRef.value;
    },
  },
}));

import type { AccessContext } from '@/core/rbac/policies.ts';

import { canViewSettingsSection } from './settings-permissions.ts';

const member = (permissions: AccessContext['permissions']): AccessContext => ({
  role: 'user',
  permissions,
});

describe('canViewSettingsSection', () => {
  beforeEach(() => {
    disabledModulesRef.value = new Set();
  });

  it('account sections only need a signed-in user', () => {
    expect(
      canViewSettingsSection({ scope: 'account', section: 'profile' }, member([])),
    ).toBe(true);
    expect(
      canViewSettingsSection({ scope: 'account', section: 'sessions' }, member([])),
    ).toBe(true);
  });

  it('account billing requires organization:read', () => {
    expect(
      canViewSettingsSection({ scope: 'account', section: 'billing' }, member([])),
    ).toBe(false);
    expect(
      canViewSettingsSection(
        { scope: 'account', section: 'billing' },
        member(['organization:read']),
      ),
    ).toBe(true);
  });

  it('organization sections require their permission', () => {
    expect(
      canViewSettingsSection(
        { scope: 'organization', section: 'members' },
        member(['membership:read']),
      ),
    ).toBe(true);
    expect(
      canViewSettingsSection({ scope: 'organization', section: 'members' }, member([])),
    ).toBe(false);
  });

  it('super_admin bypasses organization permissions', () => {
    expect(
      canViewSettingsSection(
        { scope: 'organization', section: 'roles' },
        { role: 'super_admin', permissions: [] },
      ),
    ).toBe(true);
  });

  it('denies sections whose L6b module is disabled for the deployment', () => {
    disabledModulesRef.value = new Set(['billing', 'members']);
    expect(
      canViewSettingsSection(
        { scope: 'account', section: 'billing' },
        member(['organization:read']),
      ),
    ).toBe(false);
    expect(
      canViewSettingsSection(
        { scope: 'organization', section: 'members' },
        member(['membership:read']),
      ),
    ).toBe(false);
    expect(
      canViewSettingsSection(
        { scope: 'organization', section: 'roles' },
        member(['role:read']),
      ),
    ).toBe(true);
  });
});
