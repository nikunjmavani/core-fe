import { notFound, redirect } from '@tanstack/react-router';

import { queryClient } from '@/core/http/queryClient.ts';
import { parseOrganizationSlugParam } from '@/lib/routes/params.ts';
import { useOrganizationStore } from '@/shared/store/useOrganizationStore/index.ts';
import { type MeContext, meContextQueryKey } from '@/shared/tenancy/me-context.ts';
import type { Organization } from '@/shared/tenancy/my-organizations.ts';
import { syncOrganizationFromRoute } from '@/shared/tenancy/organization-context.ts';
import {
  ensurePermissionsFor,
  findMembershipBySlug,
} from '@/shared/tenancy/organization-membership.ts';
import { switchToOrganization } from '@/shared/tenancy/switch.ts';

/**
 * Organization-scoped route guards — composable `beforeLoad` functions
 * (never wrapper components: those render before redirecting).
 *
 * Chain for `/organization/$organizationSlug/*` (GUARDS.OVERVIEW.md):
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
 * Validate the `$organizationSlug` param, confirm membership, and sync the
 * derived store from the URL. Unknown organization or non-member → 404
 * (existence is never leaked to non-members). The human-readable slug resolves
 * to the canonical org here; everything downstream keys off the immutable id.
 */
export async function requireOrganizationContext(
  rawOrganizationSlug: string,
): Promise<Organization> {
  const slug = parseOrganizationSlugParam(rawOrganizationSlug);
  if (!slug) throw notFound();

  const organization = await findMembershipBySlug(slug);
  if (!organization) throw notFound();

  syncOrganizationFromRoute(organization.id, organization.slug, organization.status);
  // Switch-on-navigation: when the URL targets a different org than the cached
  // active one, switch the active-org context (me/context cache + access token)
  // so the switcher, dashboard, and RBAC all reflect the org in the URL.
  const activeId =
    queryClient.getQueryData<MeContext>(meContextQueryKey)?.activeOrganization?.id;
  if (activeId !== organization.id) {
    await switchToOrganization(organization.id);
  }
  await ensurePermissionsFor(organization.id);
  return organization;
}

/**
 * Block suspended / lapsed organizations. Runs on every org-scoped child
 * EXCEPT `suspended/` itself (the blocked state must render without
 * redirect-looping). Mock-mode organizations are always active.
 */
export function requireActiveOrganization(organizationSlug: string): void {
  const store = useOrganizationStore.getState();
  // Guard: requireOrganizationContext must have run first (it syncs slug+status
  // from the resolved org). Compare on slug — the URL's canonical key here.
  if (store.organizationSlug !== organizationSlug) {
    // Status not synced for this org yet — treat as active to avoid false
    // positives during boot / route transitions. The guard re-runs after
    // requireOrganizationContext completes (preloadStaleTime: 0).
    return;
  }
  const status = store.organizationStatus ?? 'active';
  if (status !== 'active') {
    throw redirect({
      to: '/organization/$organizationSlug/suspended',
      params: { organizationSlug },
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
