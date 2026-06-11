# Dashboard — Route island

- **URL:** `/` (index)
- **Permission:** authenticated (route tree `beforeLoad`)
- **Layout:** `DashboardLayout` (app shell)

## Files (work here only)

| File                     | Role                                                                 |
| ------------------------ | -------------------------------------------------------------------- |
| `dashboard.page.ts`      | Manifest: `path`, `testId`, `kind: leaf`, `children: []`             |
| `dashboard.route.tsx`    | Exports `Component` → `DashboardPage`                                |
| `DashboardPage.tsx`      | Composes widgets, local chart tab state (island root)                |
| `dashboard.contracts.ts` | Stats, activity, goals, heatmap, chart types                         |
| `dashboard.api.ts`       | `dashboardApi.*` (mock or live)                                      |
| `hooks/useDashboard/`    | TanStack Query keys + hooks (folder-per-unit)                        |
| `dashboard.search.ts`    | URL search (`team` tab)                                              |
| `dashboard.fixtures.ts`  | Mock generators (`REPLACE_WITH_API`)                                 |
| `components/<Name>/`     | StatCards, ActivityFeed, TeamSection, charts, etc. (folder-per-unit) |

## Test IDs

`dashboard-page`, `dashboard-greeting`, `stat-card-*`, `team-section`, `team-tab-*` — see `docs/reference/e2e-testids-inventory.md`.

## Imports

- OK: `@/core/*`, `@/shared/*`, `@/lib/*` (global stores live in `@/shared/store/`)
- Not OK: other `pages/*` feature folders

## Child routes

None — single leaf island, no nested sub-pages.

## Tests

- `components/<Name>/<Name>.test.tsx` — widgets (colocated, folder-per-unit)
- `dashboard.fixtures.test.ts` — mock generators (island root)
- `__tests__/integration/page.test.tsx` — whole-page flow
- Project E2E: `tests/e2e/`
