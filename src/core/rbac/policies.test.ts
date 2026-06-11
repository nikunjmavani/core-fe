import { describe, expect, it } from 'vitest';

import type { AccessContext } from './policies.ts';
import {
  hasAllPermissions,
  hasAnyPermission,
  hasGlobalRole,
  hasPermission,
} from './policies.ts';

const ctx = (over: Partial<AccessContext> = {}): AccessContext => ({
  role: 'user',
  permissions: [],
  ...over,
});

describe('hasPermission', () => {
  it('grants when the active-org permission set includes the code', () => {
    expect(
      hasPermission(ctx({ permissions: ['membership:read'] }), 'membership:read'),
    ).toBe(true);
  });

  it('denies when the permission is not in the set', () => {
    expect(
      hasPermission(ctx({ permissions: ['membership:read'] }), 'membership:manage'),
    ).toBe(false);
  });

  it('super_admin bypasses the permission set', () => {
    expect(hasPermission(ctx({ role: 'super_admin' }), 'organization:delete')).toBe(true);
  });

  it('global admin is still governed by org permissions', () => {
    expect(hasPermission(ctx({ role: 'admin' }), 'organization:delete')).toBe(false);
  });
});

describe('hasAllPermissions', () => {
  it('returns true when all permissions are granted', () => {
    expect(
      hasAllPermissions(ctx({ permissions: ['role:read', 'role:manage'] }), [
        'role:read',
        'role:manage',
      ]),
    ).toBe(true);
  });

  it('returns false when any permission is missing', () => {
    expect(
      hasAllPermissions(ctx({ permissions: ['role:read'] }), [
        'role:read',
        'role:manage',
      ]),
    ).toBe(false);
  });

  it('returns true for an empty list', () => {
    expect(hasAllPermissions(ctx(), [])).toBe(true);
  });
});

describe('hasAnyPermission', () => {
  it('returns true when at least one permission is granted', () => {
    expect(
      hasAnyPermission(ctx({ permissions: ['api-key:read'] }), [
        'api-key:manage',
        'api-key:read',
      ]),
    ).toBe(true);
  });

  it('returns false when none are granted', () => {
    expect(
      hasAnyPermission(ctx({ permissions: [] }), ['api-key:manage', 'api-key:read']),
    ).toBe(false);
  });

  it('returns false for an empty list', () => {
    expect(hasAnyPermission(ctx(), [])).toBe(false);
  });
});

describe('hasGlobalRole', () => {
  it('matches an allowed global role', () => {
    expect(hasGlobalRole('admin', ['super_admin', 'admin'])).toBe(true);
  });

  it('rejects a non-allowed global role', () => {
    expect(hasGlobalRole('user', ['super_admin', 'admin'])).toBe(false);
  });
});
