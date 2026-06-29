import { organizationDashboard } from '@/lib/routes/index.ts';

import { type DeploymentFlags, resolveDeploymentMode } from './deployment-mode.ts';
import { type MeContext, needsOnboarding } from './me-context.ts';
import { hydrateSessionContext } from './session-context.ts';

export { hydrateSessionContext } from './session-context.ts';

/**
 * Dual-URL root target (research/11 §3.3, D-02/D-10): the active org from
 * `me/context` decides where `/` lands — adjusted for deployment mode
 * (personal-only / team-only / both).
 */
export type RootTarget =
  | { readonly to: '/onboarding' }
  | { readonly to: '/dashboard' }
  | { readonly to: '/organization' }
  | {
      readonly to: '/organization/$organizationSlug/dashboard';
      readonly params: { organizationSlug: string };
    };

/** Where to send a session with no active org when onboarding is not required. */
function targetWhenNoActiveOrg(flags: DeploymentFlags, ctx: MeContext): RootTarget {
  if (needsOnboarding(ctx)) {
    return { to: '/onboarding' } as const;
  }
  const mode = resolveDeploymentMode(flags);
  if (mode === 'team-only') {
    return { to: '/organization' } as const;
  }
  // OAuth / email OTP: personal workspace may be provisioned server-side after onboarding.
  return { to: '/dashboard' } as const;
}

export function resolveRootTarget(ctx: MeContext): RootTarget {
  const mode = resolveDeploymentMode(ctx.deploymentFlags);
  const active = ctx.activeOrganization;
  const noActive = targetWhenNoActiveOrg(ctx.deploymentFlags, ctx);

  if (mode === 'personal-only') {
    if (!active) return noActive;
    return { to: '/dashboard' } as const;
  }

  if (mode === 'team-only') {
    if (!active) return noActive;
    if (active.type === 'TEAM' && active.slug) {
      return {
        to: '/organization/$organizationSlug/dashboard',
        params: { organizationSlug: active.slug },
      } as const;
    }
    return noActive;
  }

  if (!active) return noActive;
  if (active.type === 'PERSONAL') return { to: '/dashboard' } as const;
  if (active.slug) {
    return {
      to: '/organization/$organizationSlug/dashboard',
      params: { organizationSlug: active.slug },
    } as const;
  }
  return noActive;
}

/**
 * Personal `/dashboard` is only valid when {@link resolveRootTarget} would send
 * `/` there. Otherwise return the canonical workspace (onboarding or team slug).
 */
export function workspaceRedirectForPersonalDashboard(ctx: MeContext): RootTarget | null {
  const target = resolveRootTarget(ctx);
  if (target.to === '/dashboard') return null;
  return target;
}

/**
 * Team slug routes require a provisioned workspace. No active org → onboarding;
 * personal active org → root `/dashboard`. When a team org is active, the URL
 * slug chain ({@link requireOrganizationContext}) owns org switching.
 */
export function workspaceRedirectForTeamEntry(
  ctx: MeContext,
  options?: { organizationPicker?: boolean },
): RootTarget | null {
  const target = resolveRootTarget(ctx);
  if (options?.organizationPicker && target.to === '/organization') return null;
  if (target.to === '/onboarding') return target;
  if (target.to === '/dashboard') return target;
  if (target.to === '/organization') return target;
  return null;
}

type RootRedirect =
  | ReturnType<typeof organizationDashboard>
  | { readonly to: '/dashboard' }
  | { readonly to: '/onboarding' }
  | { readonly to: '/organization' };

/**
 * `/` resolver (dual-URL, research/11 §3.3): reads deployment mode + active org
 * from `me/context` (JWT-backed session context).
 */
export async function resolveRootRedirect(): Promise<RootRedirect> {
  const ctx = await hydrateSessionContext();
  const target = resolveRootTarget(ctx);
  if (target.to === '/onboarding') return { to: '/onboarding' } as const;
  if (target.to === '/dashboard') return { to: '/dashboard' } as const;
  if (target.to === '/organization') return { to: '/organization' } as const;
  return organizationDashboard(target.params.organizationSlug);
}
