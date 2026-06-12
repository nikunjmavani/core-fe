# CLAUDE.md — Core Frontend Project Conventions

This document is the single source of truth for understanding and working in this codebase. Read it before making any changes.

## Quick Start

```bash
pnpm install
pnpm dev          # Vite dev server on port 5173
pnpm build        # Production build
pnpm tsc          # Type check (no emit)
pnpm lint         # ESLint
pnpm biome:check  # Biome lint lane (lint-only; Prettier owns formatting)
pnpm health       # Full project health check (all phases)
pnpm health:fix   # Auto-fix + full health check
pnpm quality      # health + local SonarQube gate (Docker)
```

**Quality gates (mirrors core-be):** Biome is a second lint lane (`biome.json`; formatter
disabled — Prettier + `prettier-plugin-tailwindcss` own formatting). SonarQube runs locally in
Docker and is enforced by `.husky/pre-push` on deployed-surface changes (`pnpm sonar:scan`;
`SKIP_SONAR=1 git push` to bypass once) — see docs/reference/quality/sonarqube-local.md.
Coverage thresholds in `vitest.config.ts` are a **ratchet**: pinned just under measured
coverage, raised as coverage rises, never lowered; the same raise-never philosophy applies to
the **TSDoc budget** (`pnpm tsdoc:check`, `scripts/tsdoc/budget.json`) and to **patch
coverage** (`pnpm coverage:patch` — changed lines ≥ 80% in PR CI). Vitest is split into
`unit` (colocated src suites) and `security` (tests/security — token storage, redirect
safety, mock-mode rejection, header tripwires) projects. Markdown is linted
(`pnpm docs:lint`; emphasis style follows Prettier). CI (`.github/workflows/ci.yml`) runs
path-filtered parallel lanes — biome/eslint/prettier/tsc/vitest+patch-coverage/docs-lint/
structure+tsdoc/build+size+SBOM/gitleaks/semgrep/deps-audit/dependency-review/actionlint/e2e —
behind a single aggregate `quality-gate` required check (branch protection as code:
`.github/rulesets/`, `pnpm gh:rulesets:sync`). CodeQL, Stryker mutation tests, Lighthouse
budgets, k6 load, cache cleanup, and Dependabot CI triage run as scheduled/event workflows.

## Documentation

- **Engineering principles (Cursor):** `agent-os/rules/engineering-principles.mdc`
- **Index by use case:** docs/README.md
- **Local setup:** docs/getting-started/setup.md
- **Requirement intake (format, types, skills, rules):** docs/getting-started/requirement-intake.md — template: docs/getting-started/requirement-format.md, example: docs/getting-started/requirements/sample-requirement.md
- **Deploy / runbook:** docs/deployment/runbook-dev-to-production.md, docs/deployment/cicd-and-netlify.md, docs/deployment/deployment-and-pre-launch.md
- **Path to production (gate):** docs/deployment/path-to-production.md
- **Netlify CLI setup:** docs/deployment/netlify-cli-setup.md
- **Credentials / env:** docs/integrations/credentials-and-env.md; Sentry: docs/integrations/sentry-sourcemaps.md
- **Cursor ↔ backend API (MCP):** agent-os/docs/cursor-backend-mcp.md
- **Git workflow:** docs/process/git-workflow.md
- **Routing & tenancy (implemented spec):** docs/reference/routing-and-tenancy.md
- **SonarQube local quality gate:** docs/reference/quality/sonarqube-local.md
- **Reference:** docs/reference/tools-and-usage.md, docs/reference/routes-and-ui.md, docs/reference/dependency-upgrades.md, docs/reference/internationalization.md

## Architecture Overview

```text
Layer          Purpose                                                    Files (approx)
─────────────  ─────────────────────────────────────────────────────────  ──────────────
src/app/       Application shell: routes, guards, providers, error        ~20
               boundaries, analytics + observability bootstrap
src/core/      HTTP, RBAC, config, data-provider, resources,             ~30
               version, types — pure framework-agnostic platform
src/pages/     Route islands (feature code) — custom + resource shapes    ~100
src/shared/    shadcn UI (flat), components/forms/hooks/layouts          ~100
               (folder-per-unit), global Zustand store, standard CRUD,
               cross-page api helpers, auth runtime, errors
src/lib/       Pure utilities (cn, animations, route-island helpers)      ~15
tests/         E2E (Playwright), load (k6), shared test utils             ~15

agent-os/      Agents, skills, rules, hooks, MCP, docs                    ~50+
               (.cursor/ and .claude/ symlink into this)
```

