# Testing — full matrix (core-fe)

Single reference for **every test kind** in this repo: where it lives, how to run it, and which skill/doc governs it.

## Two layers

| Layer                  | Tool         | Location               | Pattern              | Command              | Server                                |
| ---------------------- | ------------ | ---------------------- | -------------------- | -------------------- | ------------------------------------- |
| **Unit / component**   | Vitest + RTL | Colocated under `src/` | `*.test.ts(x)`       | `pnpm test:unit`     | None — `vi.mock()` only               |
| **Security tripwires** | Vitest       | `tests/security/`      | `*.security.test.ts` | `pnpm test:security` | None                                  |
| **E2E**                | Playwright   | `tests/e2e/`           | `*.e2e.test.ts`      | `pnpm test:e2e`      | **core-be** on `:3000` (**required**) |

**Never** use `.spec.ts` or the words `real`/`live` in test file names.

## Unit tests

- Colocated beside source: `Component.tsx` → `Component.test.tsx`
- jsdom — no browser, no HTTP server
- Stub with `vi.mock()` (API modules, hooks, `dataProvider`, router)
- `renderWithProviders` from `tests/utils/`
- `vitest-axe` required on components (`toHaveNoViolations()`)

Details: `agent-os/rules/testing-requirements.mdc`, `agent-os/skills/test-generation/SKILL.md`.

## E2E tests (Playwright)

All specs live in `tests/e2e/*.e2e.test.ts`. One command: `pnpm test:e2e`.

**Prerequisite:** **core-be** running on `:3000` (`GET /readyz` must succeed). `tests/e2e/global-setup.ts` fails fast if core-be is down — there is no skip path.

**CAPTCHA (manual dev + E2E):** core-fe mounts invisible Cloudflare Turnstile when `VITE_TURNSTILE_SITE_KEY` is set (`.env.development` ships the always-pass test key `1x00000000000000000000AA`; do **not** set `VITE_CAPTCHA_DISABLED=true`). Pair with core-be `CAPTCHA_PROVIDER=turnstile` and the matching test secret. Auth buttons wait for a Turnstile token before POST (`useTurnstileReady`). `global-setup` probes core-be and caches working auth headers for E2E (typically `X-Captcha-Bypass: true` in local/test `NODE_ENV`).

| Spec                                               | What it covers                                               |
| -------------------------------------------------- | ------------------------------------------------------------ |
| `auth.e2e.test.ts`                                 | Login UI, redirects, auth flows                              |
| `auth-api.e2e.test.ts`                             | Auth HTTP contracts (`playwright.request` → `:3000`)         |
| `session-api.e2e.test.ts`                          | Session API contracts                                        |
| `tenancy-api.e2e.test.ts`                          | Tenancy API contracts                                        |
| `billing-api.e2e.test.ts`                          | Billing API contracts                                        |
| `deployment-personal-only.e2e.test.ts`             | Personal-only deployment (`TEAM_ORGANIZATION_ENABLED=false`) |
| `deployment-team-only.e2e.test.ts`                 | Team-only deployment (`PERSONAL_ORGANIZATION_ENABLED=false`) |
| `deployment-personal-and-team.e2e.test.ts`         | Dual deployment (both flags true — default local)            |
| `dashboard.e2e.test.ts`, `settings.e2e.test.ts`, … | UI flows through the browser                                 |
| `routes-integration.e2e.test.ts`                   | Full live route matrix (public + auth + journey)             |
| `org-switching.e2e.test.ts`                        | Personal ↔ team org switcher (dual-URL)                      |

**Deployment-mode matrix:** `deployment-personal-only.e2e.test.ts`, `deployment-team-only.e2e.test.ts`, and `deployment-personal-and-team.e2e.test.ts` each probe live `me/context` deployment flags and **skip** unless core-be matches the required env pair. Restart core-be with the matching `PERSONAL_ORGANIZATION_ENABLED` / `TEAM_ORGANIZATION_ENABLED` values to exercise personal-only or team-only locally; default dev (both `true`) runs the dual suite only.

**Local:** Vite serves the FE on `:5173` and proxies `/api` → `http://localhost:3000`. Start core-be, then `pnpm test:e2e`.

**CI:** PR and scheduled workflows boot postgres + redis + core-be via `.github/actions/setup-core-be`, then run the full suite.

**Naming:** UI flows → `<feature>.e2e.test.ts`; HTTP contract suites → `<feature>-api.e2e.test.ts`.

Hybrid selectors: `data-testid` for actions, `getByRole`/`getByLabel` for a11y — `agent-os/skills/playwright-e2e/SKILL.md`, `tests/utils/e2e-hybrid.ts`.

Helpers: `tests/utils/e2e-auth.ts`, `tests/utils/axe-for-dialog.ts`.

## Security specs (Vitest)

| Spec                                      | Focus                         |
| ----------------------------------------- | ----------------------------- |
| `token-storage.security.test.ts`          | Tokens not in localStorage    |
| `static-security-config.security.test.ts` | CSP / security headers config |
| `route-access-matrix.security.test.ts`    | Route permission matrix       |
| `xss-sinks.security.test.ts`              | Dangerous sink patterns       |

## Commands

| Command                                   | What runs                                           |
| ----------------------------------------- | --------------------------------------------------- |
| `pnpm test`                               | Vitest unit + security                              |
| `pnpm test:unit`                          | Colocated `src/**/*.test.*` only                    |
| `pnpm test:security`                      | `tests/security/`                                   |
| `pnpm test:e2e`                           | All Playwright specs in `tests/e2e/`                |
| `pnpm test:e2e:integration`               | Routes integration + org-switching only             |
| `pnpm test:e2e:integration:cross-browser` | Same, on Chromium + Firefox + WebKit (live core-be) |
| `pnpm test:visual`                        | Screenshot regression (`visual.e2e.test.ts`)        |
| `pnpm coverage:patch`                     | Changed-lines ≥ 80% (PR CI)                         |

Contract drift (scheduled CI): `pnpm contracts:drift` vs `core-be/docs/routes.txt`.

## Cross-browser smoke (production build)

Playwright runs **Chromium, Firefox, and WebKit** against `pnpm preview` (static shell — no core-be):

```bash
pnpm build && pnpm test:cross-browser
```

Covers login shell, PWA manifest assets, version-update toast, and toast dismiss.  
CI: `.github/workflows/cross-browser.yml` (weekly).

## Cross-browser live integration (core-be required)

**Chromium, Firefox, and WebKit** against the live FE ↔ BE stack (`routes-integration` + `org-switching`):

```bash
# core-be on :3000, DATABASE_URL for email codes
pnpm build   # CI uses preview; local dev can use `pnpm dev` via config reuseExistingServer
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/core pnpm test:e2e:integration:cross-browser
```

CI: `.github/workflows/scheduled-fe-be-integration.yml` (nightly + `workflow_dispatch`).  
Details: **`docs/reference/cross-browser-support.md`**.

## Local production performance

Measure bundle size and Lighthouse on a **production build**, not `pnpm dev`.

```bash
pnpm build
pnpm preview --port 5173 --strictPort   # canonical — same as .lighthouserc.cjs
pnpm size                               # gzip budgets on dist/
```

Static `npx serve dist -s -l 5173` works for manual Lighthouse; prefer `pnpm preview`
when matching CI. Full workflow: **`docs/reference/local-production-perf.md`**.
