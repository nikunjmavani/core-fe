# Tests — Overview

All **global** test infrastructure lives under this directory (helpers, E2E, load). Unit/integration **source** tests live in `src/`: **route islands** use `pages/**/__tests__/unit/`; `shared/`, `core/`, `lib/`, `stores/` use **colocated** `*.test.*` next to source.

## Layout (aligned with backend-style structure)

| Path                     | Purpose                                                                                  | Tool       | Command                                    |
| ------------------------ | ---------------------------------------------------------------------------------------- | ---------- | ------------------------------------------ |
| **`tests/utils/`**       | Global test helpers: renderWithProviders, mocks, setup (test-app / test-api style)       | Vitest     | Used by colocated `*.test.ts(x)` in `src/` |
| **`tests/e2e/`**         | Browser E2E specs (auth, dashboard, navigation, accessibility, visual)                   | Playwright | `pnpm test:e2e`                            |
| **`tests/load/`**        | Load & smoke scripts (k6)                                                                | k6         | `pnpm test:load`                           |
| **`tests/factories/`**   | _(Optional)_ Shared test data builders (e.g. `buildUser()`, `buildOrg()`) for unit + E2E | —          | Add when 2+ areas need same fixtures       |
| **`tests/security/`**    | _(Optional)_ E2E for auth boundaries, CSP, or permission checks                          | Playwright | Add when we add dedicated security specs   |
| **`tests/performance/`** | _(Optional)_ Lighthouse, bundle-size, or front-end k6 scenarios                          | Various    | Add when we add perf gates                 |

**Domain/feature tests:** Page-first — unit tests in `src/pages/<name>/__tests__/unit/` (see `docs/reference/route-island-structure.md`); colocated elsewhere under `src/shared/`, `src/core/`. Browser E2E in `tests/e2e/`.

**Load (k6):** Today `tests/load/smoke.js`. When adding more scenarios, use `tests/load/k6/scenarios/` (e.g. smoke, auth, critical-paths) to mirror backend layout.

## Commands

| Command              | What it runs                                                    |
| -------------------- | --------------------------------------------------------------- |
| `pnpm test`          | Vitest (colocated tests in `src/`, uses `tests/utils/setup.ts`) |
| `pnpm test:watch`    | Vitest watch mode                                               |
| `pnpm test:coverage` | Vitest with coverage                                            |
| `pnpm test:e2e`      | Playwright (tests in `tests/e2e/`)                              |
| `pnpm test:load`     | k6 smoke (tests in `tests/load/`)                               |
| `pnpm test:visual`   | Playwright visual regression only                               |

E2E artifacts and the HTML report live under **`test-results/`** (`artifacts/` for traces/screenshots/videos, `report/` for the HTML report). View with **`pnpm test:e2e:report`** (or open `test-results/report/index.html`).

## First time here?

- **Colocated tests** (e.g. `Button.test.tsx` next to `Button.tsx`) live in `src/` and use `@/tests/utils/renderWithProviders.tsx`.
- **E2E** specs are in `tests/e2e/`; **load** scripts in `tests/load/`.

**E2E on Mac (first time):** Install Playwright browsers so Chromium, Firefox, and WebKit are available:

```bash
pnpm exec playwright install
```

CI installs Chromium only (`playwright install --with-deps chromium`). To run E2E in a single browser locally, use: `pnpm exec playwright test --project=chromium`.
