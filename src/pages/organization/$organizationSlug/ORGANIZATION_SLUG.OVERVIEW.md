# `pages/organization/$organizationSlug` — Org-scoped shell

Route: `/organization/$organizationSlug` (layout — no UI of its own at the bare path; children
render inside the shared AppLayout). **The URL is the single source of truth for
organization context**: the routeTree `beforeLoad` chain validates the param, confirms
membership, syncs the derived `useOrganizationStore`, and refetches per-organization
permissions on change. Spec: `docs/reference/routing-and-tenancy.md`.

## Files

| File                            | Responsibility                                                        |
| ------------------------------- | --------------------------------------------------------------------- |
| `organization-slug.route.tsx`   | Route marker — exports `Component` rendering `OrganizationLayout`.    |
| `organization-slug.manifest.ts` | Manifest — `kind: 'layout'`, children `dashboard`, `suspended`.       |
| `OrganizationLayout.tsx`        | Thin wrapper mounting the shared AppLayout (sidebar/header/`Outlet`). |

## Guard chain (routeTree `beforeLoad`)

`requireAuth` → `requireOrganizationContext($organizationSlug)` (malformed/unknown/non-member → 404) → children run `requireActiveOrganization` (suspended → `suspended/`) and
`requirePermission` from their manifests. See `app/guards/GUARDS.OVERVIEW.md`.

## Children (direct nesting — no sub-pages bucket)

| Segment     | URL                                         | Island     |
| ----------- | ------------------------------------------- | ---------- |
| `dashboard` | `/organization/$organizationSlug/dashboard` | dashboard/ |
| `suspended` | `/organization/$organizationSlug/suspended` | suspended/ |
