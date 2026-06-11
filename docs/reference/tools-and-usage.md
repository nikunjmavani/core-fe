# Tools & Libraries — Usage Overview

Single reference table for every dependency: whether it's used and where.

| Package                            | Used?           | Where / what for                                                                                                                                                                       |
| ---------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dependencies**                   |                 |                                                                                                                                                                                        |
| `@formkit/auto-animate`            | Yes (available) | Re-exported in `lib/animations/useAutoAnimate.ts`; no component uses it yet (ready for list animations).                                                                               |
| `@hookform/resolvers`              | Yes             | `zodResolver` in LoginForm, FormField tests; bridges react-hook-form and Zod.                                                                                                          |
| `@sentry/react`                    | Yes             | Route wrapper (`wrapCreateBrowserRouterV7`), `reportError()` in errorHandler, Sentry.init in observability/sentry.                                                                     |
| `@sentry/vite-plugin`              | Yes             | `vite.config.ts` — source map upload to Sentry in production builds.                                                                                                                   |
| `@tanstack/react-query`            | Yes             | Server state: QueryClient, useQuery, useMutation; QueryProvider, queryClient; useDashboard, tests.                                                                                     |
| `@tanstack/react-table`            | Yes             | DataTable, DataTablePagination, DataTableColumnHeader, DataTableToolbar (flexRender, Table types).                                                                                     |
| `axios`                            | Yes             | `apiClient` (core/http), auth service (raw axios for refresh/me), retry config; tests.                                                                                                 |
| `axios-retry`                      | Yes             | `core/http/retry.ts` — exponential backoff for 429 and idempotent 5xx/network errors.                                                                                                  |
| `class-variance-authority`         | Yes             | `cva()` and `VariantProps` in button, badge (and other UI components that use variants).                                                                                               |
| `clsx`                             | Yes             | `lib/utils.ts` — `cn()` (with tailwind-merge) for conditional class names.                                                                                                             |
| `cmdk`                             | Yes             | `shared/components/command-palette.tsx` — global Command palette (Cmd+K).                                                                                                              |
| `fuse.js`                          | No              | In package.json; no import or usage in `src/`.                                                                                                                                         |
| `input-otp`                        | No              | Removed; MFA route can be re-added with an OTP UI when needed.                                                                                                                         |
| `lucide-react`                     | Yes             | Icons across app: button, command palette, layouts, forms, data-table, RetryError, FullPageSpinner, etc.                                                                               |
| `posthog-js`                       | Yes             | `core/analytics/posthog.ts` init; FeatureFlagProvider uses `posthog.isFeatureEnabled`, `onFeatureFlags`.                                                                               |
| `radix-ui`                         | Yes             | UI primitives: AlertDialog, DropdownMenu, Dialog, Tooltip, Checkbox, Separator, Label, Button (Slot), Badge, Avatar.                                                                   |
| `react`                            | Yes             | Core framework.                                                                                                                                                                        |
| `react-dom`                        | Yes             | Core framework (createRoot in main.tsx).                                                                                                                                               |
| `react-error-boundary`             | Yes             | `App.tsx` — ErrorBoundary with FallbackComponent and onReset.                                                                                                                          |
| `react-hook-form`                  | Yes             | LoginForm, FormField; useForm, FormProvider, Controller, etc.                                                                                                                          |
| `@tanstack/react-router`           | Yes             | Typed routes, `beforeLoad` guards, search params, lazy route modules (`route.tsx`).                                                                                                    |
| `recharts`                         | Yes             | `pages/dashboard/components/DashboardCharts.tsx` — charts (AreaChart, BarChart, XAxis, YAxis, etc.).                                                                                   |
| `sonner`                           | Yes             | `app/routes/routeTree.tsx` — `<Toaster />` at the root shell for toast notifications.                                                                                                  |
| `tailwind-merge`                   | Yes             | `lib/utils.ts` — `twMerge` inside `cn()` for Tailwind class merging.                                                                                                                   |
| `tw-animate-css`                   | Yes             | `index.css` `@import` — activates `animate-in`/`animate-out` enter/exit utilities for shadcn overlays (dialog, dropdown, popover, tooltip, select). Pure CSS; no JS animation library. |
| `web-vitals`                       | Yes             | `core/observability/performance.ts` — onCLS, onINP, onLCP, onFCP, onTTFB reported to PostHog/Sentry.                                                                                   |
| `zod`                              | Yes             | contracts (auth, dashboard), env schema, auth types; validation for API and forms.                                                                                                     |
| `zustand`                          | Yes             | useAuthStore, useThemeStore (with persist), useUIStore, useOrganizationStore; create + getState.                                                                                       |
| **DevDependencies**                |                 |                                                                                                                                                                                        |
| `@axe-core/playwright`             | Yes             | E2E accessibility scanning (e.g. accessibility.spec.ts).                                                                                                                               |
| `@commitlint/cli`                  | Yes             | Commit message lint (with config-conventional).                                                                                                                                        |
| `@commitlint/config-conventional`  | Yes             | Commitlint rules.                                                                                                                                                                      |
| `@eslint/js`                       | Yes             | ESLint base config.                                                                                                                                                                    |
| `@playwright/test`                 | Yes             | E2E tests (auth, dashboard, navigation, visual, accessibility).                                                                                                                        |
| `@size-limit/file`                 | Yes             | `size` / `size:check` scripts — bundle size limits.                                                                                                                                    |
| `@size-limit/preset-app`           | Yes             | Size-limit app preset.                                                                                                                                                                 |
| `@tailwindcss/vite`                | Yes             | Vite integration for Tailwind v4.                                                                                                                                                      |
| `@tanstack/react-query-devtools`   | Yes             | `QueryProvider` — ReactQueryDevtools in development.                                                                                                                                   |
| `@testing-library/jest-dom`        | Yes             | Test matchers (e.g. toHaveNoViolations, DOM assertions).                                                                                                                               |
| `@testing-library/react`           | Yes             | render, screen, etc. in unit/integration tests.                                                                                                                                        |
| `@testing-library/user-event`      | Yes             | User interaction simulation in tests.                                                                                                                                                  |
| `@types/node`                      | Yes             | Node types for build/tooling.                                                                                                                                                          |
| `@types/react`                     | Yes             | React type definitions.                                                                                                                                                                |
| `@types/react-dom`                 | Yes             | React DOM type definitions.                                                                                                                                                            |
| `@vitejs/plugin-react`             | Yes             | Vite config — React fast refresh.                                                                                                                                                      |
| `@vitest/coverage-v8`              | Yes             | Coverage (test:coverage, test:ci).                                                                                                                                                     |
| `eslint`                           | Yes             | Linting.                                                                                                                                                                               |
| `eslint-plugin-jsx-a11y`           | Yes             | A11y rules in ESLint.                                                                                                                                                                  |
| `eslint-plugin-react-hooks`        | Yes             | React hooks rules.                                                                                                                                                                     |
| `eslint-plugin-react-refresh`      | Yes             | Vite/React refresh rules.                                                                                                                                                              |
| `eslint-plugin-security`           | Yes             | Security-focused rules.                                                                                                                                                                |
| `eslint-plugin-simple-import-sort` | Yes             | Import sorting.                                                                                                                                                                        |
| `eslint-plugin-sonarjs`            | Yes             | Code quality rules.                                                                                                                                                                    |
| `eslint-plugin-unused-imports`     | Yes             | Unused import detection.                                                                                                                                                               |
| `globals`                          | Yes             | ESLint env globals.                                                                                                                                                                    |
| `husky`                            | Yes             | Git hooks (prepare script).                                                                                                                                                            |
| `jsdom`                            | Yes             | Vitest DOM environment.                                                                                                                                                                |
| `lint-staged`                      | Yes             | Pre-commit: eslint --fix, prettier on staged files.                                                                                                                                    |
| `prettier`                         | Yes             | Formatting (format, format:check).                                                                                                                                                     |
| `prettier-plugin-tailwindcss`      | Yes             | Prettier Tailwind class sorting.                                                                                                                                                       |
| `rollup-plugin-visualizer`         | Yes             | Build analyzer (build:analyze).                                                                                                                                                        |
| `tailwindcss`                      | Yes             | Tailwind v4 (index.css, @theme).                                                                                                                                                       |
| `typescript`                       | Yes             | type-check script, TS compilation.                                                                                                                                                     |
| `typescript-eslint`                | Yes             | ESLint TypeScript rules.                                                                                                                                                               |
| `vite`                             | Yes             | Dev server and production build.                                                                                                                                                       |
| `vite-plugin-pwa`                  | Yes             | PWA support (sw.ts, workbox).                                                                                                                                                          |
| `vitest`                           | Yes             | Unit/integration test runner.                                                                                                                                                          |
| `vitest-axe`                       | Yes             | a11y assertions (toHaveNoViolations) in tests.                                                                                                                                         |
| `workbox-*`                        | Yes             | PWA (precaching, routing, strategies, expiration).                                                                                                                                     |

