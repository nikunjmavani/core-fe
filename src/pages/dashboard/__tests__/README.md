# Dashboard tests

Unit tests are colocated with their source (folder-per-unit):

- `components/<Name>/<Name>.test.tsx` — widget tests next to the widget
- `dashboard.fixtures.test.ts` — at the island root, next to `dashboard.fixtures.ts`

`integration/` (this directory) holds cross-component flows for the island —
`integration/page.test.tsx` renders the whole `DashboardPage`.

Browser E2E: `tests/e2e/` at the project root (see island `OVERVIEW.md`).
