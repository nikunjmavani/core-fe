# `pages/organization/$organizationId/dashboard` — Dashboard (placeholder)

Route: `/organization/$organizationId/dashboard`. Default landing page inside an
organization. **Currently a deliberate placeholder** — the module was emptied so it adds
no weight to reviews/AI context; it will be designed and built after the auth module is
finalized (`REPLACE_WITH_MODULE`), one module at a time.

## Files

| File                  | Responsibility                                                      |
| --------------------- | ------------------------------------------------------------------- |
| `dashboard.route.tsx` | Route marker — exports `Component` rendering `DashboardPage`.       |
| `dashboard.page.ts`   | Manifest — `kind: 'leaf'`, no permission (auth + org guards apply). |
| `DashboardPage.tsx`   | Placeholder UI. Owns `data-testid="dashboard-page"`.                |

## When this module is built

Follow the island contract: add the optional dashboard-prefixed role files
(api, contracts, search, fixtures) plus folder-per-unit components and hooks —
scaffolded by the page-scaffolding skill against
`docs/reference/routing-and-tenancy.md`.