---

## Agent skills — shadcn (single canonical skill)

The official **shadcn skill** is vendored at **`agent-os/skills/shadcn/`** (installed via `pnpm dlx skills add shadcn/ui`; the equivalent `npx skills add https://github.com/shadcn/ui --skill shadcn` resolves to the same `skills.sh/shadcn/ui` source and installs the identical files to the same path).

- **One skill for everything shadcn:** _how_ to add/fix/style/compose (CLI + Critical Rules in `SKILL.md` + `rules/`) **and** _where_ a block comes from (its "Project rules — core-fe" section folds in the 20 allowed sources + selection workflow). The former `agent-os/skills/shadcn-component-selection/SKILL.md` is reduced to a pointer.
- **Use the project runner:** `pnpm dlx shadcn@latest <info|search|docs|view|add> …`.
- **Always-applied policy:** `agent-os/rules/ui-sources.mdc`. **Router:** `agent-os/rules/skill-router.mdc` (rule 13).
- **Updating:** re-running `skills add` overwrites `agent-os/skills/shadcn/`; the local "Project rules — core-fe" block at the end of its `SKILL.md` must be re-appended (the same policy is preserved in `ui-sources.mdc`, which is always applied).

## Agent skills — frontend-design

Design-thinking + aesthetic-quality skill vendored at **`agent-os/skills/frontend-design/`** (installed via `npx skills add https://github.com/anthropics/skills --skill frontend-design`).

