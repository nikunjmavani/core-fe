import { organizationDashboard, organizationPicker } from '@/lib/routes/index.ts';
import { getLastOrganizationFromStorage } from '@/shared/store/useOrganizationStore/index.ts';

import type { MeContext } from './me-context.ts';
import { listMyOrganizations } from './my-organizations.ts';

/**
 * Dual-URL root target (research/11 §3.3, D-02/D-10): the active org from
 * `me/context` decides where `/` lands —
 *  - no active org → `/onboarding`
 *  - PERSONAL → root URLs (`/dashboard`)
 *  - TEAM → `/organization/$organizationSlug/dashboard` (human-readable slug;
 *    immutable id resolved from `me/context.organizations` at switch time)
 *
 * Pure decision logic; the route tree wires it into the `/` resolver (Phase 4).
 */
export type RootTarget =
  | { readonly to: '/onboarding' }
  | { readonly to: '/dashboard' }
  | {
      readonly to: '/organization/$organizationSlug/dashboard';
      readonly params: { organizationSlug: string };
    };

export function resolveRootTarget(ctx: MeContext): RootTarget {
  const active = ctx.activeOrganization;
  if (!active) return { to: '/onboarding' } as const;
  if (active.type === 'PERSONAL') return { to: '/dashboard' } as const;
  // TEAM → slug space. A team without a slug is a backend invariant violation;
  // route to onboarding rather than build a broken URL.
  if (active.slug) {
    return {
      to: '/organization/$organizationSlug/dashboard',
      params: { organizationSlug: active.slug },
    } as const;
  }
  return { to: '/onboarding' } as const;
}

type RootRedirect =
  | ReturnType<typeof organizationDashboard>
  | ReturnType<typeof organizationPicker>
  | { readonly to: '/onboarding' };

/**
 * `/` resolver (docs/reference/routing-and-tenancy.md §2): the root URL keeps
 * no UI — it redirects to the last-used organization's dashboard, else the
 * `/organization` picker, else `/onboarding` when the user has no
 * organizations yet. The last-used organization is validated against current
 * memberships so a stale storage entry can't redirect into a 404.
 */
export async function resolveRootRedirect(): Promise<RootRedirect> {
  const organizations = await listMyOrganizations();
  if (organizations.length === 0) return { to: '/onboarding' } as const;

  const last = getLastOrganizationFromStorage();
  const lastIsValid = last && organizations.some((o) => o.id === last.id);
  if (lastIsValid) return organizationDashboard(last.id);

  // A single organization needs no picker — land straight on its dashboard.
  if (organizations.length === 1 && organizations[0]) {
    return organizationDashboard(organizations[0].id);
  }

  return organizationPicker();
}