```text
tests/              # At project root: utils, e2e, load (see tests/README.md)
src/
├── app/            # Application shell: route tree, guards, providers, error boundaries
├── core/           # Framework-agnostic services: HTTP, RBAC, config, data-provider, resources, version
├── pages/          # Page-first feature directories (each = a frontend route)
├── shared/         # Cross-page reusables: components, forms, hooks, layouts, store
├── lib/            # Pure utilities: cn(), animations, helpers (no side effects)
├── App.tsx         # Root component
├── main.tsx        # Entry point
└── index.css       # Tailwind CSS v4 entry with @theme tokens
```

All Zustand stores live in **`src/shared/store/<X>Store/`** (folder-per-unit) — `useAuthStore`, `useOrganizationStore`, `useThemeStore`, `useUIStore`, `useOnboardingStore`. Cross-page API helpers (auth-screen schemas + fetchers `auth-api.ts`/`auth-contracts.ts`, organization-domain schemas + fetchers) live in **`src/shared/api/`**. Organization/tenancy runtime (URL-driven context, membership, `/` resolver, my-organizations) lives in **`src/shared/tenancy/`** — the URL is the single source of truth for organization context. Auth infrastructure (token, refresh-timer, idle-timeout, login/logout service, mocks) lives in **`src/shared/auth/`**.

**Dependency rule (one-way):** `ui → lib → core → shared → pages → app`. Pages never import from other pages. One documented exception: the core kernel (`core/http`, `core/rbac`) may import the shared runtime trio — `shared/auth`, `shared/errors`, `useAuthStore`/`useOrganizationStore` (see `agent-os/rules/file-structure.mdc` → Import Rules; enforced in `eslint.config.mjs`).

## Route Marker Convention (`<page>.route.tsx`)

Every directory under `src/pages/` that corresponds to a frontend URL path **must** contain a **`<page>.route.tsx`** file (page-prefixed, lowercase-dotted). This file is the boundary between routes.

**The rule in five lines (read this first):**

1. **`src/pages/` mirrors the URL tree 1:1.** `/login` → `pages/login/`; `/organization/org_8fK2x/dashboard` → `pages/organization/$organizationId/dashboard/`. Children nest **directly** (no `sub-pages/` bucket); dynamic segments are `$param` folders. One exception: `/` is a pure resolver route (redirect only, no island).
2. **Every page folder maintains the same 4 files** — `<page>.route.tsx`, `<page>.manifest.ts`, `<Page>Page.tsx` (or `Layout`), `<PAGE>.OVERVIEW.md` — plus 2 registrations: `routeTree.tsx` and `docs/reference/routes-and-ui.md`. In `$param` folders the prefix derives mechanically: strip `$`, kebab-case (`$organizationId/` → `organization-id.route.tsx`, `ORGANIZATION_ID.OVERVIEW.md`).
3. **Page shells live in `shared/layouts/`** — AuthLayout via the pathless `auth-shell` route; AppShell via the `pages/organization/$organizationId/` layout island (the org guard boundary). No grouping directories under `pages/`.
4. **Code used by 2+ page islands lives in `shared/`** (e.g. `shared/api/auth-api.ts`, `shared/tenancy/`).
5. **Settings is a global hash modal, not a route space** — `#settings/<scope>/<section>` opens `shared/components/SettingsModal/` over any page (see `agent-os/rules/file-structure.mdc` → Settings hash modal). Full spec: `docs/reference/routing-and-tenancy.md`.

**Source of truth for what is live today:** [`src/app/routes/routeTree.tsx`](src/app/routes/routeTree.tsx) and [`docs/reference/routes-and-ui.md`](docs/reference/routes-and-ui.md). The tree below mixes **implemented** routes with **common examples** (same shapes as new features).

```text
src/pages/
├── login/                           ← /login (AuthLayout via pathless auth-shell)
│   ├── login.route.tsx
│   ├── login.manifest.ts                ← manifest
│   ├── LoginPage.tsx                ← top-level UI
│   ├── LOGIN.OVERVIEW.md
│   └── forms/LoginForm/             (folder-per-unit)
├── register/  forgot-password/  reset-password/  verify-email/  mfa/
├── callback/
│   └── callback.route.tsx           ← /callback (one URL for every OAuth provider)
├── onboarding/   accept-invite/
└── organization/
    ├── organization.route.tsx       ← /organization (picker)
    ├── organization.manifest.ts
    ├── OrganizationPickerPage.tsx
    └── $organizationId/             ← /organization/org_8fK2x — org guard boundary
        ├── organization-id.route.tsx     ($param folder → strip-$ kebab prefix)
        ├── organization-id.manifest.ts       kind: 'layout', children: [dashboard, suspended]
        ├── OrganizationLayout.tsx        mounts shared AppShell
        ├── ORGANIZATION_ID.OVERVIEW.md
        ├── dashboard/               ← …/dashboard — full island (api, contracts, hooks/, components/)
        ├── suspended/               ← …/suspended — status-guard target
        └── patients/                ← (example) future islands nest directly: patients/$patientId/…
```

