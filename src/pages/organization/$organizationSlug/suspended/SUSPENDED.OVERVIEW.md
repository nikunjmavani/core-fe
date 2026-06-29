# `pages/organization/$organizationSlug/suspended` — Suspended organization

Route: `/organization/$organizationSlug/suspended`. Blocked state rendered when
`requireActiveOrganization` finds the organization suspended / subscription lapsed.
Offers switching organization via the picker.

## Files

| File                    | Responsibility                                                |
| ----------------------- | ------------------------------------------------------------- |
| `suspended.route.tsx`   | Route marker — exports `Component` rendering `SuspendedPage`. |
| `suspended.manifest.ts` | Manifest — `kind: 'leaf'`, no permission.                     |
| `SuspendedPage.tsx`     | Blocked-state UI. Owns `data-testid="suspended-page"`.        |
