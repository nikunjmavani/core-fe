# `src/shared/api/`

Cross-page API helpers and domain schemas. Files here are imported by both `src/pages/*` and `src/shared/components/*`, so they must live outside both layers.

## Files

| File                                   | What it holds                                                                                                                                                   |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `organization-contracts.ts`            | Zod schemas for org-domain entities — `Member`, `Invitation`, `OrgRole`, `RoleSummary`, `ApiKey`, `Plan`, `Subscription`                                        |
| `organization-api.ts`                  | Fetcher functions for org-domain resources (members, invitations, roles, api-keys, billing) — will shrink as resource pages adopt `useList<T>()` etc.           |
| `organization-mock-store.ts` (+ .test) | In-memory mock state for dev/tests                                                                                                                              |
| `organization-fixtures.ts`             | Seed data used by the mock store                                                                                                                                |
| `my-orgs.ts` (+ .test)                 | `listMyOrganizations()`, `createOrganization()` + `organizationSchema`, `createOrganizationSchema` — orgs the user can switch between or create (tenancy-level) |
| `tenancy-service.ts` (+ .test)         | Tenant bootstrap helpers — `getCurrentTenantSlug`, `resolveTenantFromSubdomain`                                                                                 |

## Why this exists

Per the dependency rule:

- `shared/components/MembersTable` imports `Member` from `organization-contracts.ts`
- `pages/organization/sub-pages/members/...` also imports `Member`

If the schemas lived in `pages/`, shared components would import from pages (forbidden). If they lived in `shared/components/`, they'd be coupled to a specific component. **`shared/api/` is the cross-layer home for files reached by both `shared/*` and `pages/*`.**

## Boundary with other layers

- **`shared/api/` ≠ `core/`** — core holds framework-agnostic _platform_ services (auth, http, rbac). shared/api holds _domain_ helpers (org members, tenancy bootstrap).
- **`shared/api/` ≠ `shared/hooks/`** — hooks call these api files; they're not the same thing.
- **`shared/api/` ≠ `shared/store/`** — store is Zustand state; api is fetcher functions + schemas.

## What's coming

When resource pages are rewritten to use `useList<Member>('members')`, `useCreate<Invitation>('invitations')`, etc. (the shared CRUD hooks), `organization-api.ts` shrinks dramatically — most of its 20 functions disappear, leaving only special-case operations (`getMyPermissions`, `acceptInvitation`).
