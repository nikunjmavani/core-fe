# `pages/organization/$organizationId/suspended` — Suspended organization

Route: `/organization/$organizationId/suspended`. Blocked state rendered when
`requireActiveOrganization` finds the organization suspended / subscription lapsed
(mock mode: always active — `REPLACE_WITH_API`). Offers switching organization via
the picker.

## Files

| File                    | Responsibility                                                |
| ----------------------- | ------------------------------------------------------------- |
| `suspended.route.tsx`   | Route marker — exports `Component` rendering `SuspendedPage`. |
| `suspended.manifest.ts` | Manifest — `kind: 'leaf'`, no permission.                     |
| `SuspendedPage.tsx`     | Blocked-state UI. Owns `data-testid="suspended-page"`.        |
