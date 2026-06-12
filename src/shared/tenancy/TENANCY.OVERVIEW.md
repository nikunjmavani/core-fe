# `src/shared/tenancy/` — Organization context, membership, resolution

First-class tenancy area (spec: `docs/reference/routing-and-tenancy.md` §6). Lives in
`shared/` — NOT `core/` — because it composes the Zustand store, organization APIs, and
storage; the core kernel stays app-state-free (same reasoning as `shared/auth/`).
"Tenancy" is the sanctioned infra-layer term; everything user-facing says **organization**.

**The URL is the single source of truth for organization context.** Inside
`/organization/$organizationId/*` the route param is canonical; `useOrganizationStore` is a
derived cache synced FROM the route. localStorage / subdomain resolution only feed the `/`
resolver's redirect choice.

## Files

| File                            | Responsibility                                                                                                                                                   |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `organization-context.ts`       | `syncOrganizationFromRoute` (URL → store, persists last-used), `getActiveOrganizationId`                                                                         |
| `organization-membership.ts`    | `findMembership`, `ensurePermissionsFor` — refetches permissions when the organization changes (a once-if-empty check would leak org A's permissions into org B) |
| `organization-resolver.ts`      | `resolveRootRedirect` for `/`: last-used (validated) → dashboard, else picker, else onboarding                                                                   |
| `my-organizations.ts` (+ .test) | `listMyOrganizations()`, `createOrganization()` + schemas                                                                                                        |
| `tenancy-service.ts` (+ .test)  | Subdomain fallback resolution (`resolveOrganizationFromSubdomain`) — boot-time default for the organization header                                               |

## Consumers

- `app/guards/route-guards.ts` — the `$organizationId` guard chain
- `app/routes/routeTree.tsx` — `/` resolver
- `core/rbac/guards.ts` — reads the derived store's permission set for `requirePermission`
- `OrganizationSwitcher`, `CreateOrganizationDialog`, onboarding — navigate to
  `/organization/$organizationId/dashboard` and let the guard sync everything