- **Use for:** building/styling/beautifying UI — typography hierarchy, intentional color/theme, high-impact motion, spatial composition, depth, memorable details; avoid generic "AI slop".
- **Precedence:** apply _within_ project guardrails — shadcn components (`agent-os/skills/shadcn`), neutral semantic tokens in `src/index.css` (no raw colors / no purple-on-white), configured fonts/brand, and `web-design-guidelines` for a11y. It elevates craft, it does **not** override the component library, design tokens, or brand. Standalone artifacts may get more creative latitude.
- **Router:** `agent-os/rules/skill-router.mdc` (rule 14). **Registry:** `agent-os/skills/skill-registry/SKILL.md` (#4b).

## Agent skills — find-skills

Meta-skill for discovering/installing skills, vendored at **`agent-os/skills/find-skills/`** (installed via `npx skills add https://github.com/vercel-labs/skills --skill find-skills`).

- **Use for:** "is there a skill for X", discovering new capabilities, or any task not covered by `skill-router.mdc` / `skill-registry`.
- **Workflow:** check [skills.sh](https://skills.sh/) → `npx skills find <query>` → prefer reputable/high-install skills → present options → install into `agent-os/skills/` → **wire the new skill into router + registry + docs**.
- **Router:** `agent-os/rules/skill-router.mdc` (rule 15). **Registry:** `agent-os/skills/skill-registry/SKILL.md` (#14).

### Installed skills (tracked in `skills-lock.json`)

| Skill             | Source                                 | Use for                                                                                                                                                                                                                         |
| ----------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shadcn`          | `shadcn/ui`                            | All shadcn/ui work (CLI, critical rules, component selection across 20 allowed sources)                                                                                                                                         |
| `frontend-design` | `anthropics/skills`                    | Distinctive, polished UI craft — within project tokens/brand/a11y guardrails                                                                                                                                                    |
| `ui-ux-pro-max`   | `nextlevelbuilder/ui-ux-pro-max-skill` | Advisory design-intelligence DB (styles, palettes, font pairings, UX/stack/chart guidelines); query via `python3 agent-os/skills/ui-ux-pro-max/scripts/search.py …`. Local-only scripts; does not override project tokens/brand |
| `find-skills`     | `vercel-labs/skills`                   | Discover/install new skills from the ecosystem                                                                                                                                                                                  |

Run `npx skills check` / `npx skills update` to update them; re-append the local "Project rules — core-fe" block to `shadcn/SKILL.md` after updating it.

> **`ui-ux-pro-max` safety:** the installer's Gen heuristic flags it "High Risk", but its bundled Python (`scripts/*.py`, `data/_sync_all.py`) is a local BM25 search + CSV/markdown generator — **no** network/subprocess/eval/exec (reviewed). Requires `python3`. Treat its output as advisory; `--persist` writes `design-system/` files only when explicitly requested.

---

## Public static assets (frontend)

All files in **`public/`** are served from the root of the built site. See **[public/README.md](../../public/README.md)** for the full inventory and maintenance notes.

| Asset                                    | Purpose                                                                                              |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **robots.txt**                           | Crawler rules (allow/disallow). Present in `public/`; update if you add a sitemap or restrict paths. |
| **manifest.webmanifest**                 | PWA manifest (name, theme_color, icons, start_url). Update when app name or icons change.            |
| **\_headers**                            | Security/response headers (e.g. Permissions-Policy). Applied by Netlify or static host.              |
| **config.js**                            | Runtime config placeholder (`window.__CONFIG__`); overwritten by host if needed.                     |
| **theme-init.js**                        | Prevents theme FOUC; applies `.dark` from localStorage before React.                                 |
| **offline.html**                         | PWA offline fallback.                                                                                |
| **vite.svg**                             | Default favicon; replace with app icon if desired.                                                   |
| **pwa-192x192.png**, **pwa-512x512.png** | Required by manifest for PWA install; add to `public/` (generate from app icon).                     |

---

## New-deployment detection

The app detects when a new build has been deployed and reloads the page so users don’t run stale cached code.

- **Plugin:** `plugins/version-json.ts` — At build time generates a unique `buildId` and sets `import.meta.env.VITE_APP_BUILD_ID`. In dev it serves `/version.json` via middleware; in prod it writes `dist/version.json` with `buildId` and `builtAt` (UTC, ISO 8601).
- **Runtime:** `src/core/version/check.ts` — Periodically fetches `/version.json` (with cache-busting). If the response `buildId` differs from the app’s built-in `VITE_APP_BUILD_ID`, it calls `location.reload()` so the user gets the new deployment.

---

## Summary

- **Not used in source:** `fuse.js` — safe to remove if you don't plan to add fuzzy search.
- **Removed:** `input-otp` (component removed; MFA can be re-added when needed).
- **Exposed but unused in components:** `@formkit/auto-animate` (useAutoAnimate exported from lib, no ref in a component yet).

All other listed packages are used as indicated in the table.
