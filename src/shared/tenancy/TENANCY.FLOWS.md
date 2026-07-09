# `src/shared/tenancy/` — Flows

The runtime sequences that span several tenancy modules. Companion tiers:
[OVERVIEW](./TENANCY.OVERVIEW.md) · [PATTERNS](./TENANCY.PATTERNS.md) ·
[POLICIES](./TENANCY.POLICIES.md).

## `/` root resolution

Where a bare `/` lands, decided from the JWT-backed session context.

1. `resolveRootRedirect()` → `hydrateSessionContext()` (loads `me/context`:
   deployment flags + active org).
2. `resolveRootTarget(ctx)` picks a target from `(deploymentMode, activeOrg)`:
   - `personal-only`: active → `/dashboard`; none → onboarding-or-`/dashboard`.
   - `team-only`: active TEAM with slug → `/organization/$slug/dashboard`; else
     onboarding or `/organization` (picker).
   - `both`: PERSONAL active → `/dashboard`; TEAM active → `/organization/$slug/dashboard`;
     none → onboarding / picker / `/dashboard`.
3. Resolver returns the redirect (`organizationDashboard(slug)` for team targets).

Entry point: `organization-resolver.ts` · Ends at: a redirect target, never an island.

## Organization switch

Re-mints the global access token and re-points every derived surface at the new org.

1. `switchToOrganization(orgId)` → `liveSwitch('/auth/switch-to-organization', …)`.
2. `liveSwitch` bumps `switchGeneration`, POSTs, and **discards** the response if a
   newer switch superseded it in flight (stale generation → return `undefined`).
3. On the winning switch: `setAccessToken` + `scheduleTokenRefresh` +
   `applyActiveOrg` (updates `me/context` cache: active org, permissions, role,
   `isActive` flags).
4. `deriveOrgContext(result)` syncs the store; an analytics `organizationSwitched`
   event fires.

Entry points: `switch.ts` (`switchToOrganization` / `switchToPersonal`) ·
Guard: monotonic `switchGeneration` · Ends at: new token + derived context.

## Switch to personal (404-safe)

1. `switchToPersonal()` reads cached `me/context`; if `personalOrganizationId` is
   falsy → return `undefined` (no request — the switch would 404).
2. Otherwise `liveSwitch('/auth/switch-to-personal', {})` → same token + context
   application as an org switch.

Entry point: `switch.ts` · Guard: `personalOrganizationId` present.
