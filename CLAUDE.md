# CLAUDE.md — Core Frontend Project Conventions

This document is the single source of truth for understanding and working in this codebase. Read it before making any changes.

## Quick Start

```bash
pnpm install
pnpm dev          # Vite dev server on port 5173
pnpm build        # Production build
pnpm tsc          # Type check (no emit)
pnpm lint         # ESLint
pnpm health       # Full project health check (all phases)
pnpm health:fix   # Auto-fix + full health check
```

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
- **Reference:** docs/reference/tools-and-usage.md, docs/reference/routes-and-ui.md, docs/reference/dependency-upgrades.md, docs/reference/internationalization.md

## Architecture Overview

```
Layer          Purpose                                                    Files (approx)
─────────────  ─────────────────────────────────────────────────────────  ──────────────
src/app/       Route tree, guards, providers, error boundaries            ~10
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

```
tests/              # At project root: utils, e2e, load (see tests/README.md)
src/
├── app/            # Application shell: route tree, guards, providers, error boundaries
├── core/           # Framework-agnostic services: auth, HTTP, RBAC, config, data-provider, resources, observability
├── pages/          # Page-first feature directories (each = a frontend route)
├── shared/         # Cross-page reusables: components, forms, hooks, layouts, store
├── lib/            # Pure utilities: cn(), animations, helpers (no side effects)
├── App.tsx         # Root component
├── main.tsx        # Entry point
└── index.css       # Tailwind CSS v4 entry with @theme tokens
```

All Zustand stores live in **`src/shared/store/<X>Store/`** (folder-per-unit) — `useAuthStore`, `useTenantStore`, `useThemeStore`, `useUIStore`, `useOnboardingStore`. Cross-page API helpers (organization-domain schemas + fetchers, tenancy bootstrap, my-orgs listing) live in **`src/shared/api/`**. Auth infrastructure (token, refresh-timer, idle-timeout, login/logout service, mocks) lives in **`src/shared/auth/`**.

**Dependency rule (one-way):** `ui → lib → core → shared → pages → app`. Pages never import from other pages. One documented exception: the core kernel (`core/http`, `core/rbac`) may import the shared runtime trio — `shared/auth`, `shared/errors`, `useAuthStore`/`useTenantStore` (see `agent-os/rules/file-structure.mdc` → Import Rules; enforced in `eslint.config.mjs`).

## Route Marker Convention (`<page>.route.tsx`)

Every directory under `src/pages/` that corresponds to a frontend URL path **must** contain a **`<page>.route.tsx`** file (page-prefixed, lowercase-dotted). This file is the boundary between routes.

**Source of truth for what is live today:** [`src/app/routes/routeTree.tsx`](src/app/routes/routeTree.tsx) and [`docs/reference/routes-and-ui.md`](docs/reference/routes-and-ui.md). The tree below mixes **implemented** routes with **common examples** (same shapes as new features).

```
src/pages/
├── auth/
│   ├── login/
│   │   ├── login.route.tsx          ← /login
│   │   └── forms/LoginForm/         (folder-per-unit)
│   ├── register/
│   │   ├── register.route.tsx       ← /register
│   │   └── forms/RegisterForm/
│   ├── auth.contracts.ts            ← Shared auth Zod schemas
│   └── auth.api.ts                  ← Shared auth API calls
├── dashboard/
│   ├── dashboard.route.tsx          ← / (index)
│   ├── dashboard.page.ts            ← manifest
│   ├── DashboardPage.tsx            ← top-level UI
│   ├── dashboard.contracts.ts
│   ├── dashboard.api.ts
│   ├── hooks/useDashboard/          (folder-per-unit)
│   └── components/                  (each sub-unit a folder)
├── organizations/
│   ├── organizations.route.tsx      ← /organizations
│   ├── organizations.page.ts
│   ├── OrganizationsListPage.tsx
│   ├── organizations.contracts.ts
│   ├── organizations.api.ts
│   ├── hooks/, components/, forms/, dialogs/
│   └── sub-pages/{create, $id, $id-edit}/  ← URL-driven CRUD dialogs
└── ...
```

### Page Directory Shape (route island)

Every route uses a **route island** ([`agent-os/skills/route-island/SKILL.md`](agent-os/skills/route-island/SKILL.md), [`docs/reference/route-island-structure.md`](docs/reference/route-island-structure.md)). Layout parents nest children under **`sub-pages/<sub-page-name>/`**. **`<page>.page.ts`** is the layout + leaf manifest; top-level UI is `<Page>Page.tsx` / `<Page>Layout.tsx` at island root; tests are colocated next to source (sub-units use folder-per-unit).

```
pages/<page>/
├── OVERVIEW.md                       # required — AI/human entry doc
├── <page>.route.tsx                  # required — lazy boundary
├── <page>.page.ts                    # required — manifest (path, RBAC, testId, kind, children)
├── <Page>Page.tsx | <Page>Layout.tsx # required — top-level UI
├── <page>.contracts.ts               # optional — Zod schemas
├── <page>.api.ts                     # optional — fetchers
├── <page>.search.ts                  # optional — URL search-params schema
├── <page>.fixtures.ts                # optional — mocks
├── store/use<X>Store/                # rare — page-local Zustand (folder-per-unit)
├── components/<Name>/                # folder-per-unit: <Name>.tsx + .test.tsx + index.ts
├── forms/<Name>Form/                 # folder-per-unit
├── hooks/use<Name>/                  # folder-per-unit
├── dialogs/<Name>Dialog/             # folder-per-unit (resource pages)
├── __tests__/integration/            # cross-component flows in this island
└── sub-pages/<child>/                # nested routes — full recursive copy
```

### `<page>.route.tsx` Contract

```tsx
// Every <page>.route.tsx must export Component (required).
// Optional exports: loader, action, ErrorBoundary.
import { requirePermission } from '@/core/rbac/guards.ts';

import { DashboardPage } from './DashboardPage.tsx';
import { page } from './dashboard.page.ts';

export function Component() {
  return <DashboardPage />;
}

export function loader() {
  if (page.permission) requirePermission(page.permission);
  return null;
}
```

### Dialog vs Full Page Decision

- **Full page**: a new directory with `<page>.route.tsx`.
- **URL-driven dialog** (Create/Edit on resource pages): `sub-pages/<segment>/<segment>.route.tsx` that renders `null`; the parent list page reads URL and opens the matching dialog.
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

```
src/shared/
├── components/
│   ├── ui/                          # shadcn/ui primitives — FLAT (button.tsx, card.tsx, ...)
│   └── <Name>/                      # cross-page components — folder-per-unit
├── forms/<Name>/                    # cross-page forms — folder-per-unit
├── hooks/
│   ├── use<X>/                      # cross-page custom hooks — folder-per-unit
│   └── useList/, useOne/, useCreate/, useUpdate/, useDelete/   # standard CRUD hooks
├── layouts/<Name>/                  # AuthLayout, DashboardLayout — folder-per-unit
└── store/                           # global Zustand
    ├── useThemeStore/
    ├── useUIStore/
    └── useOnboardingStore/
```

### Component Promotion Rule

Components start colocated with their page. Move to `shared/` only when used by **2+ different page groups**.

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

```
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
- Protected routes use TanStack Router `beforeLoad` guards in `routeTree.tsx` (auth redirect, tenant bootstrap, `requirePermission`).
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
