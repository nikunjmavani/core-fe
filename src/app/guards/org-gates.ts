import type { Gate } from '@/core/security/gate.types.ts';

import { requireActiveOrganization, requireOrganizationContext } from './route-guards.ts';

/** These gates only read the route params (the org slug). */
type OrgRouteCtx = { params: Record<string, string> };

/**
 * App-layer security gates for the org-scoped route space — thin `Gate`
 * wrappers over the existing org guards so the route tree can compose its chain
 * via the common `gateway()` (research/11 §3.7). They live in `app/` (not
 * `core/security/gates/`) because they reach into `shared/tenancy`, which the
 * core kernel must not import. Behavior is identical to calling the underlying
 * guards directly.
 */

/**
 * **L2/L4 — active-org context.** Validate the `$organizationSlug` param,
 * confirm membership, and sync the derived store + permissions (wraps
 * {@link requireOrganizationContext}).
 */
export const resolveActiveOrg: Gate<OrgRouteCtx> = async (ctx) => {
  await requireOrganizationContext(ctx.params.organizationSlug ?? '');
};

/**
 * **L4b — org status.** Block suspended / lapsed organizations (wraps
 * {@link requireActiveOrganization}); runs on org children except `suspended/`.
 */
export const requireOrgStatus: Gate<OrgRouteCtx> = (ctx) => {
  requireActiveOrganization(ctx.params.organizationSlug ?? '');
};
