import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import type { OrganizationPermission } from '@/core/types/permissions.ts';
import type { Role } from '@/shared/auth/types.ts';

import {
  type AccessContext,
  hasAllPermissions,
  hasAnyPermission,
  hasGlobalRole,
  hasPermission,
} from './policies.ts';

// Property-based coverage of the RBAC predicates: assert algebraic invariants
// (god-mode, deny-by-default, all⇒any, monotonicity) over thousands of random
// contexts — the invariants hold regardless of how the predicates are written.

const ROLES: Role[] = ['super_admin', 'admin', 'user'];
const PERMISSIONS: OrganizationPermission[] = [
  'organization:read',
  'organization:update',
  'organization:delete',
  'membership:read',
  'membership:manage',
  'invitation:manage',
  'role:read',
  'role:manage',
  'api-key:read',
  'api-key:manage',
  'notification-policy:read',
  'notification-policy:manage',
  'subscription:read',
  'subscription:manage',
  'webhook:read',
  'webhook:manage',
  'audit-log:read',
  'upload:manage',
];

const roleArb = fc.constantFrom(...ROLES);
const permissionArb = fc.constantFrom(...PERMISSIONS);
const permissionSetArb = fc.uniqueArray(permissionArb);
const contextArb: fc.Arbitrary<AccessContext> = fc.record({
  role: roleArb,
  permissions: permissionSetArb,
});

describe('rbac policies — property based', () => {
  it('super_admin is granted every permission (platform god-mode)', () => {
    fc.assert(
      fc.property(permissionArb, permissionSetArb, (perm, held) => {
        expect(hasPermission({ role: 'super_admin', permissions: held }, perm)).toBe(
          true,
        );
      }),
    );
  });

  it('a non-super_admin grant is exactly explicit set membership (deny by default)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<Role>('admin', 'user'),
        permissionArb,
        permissionSetArb,
        (role, perm, held) => {
          expect(hasPermission({ role, permissions: held }, perm)).toBe(
            held.includes(perm),
          );
        },
      ),
    );
  });

  it('hasAllPermissions === every, hasAnyPermission === some', () => {
    fc.assert(
      fc.property(contextArb, permissionSetArb, (ctx, required) => {
        expect(hasAllPermissions(ctx, required)).toBe(
          required.every((p) => hasPermission(ctx, p)),
        );
        expect(hasAnyPermission(ctx, required)).toBe(
          required.some((p) => hasPermission(ctx, p)),
        );
      }),
    );
  });

  it('empty required list: all is vacuously true, any is false', () => {
    fc.assert(
      fc.property(contextArb, (ctx) => {
        expect(hasAllPermissions(ctx, [])).toBe(true);
        expect(hasAnyPermission(ctx, [])).toBe(false);
      }),
    );
  });

  it('hasAll implies hasAny for a non-empty required list', () => {
    fc.assert(
      fc.property(
        contextArb,
        fc.array(permissionArb, { minLength: 1 }),
        (ctx, required) => {
          if (hasAllPermissions(ctx, required)) {
            expect(hasAnyPermission(ctx, required)).toBe(true);
          }
        },
      ),
    );
  });

  it('granting more permissions never revokes access (monotonicity)', () => {
    fc.assert(
      fc.property(
        roleArb,
        permissionSetArb,
        permissionSetArb,
        permissionSetArb,
        (role, held, extra, required) => {
          const base: AccessContext = { role, permissions: held };
          const wider: AccessContext = { role, permissions: [...held, ...extra] };
          if (hasAllPermissions(base, required)) {
            expect(hasAllPermissions(wider, required)).toBe(true);
          }
          if (hasAnyPermission(base, required)) {
            expect(hasAnyPermission(wider, required)).toBe(true);
          }
        },
      ),
    );
  });

  it('hasGlobalRole is exactly allow-list membership', () => {
    fc.assert(
      fc.property(roleArb, fc.uniqueArray(roleArb), (role, allowed) => {
        expect(hasGlobalRole(role, allowed)).toBe(allowed.includes(role));
      }),
    );
  });
});
