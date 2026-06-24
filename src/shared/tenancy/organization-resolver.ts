import { organizationDashboard } from '@/lib/routes/index.ts';

import { fetchMeContext, type MeContext } from './me-context.ts';

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
  | { readonly to: '/dashboard' }
  | { readonly to: '/onboarding' };

/**
 * `/` resolver (dual-URL, research/11 §3.3): the root URL keeps no UI. The
 * **active organization from `me/context`** (server-side, the JWT `org` claim)
 * decides where to land — a PERSONAL org → root `/dashboard`, a TEAM org → its
 * `/organization/$organizationId/dashboard` space, and no active org →
 * `/onboarding`. Reading the active org from the session context (not URL or
 * last-used storage) makes the JWT the single source of truth (FE-08).
 */
export async function resolveRootRedirect(): Promise<RootRedirect> {
  const ctx = await fetchMeContext();
  const active = ctx.activeOrganization;
  if (!active) return { to: '/onboarding' } as const;
  if (active.type === 'PERSONAL') return { to: '/dashboard' } as const;
  return organizationDashboard(active.id);
}
