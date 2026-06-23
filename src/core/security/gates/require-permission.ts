import { requirePermission } from '@/core/rbac/guards.ts';
import type { OrganizationPermission } from '@/core/rbac/policies.ts';

import type { Gate } from '../gate.types.ts';

/**
 * **L5 — RBAC permission.** Factory: binds a route's required org-scoped
 * permission (from its manifest) into a gate. Redirects to `/unauthorized` when
 * the active org's permission set lacks it (or `/login` when unauthenticated).
 *
 * @example gateway(requireSession, requirePermissionGate(manifest.permission))
 */
export function requirePermissionGate(permission: OrganizationPermission): Gate {
  return () => requirePermission(permission);
}
