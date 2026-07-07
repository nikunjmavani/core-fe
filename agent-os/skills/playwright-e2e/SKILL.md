---
name: playwright-e2e
description: Write and refactor Playwright E2E specs using the hybrid selector strategy — data-testid for actions, getByRole/getByLabel for a11y guards. Use when adding or updating tests/e2e/*.e2e.test.ts.
---

# Playwright E2E (hybrid selectors)

Project convention for **all Playwright specs** in `tests/e2e/*.e2e.test.ts` — UI flows and `*-api.e2e.test.ts` HTTP contracts. See `tests/README.md`.

## Running the suite (required setup — follow this exactly)

Before `pnpm test:e2e`, the environment must be set up per **`docs/reference/testing.md` →
E2E → "Local run — required env & steps"**. Do not improvise other env or a plain `.env`.
All values live in each repo's **`.env.development`** (gitignored dev file):

- **core-be `.env.development`**: `RATE_LIMIT_RELAXED_CAPS=true` (else public-auth caps at
  5 req/min per IP → `429 send-code failed` floods the suite), `DATABASE_TLS_ENFORCED=false`,
  `DATABASE_RLS_SAFETY_ENFORCED=false` (local Docker Postgres), and the
  `PERSONAL_ORGANIZATION_ENABLED` / `TEAM_ORGANIZATION_ENABLED` pair for the mode under test.
- **core-fe `.env.development`**: `VITE_DEV_API_URL=http://localhost:3000`, test Turnstile key
  `VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA` (do **not** set `VITE_CAPTCHA_DISABLED`).

Then: boot core-be (`pnpm dev`, wait for `GET /readyz` → 200), and run `pnpm test:e2e` from
core-fe. `deployment-*.e2e.test.ts` auto-skip unless `me/context` matches their mode pair —
swap the two `*_ORGANIZATION_ENABLED` values in core-be's `.env.development` and restart to
exercise personal-only / team-only. CI does the equivalent with `NODE_ENV=test`.

## Hybrid strategy (required)

| Concern                           | Selector                               | Why                                         |
| --------------------------------- | -------------------------------------- | ------------------------------------------- |
| **Actions** (click, fill, select) | `page.getByTestId('…')`                | Stable when Tailwind/layout/copy changes    |
| **Visibility / a11y guard**       | `getByRole`, `getByLabel`, `getByText` | Proves the control is exposed to users & AT |
| **Never**                         | CSS classes, `nth-child`, DOM depth    | Break on every design pass                  |

```ts
import {
  clickTestId,
  expectLoginFormReady,
  fillTestId,
} from '@/tests/utils/e2e-hybrid.ts';

test('logs in', async ({ page }) => {
  await page.goto('/login');
  await expectLoginFormReady(page); // hybrid: testid + labels/roles
  await fillTestId(page, 'auth-email', 'user@example.com');
  await clickTestId(page, 'auth-email-submit');
});
```

**Helpers:** `tests/utils/e2e-hybrid.ts` — `AUTH_LABELS`, `LAYOUT_LABELS`, `expect*FormReady`, `expectHybridVisible`.

**Auth flows:** `tests/utils/e2e-auth.ts` — `registerNewUserAndGoToDashboard`, `authenticateViaSignup`, `completeOnboardingWizard`, `navigateInApp` (client-side nav; avoids cold-load auth race — see `__coreFeRouter` in `src/main.tsx` dev hook). **All E2E requires core-be** — `tests/e2e/global-setup.ts` fails fast when `/readyz` is down.

## When to use which

- **Always testid** for: page roots, form wrappers, fields, submit, nav items, dialogs, tables (see `e2e-testids` skill).
- **Add role/label assert** when the element has a proper label or `aria-label` (forms, icon buttons, modals).
- **Axe scans** stay in `accessibility.e2e.test.ts` (`@axe-core/playwright`) — not a substitute for hybrid asserts.

## File layout

| File                        | Scope                                   |
| --------------------------- | --------------------------------------- |
| `auth.e2e.test.ts`          | Unified login, OAuth, guards, email OTP |
| `dashboard.e2e.test.ts`     | Shell + placeholder dashboard           |
| `settings.e2e.test.ts`      | Hash modal `#settings/...`              |
| `navigation.e2e.test.ts`    | 404, auth guards                        |
| `organization.e2e.test.ts`  | Picker at `/organization`               |
| `notifications.e2e.test.ts` | Notification center                     |
| `org-switching.e2e.test.ts` | Dual-URL switcher                       |
| `responsive.e2e.test.ts`    | 320px overflow                          |
| `accessibility.e2e.test.ts` | Axe WCAG gate                           |
| `visual.e2e.test.ts`        | Screenshots (reduced motion)            |

## Workflow (new spec)

1. Read **`e2e-testids`** — ensure testids exist; update `docs/reference/e2e-testids-inventory.md`.
2. Use **`e2e-hybrid.ts`** helpers; add labels to `AUTH_LABELS` / `LAYOUT_LABELS` when needed.
3. Run `pnpm validate:testids` after UI testid changes.
4. Run `pnpm test:e2e` or `pnpm exec playwright test tests/e2e/<file>.e2e.test.ts`.
5. Visual baselines: `pnpm test:visual:update` when adding screenshot tests.

## Refactoring older specs

Replace testid-only **visibility** checks on labeled controls with hybrid helpers:

```ts
// Before
await expect(page.getByTestId('login-email')).toBeVisible();

// After (login suite)
await expectLoginFormReady(page);
```

Keep **actions** on testid:

```ts
await page.getByTestId('login-submit').click();
```

## Related

| Resource          | Path                                      |
| ----------------- | ----------------------------------------- |
| Test IDs + naming | `agent-os/skills/e2e-testids/SKILL.md`    |
| Hybrid helpers    | `tests/utils/e2e-hybrid.ts`               |
| Auth helper       | `tests/utils/e2e-auth.ts`                 |
| Config            | `playwright.config.ts`                    |
| Inventory         | `docs/reference/e2e-testids-inventory.md` |

## External skills

No third-party Playwright skill is installed — the Skills CLI has no curated `playwright` package at install time. This project skill + `e2e-testids` are the source of truth.
