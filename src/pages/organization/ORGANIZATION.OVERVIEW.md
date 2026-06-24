# `pages/organization` — Organization picker

Route: `/organization`. Lists the signed-in user's organizations; selecting one enters
`/organization/$organizationSlug/dashboard`. The `/` resolver redirects here when the user has
organizations but no (valid) last-used one. Spec: `docs/reference/routing-and-tenancy.md`.

## Files

| File                         | Responsibility                                                                          |
| ---------------------------- | --------------------------------------------------------------------------------------- |
| `organization.route.tsx`     | Route marker — exports `Component` rendering `OrganizationPickerPage`.                  |
| `organization.manifest.ts`   | Manifest — `kind: 'layout'`, child segment `$organizationSlug`.                         |
| `OrganizationPickerPage.tsx` | Picker UI — organization cards + create dialog. Owns `data-testid="organization-page"`. |

## Children

| Segment             | URL                               | Island                                                  |
| ------------------- | --------------------------------- | ------------------------------------------------------- |
| `$organizationSlug` | `/organization/$organizationSlug` | org-scoped shell (direct nesting — no sub-pages bucket) |
