import type { OrganizationPermission } from '@/core/types/permissions.ts';
import type { Role } from '@/shared/auth/types.ts';

// The permission codes live in core/types (so lib may reference them); the RBAC
// engine re-exports them for its consumers.
export type { OrganizationPermission };

/**
 * Access context for a permission decision: the user's global role plus the set
 * of org-scoped permissions they hold in the currently-active organization.
 */
export interface AccessContext {
  /** Platform-wide role. */
  role: Role;
  /** Permission codes granted in the active organization. */
  permissions: OrganizationPermission[];
}

/**
 * Check whether the access context grants a single org-scoped permission.
 *
 * `super_admin` bypasses (platform god-mode); every other role is governed by
 * the explicit permission set granted in the active organization.
 *
 * @param ctx - The user's global role + active-org permission set.
 * @param permission - The required org-scoped permission code.
 * @returns `true` if the permission is granted.
 *
 * @example
 * hasPermission({ role: 'user', permissions: ['membership:read'] }, 'membership:read'); // true
 */
export function hasPermission(
  ctx: AccessContext,
  permission: OrganizationPermission,
): boolean {
  if (ctx.role === 'super_admin') return true;
  return ctx.permissions.includes(permission);
}

/**
 * Check that the context grants **all** of the given permissions.
 *
 * @param ctx - The access context.
 * @param permissions - Required permissions; an empty list is vacuously `true`.
 */
export function hasAllPermissions(
  ctx: AccessContext,
  permissions: OrganizationPermission[],
): boolean {
  // Footgun: an empty list is vacuously `true` ("require none" → allow). Make a
  // dynamically-empty list loud in dev so it isn't mistaken for an access grant.
  if (import.meta.env.DEV && permissions.length === 0) {
    console.warn(
      '[rbac] hasAllPermissions([]) is vacuously true; pass a non-empty list or gate explicitly.',
    );
  }
  return permissions.every((p) => hasPermission(ctx, p));
}

/**
 * Check that the context grants **at least one** of the given permissions.
 *
 * @param ctx - The access context.
 * @param permissions - Candidate permissions; an empty list is `false`.
 */
export function hasAnyPermission(
  ctx: AccessContext,
  permissions: OrganizationPermission[],
): boolean {
  return permissions.some((p) => hasPermission(ctx, p));
}

/**
 * Check whether a global role is one of the allowed roles. Used for the few
 * platform-level (ROLE-gated) surfaces rather than org-scoped permissions.
 *
 * @param role - The user's global role.
 * @param allowed - Allowed global roles.
 */
export function hasGlobalRole(role: Role, allowed: Role[]): boolean {
  return allowed.includes(role);
}