### Page Directory Shape (route island)

Every route uses a **route island** ([`agent-os/skills/route-island/SKILL.md`](agent-os/skills/route-island/SKILL.md), [`docs/reference/route-island-structure.md`](docs/reference/route-island-structure.md)). Layout parents nest children **directly** as `<segment>/` (or `$param/`). **`<page>.manifest.ts`** is the layout + leaf manifest; top-level UI is `<Page>Page.tsx` / `<Page>Layout.tsx` at island root; tests are colocated next to source (sub-units use folder-per-unit).

```text
src/pages/<page>/                          ← folder = URL segment
│
│══ MANDATORY — every page, validator-enforced ════════════════════════════
├── <PAGE>.OVERVIEW.md                     entry doc: purpose, files, test ids
├── <page>.route.tsx                       lazy boundary — Component (+ loader: requirePermission)
├── <page>.manifest.ts                     manifest — path, testId, permission, kind, children
├── <Page>Page.tsx | <Page>Layout.tsx      top-level UI (Layout + <Outlet/> when kind:'layout')
│
│══ OPTIONAL — the page's OWN data layer ══════════════════════════════════
├── <page>.contracts.ts                    Zod schemas + types for THIS page's API shapes
├── <page>.api.ts                          fetchers → shared apiClient   (PRIVATE to this page,
│                                          even from its children — sharing goes via shared/)
├── <page>.fixtures.ts                     mock data (REPLACE_WITH_API)
├── <page>.search.ts                       URL search-param schema (validateSearch)
├── <page>.constants.ts                    page-scoped constants
├── <page>.resource.ts                     resource manifest (resource pages only)
│
│══ OPTIONAL — units (each: <X>.tsx + <X>.test.tsx + index.ts) ════════════
├── components/<Widget>/                   page-only widgets
├── forms/<Name>Form/                      page-only forms
├── hooks/use<X>/                          page-only Query hooks (wrap <page>.api.ts)
├── dialogs/<Name>Dialog/                  URL-driven dialogs (resource pages)
├── store/use<X>Store/                     RARE page-local Zustand
├── __tests__/integration/                 this page's cross-component flows
│
│══ OPTIONAL — FAMILY-SHARED (kind:'layout' only) ═════════════════════════
├── shared/                                used by THIS page + its children — never other families
│   ├── components/<X>/  hooks/use<X>/     same unit shapes as root shared
│   └── <name>-contracts.ts · <name>-api.ts   family-scoped plain modules
│
│══ OPTIONAL — children (kind:'layout' only; disk mirrors URL) ════════════
└── <child>/  ·  $param/                   full recursive copy of this exact anatomy
                                           (`shared` & unit names are reserved — can't be routes)
```

### `<page>.route.tsx` Contract

```tsx
// Every <page>.route.tsx must export Component (required).
// Optional exports: loader, action, ErrorBoundary.
import { requirePermission } from '@/core/rbac/guards.ts';

import { DashboardPage } from './DashboardPage.tsx';
import { manifest } from './dashboard.manifest.ts';

export function Component() {
  return <DashboardPage />;
}

export function loader() {
  if (manifest.permission) requirePermission(manifest.permission);
  return null;
}
```

### Dialog vs Full Page Decision

- **Full page**: a new directory with `<page>.route.tsx`.
- **URL-driven dialog** (Create/Edit on resource pages): a direct child `<segment>/<segment>.route.tsx` that renders `null`; the parent list page reads URL and opens the matching dialog.
- **Action dialog** (no URL needed, e.g., delete confirm): inline `AlertDialog`, no `route.tsx`.
- Rule: Everything between two `<page>.route.tsx` files belongs to the parent.

### CRUD URL convention (resource pages)

| Action | URL                     | Renders              |
| ------ | ----------------------- | -------------------- |
| List   | `/<resource>`           | Page                 |
| Create | `/<resource>/create`    | Dialog over list     |
| Show   | `/<resource>/[id]`      | Page or dialog       |
| Edit   | `/<resource>/[id]/edit` | Dialog over list     |
| Delete | (no URL)                | Inline `AlertDialog` |

