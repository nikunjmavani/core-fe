import { notFound, redirect } from '@tanstack/react-router';

import { parseOrganizationIdParam } from '@/lib/routes/params.ts';
import type { Organization } from '@/shared/tenancy/my-organizations.ts';
import { syncOrganizationFromRoute } from '@/shared/tenancy/organization-context.ts';
import {
  ensurePermissionsFor,
  findMembership,
} from '@/shared/tenancy/organization-membership.ts';

/**
 * Organization-scoped route guards — composable `beforeLoad` functions
 * (never wrapper components: those render before redirecting).
 *
 * Chain for `/organization/$organizationId/*` (GUARDS.OVERVIEW.md):
 *   requireAuth (core/rbac/guards) → requireOrganizationContext →
 *   requireActiveOrganization → requirePermission (core/rbac/guards, from the
 *   page manifest) → requireFeature. Resource scope (does pat_x belong to
 *   org_y?) is NOT a guard — the route loader's fetch is the check, with API
 *   404/403 mapped to the NotFound/Unauthorized islands.
 *
 * These live in `app/` (not `core/`) because they compose `shared/tenancy`,
 * which the core kernel must not import. Frontend guards are UX only — the
 * backend re-checks everything.
 */

/**
 * Validate the `$organizationId` param, confirm membership, and sync the
 * derived store from the URL. Unknown organization or non-member → 404
 * (existence is never leaked to non-members).
 */
export async function requireOrganizationContext(
  rawOrganizationId: string,
): Promise<Organization> {
  const organizationId = parseOrganizationIdParam(rawOrganizationId);
  if (!organizationId) throw notFound();

  const organization = await findMembership(organizationId);
  if (!organization) throw notFound();

  syncOrganizationFromRoute(organization.id, organization.slug);
  await ensurePermissionsFor(organization.id);
  return organization;
}

/**
 * Block suspended / lapsed organizations. Runs on every org-scoped child
 * EXCEPT `suspended/` itself (the blocked state must render without
 * redirect-looping). Mock-mode organizations are always active.
 */
export function requireActiveOrganization(organizationId: string): void {
  // REPLACE_WITH_API: read status + subscription from the membership response.
  const status: 'active' | 'suspended' = 'active';
  if (status !== 'active') {
    throw redirect({
      to: '/organization/$organizationId/suspended',
      params: { organizationId },
    });
  }
}

/**
 * Plan/feature gate for optional modules. Mock mode enables everything.
 */
export function requireFeature(_feature: string): void {
  // REPLACE_WITH_API: evaluate plan feature flags; throw notFound() (hide) or
  // redirect to an upsell surface when the module is not in the plan.
}
