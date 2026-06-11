import { describe, expect, it } from 'vitest';

import type { AccessContext } from '@/core/rbac/policies.ts';

import { canViewSettingsSection } from './settings-permissions.ts';

const member = (permissions: AccessContext['permissions']): AccessContext => ({
  role: 'user',
  permissions,
});

describe('canViewSettingsSection', () => {
  it('account sections only need a signed-in user', () => {
    expect(
      canViewSettingsSection({ scope: 'account', section: 'profile' }, member([])),
    ).toBe(true);
    expect(
      canViewSettingsSection({ scope: 'account', section: 'sessions' }, member([])),
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
    expect(
      canViewSettingsSection({ scope: 'organization', section: 'billing' }, member([])),
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
});