## Shared Layer

```text
src/shared/
├── components/
│   ├── ui/                          # shadcn/ui primitives — FLAT (button.tsx, card.tsx, ...)
│   └── <Name>/                      # cross-page components — folder-per-unit
├── forms/<Name>/                    # cross-page forms — folder-per-unit
├── hooks/
│   ├── use<X>/                      # cross-page custom hooks — folder-per-unit
│   └── useList/, useOne/, useCreate/, useUpdate/, useDelete/   # standard CRUD hooks
├── layouts/<Name>/                  # AuthLayout, AppShell — folder-per-unit
└── store/                           # global Zustand
    ├── useThemeStore/
    ├── useUIStore/
    └── useOnboardingStore/
```

### Promotion ladder

Everything starts colocated with its page and climbs exactly one rung per force:

```text
ONE page                            → inside that page
page + its OWN nested children      → pages/<parent>/shared/   (family-shared)
DIFFERENT families, or any
src/shared component needs it       → src/shared/              (root shared)
platform-level                      → src/core/ or src/lib/
```

Family-shared is importable by the parent island and its descendants only — never by sibling families. Full rules: `agent-os/rules/file-structure.mdc` → Promotion ladder.

## Import Conventions

- **Always** use the `@/` path alias for all imports from `src/`.
- **Always** include `.ts`/`.tsx` extensions in import paths.
- Use `type` imports for type-only imports: `import type { User } from './types.ts'`

```tsx
// Good
import { Button } from '@/shared/components/ui/button.tsx';
import type { User } from './contracts.ts';

// Bad
import { Button } from '@/shared/components/ui/button';
import { User } from './contracts';
```

## TypeScript

- Strict mode: `strict: true`, `noUncheckedIndexedAccess: true`, `noUnusedLocals: true`
- Define data shapes as **Zod schemas** in `contracts.ts`; infer TS types from them.
- Never use `any` — use `unknown` and narrow with type guards.

## State Management

| Scope                                        | Library                   | Location                                                          |
| -------------------------------------------- | ------------------------- | ----------------------------------------------------------------- |
| Server state                                 | TanStack Query            | `pages/<page>/hooks/use<X>/` or `shared/hooks/use{List,One,...}/` |
| Global client state                          | Zustand                   | `src/shared/store/use<X>Store/`                                   |
| Cross-page API helpers (org domain, tenancy) | Plain modules             | `src/shared/api/`                                                 |
| Page-local UI state                          | Zustand                   | `src/pages/<page>/store/use<X>Store/` (rare)                      |
| Component-local                              | `useState` / `useReducer` | Inline; extract reducer to `<Component>.reducer.ts` when complex  |
| Form state                                   | react-hook-form + Zod     | Inside the form component                                         |
| URL state                                    | TanStack Router           | `<page>.search.ts` (validateSearch schema)                        |

**Never** store API data in Zustand — TanStack Query owns server state. Page-local stores are an escape hatch (try `useState` → `useReducer` → URL search params first). Reducers live next to their component; no `reducers/` directory.

## Component Patterns

- **shadcn skill (single source of truth):** for all shadcn/ui work — adding, fixing, styling, composing, CLI, **and choosing which component to use** — follow **`agent-os/skills/shadcn/SKILL.md`** (installed via `pnpm dlx skills add shadcn/ui`). It contains the CLI workflow, Critical Rules, and the project's allowed-sources/selection policy (the former `shadcn-component-selection` skill is merged into it). Add components with `pnpm dlx shadcn@latest add …`; the always-applied rule is `agent-os/rules/ui-sources.mdc`.
- Functional components only (no class components).
- shadcn/ui components use **plain functions** (not `React.forwardRef`), with `data-slot` attributes.
- shadcn/ui imports from `radix-ui` monorepo (not individual `@radix-ui/react-*` packages).
- Compose styles with `cn()` from `@/lib/utils.ts` (clsx + tailwind-merge).
- Use `cva` (class-variance-authority) for variant-based component APIs.
- All interactive elements must have proper ARIA attributes.

## Styling

