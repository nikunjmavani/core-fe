import { getMyPermissions } from '@/shared/api/organization-api.ts';
import { useOrganizationStore } from '@/shared/store/useOrganizationStore/index.ts';

import type { Organization } from './my-organizations.ts';
import { listMyOrganizations } from './my-organizations.ts';

/**
 * Membership + per-organization permission loading.
 *
 * Permissions are scoped to ONE organization — switching organizations via the
 * URL must refetch them. `ensurePermissionsFor` tracks which organization the
 * cached set belongs to and invalidates on change (a once-if-empty check is
 * not enough; it would leak org A's permissions into org B's UI).
 */

/**
 * The organization, if the signed-in user is a member; otherwise `null`.
 *
 * REPLACE_WITH_API note: this runs on EVERY org-route navigation (guard
 * chain). When the real API lands, put `listMyOrganizations()` behind the
 * query cache (staleTime) so navigation does not refetch the membership list.
 */
export async function findMembership(
  organizationId: string,
): Promise<Organization | null> {
  const organizations = await listMyOrganizations();
  return organizations.find((o) => o.id === organizationId) ?? null;
}

let permissionsLoadedFor: string | null = null;

/** Load org-scoped permissions into the store, refetching when the organization changed. */
export async function ensurePermissionsFor(organizationId: string): Promise<void> {
  const store = useOrganizationStore.getState();
  if (permissionsLoadedFor === organizationId && store.permissions.length > 0) return;
  // REPLACE_WITH_API: permissions come from the membership response for THIS
  // organization (org-scoped endpoints carry the organization id in the path).
  store.setPermissions(await getMyPermissions());
  permissionsLoadedFor = organizationId;
}

/** Test-only: reset the per-organization permission cache. */
export function resetPermissionCacheForTests(): void {
  permissionsLoadedFor = null;
}
