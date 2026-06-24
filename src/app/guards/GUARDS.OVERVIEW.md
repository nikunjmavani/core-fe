# `src/app/guards/` — Layered route access checks

Composable **`beforeLoad` functions** (never wrapper components — those render before
redirecting). Spec: `docs/reference/routing-and-tenancy.md` §5. Frontend guards are UX
only; the backend/RLS re-checks everything. UI-level checks use `PermissionGuard` /
`useRBAC` in `src/shared/`.

## Guard chain for `/organization/$organizationSlug/*`

| #   | Guard                                           | Lives in               | Failure                                                                                                                                          |
| --- | ----------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `requireAuth`                                   | `core/rbac/guards.ts`  | redirect `/login`                                                                                                                                |
| 2   | `requireOrganizationContext($organizationSlug)` | `route-guards.ts`      | malformed param / unknown org / non-member → **404** (existence never leaked)                                                                    |
| 3   | `requireActiveOrganization`                     | `route-guards.ts`      | suspended → `…/suspended` (which itself skips this guard to avoid redirect loops)                                                                |
| 4   | `requirePermission(manifest.permission)`        | `core/rbac/guards.ts`  | **403** → `/unauthorized`                                                                                                                        |
| 5   | `requireFeature`                                | `route-guards.ts`      | plan-gated module → 404 / upsell (REPLACE_WITH_API)                                                                                              |
| 6   | Resource scope                                  | route **loader** fetch | NOT a guard: the API returns the resource scoped to the organization; 404/403 map to the NotFound/Unauthorized islands. One fetch, no waterfall. |

`requireOrganizationContext` also **syncs the derived `useOrganizationStore` from the URL**
(the param is canonical — routing-and-tenancy.md §4) and refetches per-organization
permissions when the organization changes (`shared/tenancy/organization-membership.ts`).

## Files

| File                      | Purpose                                                                                                                                                                 |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `route-guards.ts`         | `requireOrganizationContext`, `requireActiveOrganization`, `requireFeature` — guards that compose `shared/tenancy` (so they live in `app/`, which core must not import) |
| `RBACGuard.tsx` (+ .test) | In-page permission gating component (rendering-level, not route-level)                                                                                                  |

Auth + permission primitives stay in `core/rbac/guards.ts` (`requireAuth`,
`requirePermission`); route registration applies the chain in
`src/app/routes/routeTree.tsx` `beforeLoad` hooks.