- **Tailwind CSS v4** with CSS-first config in `src/index.css`.
- Design tokens via `@theme` directive (OKLCH color space).
- Dark mode via `.dark` class — managed by `useThemeStore`.
- Never use inline styles — use Tailwind utility classes.
- shadcn/ui components live in `src/shared/components/ui/`.
- **Aesthetic quality:** when building/styling/beautifying UI, apply **`agent-os/skills/frontend-design/SKILL.md`** (typography hierarchy, intentional theme, high-impact motion, composition, memorable details) — but **within** the guardrails: shadcn components, neutral semantic tokens (no raw colors), configured fonts/brand, and `web-design-guidelines` for a11y. It elevates craft; it does not override the component library, tokens, or brand.
- **Design intelligence (advisory):** query **`agent-os/skills/ui-ux-pro-max/`** for styles, palettes, font pairings, UX/stack/chart guidance (`python3 agent-os/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain <…> [--stack shadcn]`). Advisory only — never overrides neutral tokens, configured fonts/brand, or shadcn choices.

## HTTP / API

- Use `apiClient` from `@/core/http/fetch-client.ts` for all API calls.
- Exception: auth service uses raw axios to avoid interceptor recursion.
- The Axios interceptor handles 401 refresh + replay.

## Environment Variables

Env files live at **project root** for clear paths. Vite loads them automatically.

```text
.env                 # Shared defaults (committed)
.env.development     # Dev overrides (committed)
.env.production      # Production overrides (committed, no secrets)
.env.local           # Local secrets (gitignored)
.env.example         # Reference for all env vars
```

- `VITE_` prefix = bundled into the client (public). No prefix = build-time only.
- Secrets (API keys, auth tokens) go in CI env vars or `.env.local`, never committed.
- **Where to get credentials and optional env:** docs/integrations/credentials-and-env.md

## Auth & Security

- Access token stored in memory only (module closure in `shared/auth/token.ts`).
- Refresh token is an HttpOnly cookie (set by backend).
- Never store tokens in localStorage or sessionStorage.
- `assetsInlineLimit: 0` in Vite config for CSP compliance.

## Routing

- All routes are lazy loaded via `route.tsx` files.
- Route config lives in `src/app/routes/routeTree.tsx`.
- Protected routes use TanStack Router `beforeLoad` guards in `routeTree.tsx` — the `$organizationId` chain (auth → membership/context sync from the URL → status) plus `requirePermission`; see `src/app/guards/GUARDS.OVERVIEW.md`.
- RBAC enforcement in route loaders: `requirePermission('domain.action')`.

## New-deployment detection

- **Plugin** `plugins/version-json.ts`: at build time sets `VITE_APP_BUILD_ID` and writes/serves `version.json` (dev: middleware; prod: `dist/version.json`). `builtAt` is UTC (ISO 8601).
- **Runtime** `src/core/version/check.ts`: polls `/version.json`; if `buildId` differs from the app’s build, calls `location.reload()` so users get the latest deployment.

## Testing

- **Global tests, helpers:** **`tests/`** at project root (see `tests/README.md`)
  - **Helpers:** `tests/utils/` — renderWithProviders, mocks, setup (test-app / test-api style); import as `@/tests/utils/...`
  - **Factories:** `tests/factories/` (optional) — shared test data builders when needed
  - **Security:** `tests/security/` (optional) — E2E for auth boundaries, CSP
  - **Performance:** `tests/performance/` (optional) — Lighthouse, bundle-size
- **Domain tests:** Colocated in `src/` — `src/pages/<name>/*.test.tsx`, `src/shared/**/*.test.tsx`, `src/core/**/*.test.ts` (no `src/domains/` or `__tests__` dirs)
- **E2E:** `tests/e2e/` (Playwright)
- **Load (k6):** `tests/load/` (e.g. `tests/load/k6/scenarios/` when multiple scenarios)
- Unit/integration run with Vitest; E2E with Playwright; load with k6
- **Strict test colocation (validator-enforced):** every component (incl. each island's `<Page>Page/Layout.tsx` and flat-group files) and every hook ships a colocated `*.test.ts(x)` — `pnpm validate:structure` fails without it. Exemptions: route/manifest/contracts/search/fixtures/constants, barrels, OVERVIEW docs.

**Mock map** (every mock is tagged `REPLACE_WITH_API`; dev-only — production builds reject mock mode):

| Location                                                            | What it mocks                                                           |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `core/http/mock.ts`                                                 | `mockResponse()` helper — wraps fixtures with realistic latency         |
| `shared/auth/mock-auth.ts`, `mock-credentials.ts`                   | Mock session/user + the demo login credentials                          |
| `shared/api/organization-mock-store.ts`, `organization-fixtures.ts` | In-memory org-domain state (members, invitations, roles, …) + seed data |
| `pages/<page>/<page>.fixtures.ts`                                   | Page-local mock data, colocated with the island that owns it            |
| `tests/utils/apiMocks.ts`, `mockApiClient.ts`                       | Unit-test API doubles (never imported by app code)                      |
