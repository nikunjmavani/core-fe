---
name: route-island
description: Self-contained route folders with page-prefixed role files, folder-per-unit sub-units, direct child folders for nested routes, and URL-driven CRUD dialogs.
---

# Route Island

Every route lives under `src/pages/<page-name>/` with the **same tree** at every depth. `<page>.page.ts` is the single manifest for layout vs leaf (path, RBAC, testId, `children`). Sub-units (components, forms, hooks, dialogs, stores) follow **folder-per-unit + barrel**.

Canonical rule: [`agent-os/rules/file-structure.mdc`](../../rules/file-structure.mdc) (this skill is the workflow; the rule is the contract).

Platform: `@/core/*`, `@/shared/*`, `@/lib/*`, `src/app/routes/routeTree.tsx` only.

## Canonical tree

```text
pages/<page-name>/
├── <PAGE>.OVERVIEW.md                        REQUIRED — AI/human entry doc
├── <page>.route.tsx                   REQUIRED — Lazy boundary (Component, loader, ErrorBoundary)
├── <page>.page.ts                     REQUIRED — Manifest (path, RBAC, testId, kind, children)
├── <Page>Page.tsx                     REQUIRED when kind: leaf  — top-level UI
├── <Page>Layout.tsx                   REQUIRED when kind: layout — top-level UI + <Outlet />
├── <page>.contracts.ts                OPTIONAL — Zod schemas + inferred types
├── <page>.api.ts                      OPTIONAL — fetcher functions
├── <page>.search.ts                   OPTIONAL — URL search-param schema (validateSearch)
├── <page>.fixtures.ts                 OPTIONAL — mocks (REPLACE_WITH_API)
├── <page>.constants.ts                OPTIONAL
├── <page>.resource.ts                 OPTIONAL — resource manifest (resource pages only)
├── store/use<X>Store/{...}            RARE — page-local Zustand
├── components/<Name>/                 folder-per-unit: <Name>.tsx + <Name>.test.tsx + index.ts
├── forms/<Name>Form/                  folder-per-unit
├── hooks/use<Name>/                   folder-per-unit
├── dialogs/<Name>Dialog/              folder-per-unit (resource pages)
├── __tests__/integration/             cross-component flows in this island
└── <child>/                           nested route — DIRECT child, full recursive copy
```

**No child route folders** when `kind: 'leaf'` and `children: []`.

## Naming summary (cheat sheet)

| Category                      | Style                                             | Example                                                        |
| ----------------------------- | ------------------------------------------------- | -------------------------------------------------------------- |
| Role files (one per page)     | `<page>.<role>.<ext>` lowercase-dotted            | `dashboard.route.tsx`, `dashboard.page.ts`, `dashboard.api.ts` |
| Entry doc                     | UPPER_SNAKE, directory-prefixed                   | `<PAGE>.OVERVIEW.md`                                           |
| Top-level UI                  | PascalCase, page-prefixed                         | `DashboardPage.tsx`, `OrganizationLayout.tsx`                  |
| Sub-units                     | PascalCase, **no prefix** (path provides context) | `ActivityFeed/`, `LoginForm/`, `useDashboard/`                 |
| shadcn primitives (exception) | flat, lowercase                                   | `shared/components/ui/button.tsx`                              |

## `<page>.page.ts` — the manifest

One file describes both leaf and layout islands:

```ts
import type { PageManifest } from '@/lib/routes/page-manifest.ts';

export const page = {
  segment: 'organizations',
  path: '/organizations',
  testId: 'organizations-page',
  permission: null, // or 'organization:read' etc.
  kind: 'leaf', // 'leaf' | 'layout'
  children: [], // child URL segments when kind: 'layout' (disk: <segment>/ directly)
} as const satisfies PageManifest;
```

| `kind`   | Top-level UI file                      | Children                                        |
| -------- | -------------------------------------- | ----------------------------------------------- |
| `leaf`   | `<Page>Page.tsx`                       | none — `children: []`                           |
| `layout` | `<Page>Layout.tsx` (uses `<Outlet />`) | listed in `children`; disk: `<child>/` (direct) |

## `<page>.route.tsx` — the boundary

Thin React boundary; imports the page manifest + the top-level UI:

```tsx
import { requirePermission } from '@/core/rbac/guards.ts';

import { OrganizationsPage } from './OrganizationsPage.tsx';
import { page } from './organizations.page.ts';

export function Component() {
  return <OrganizationsPage />;
}

export function loader() {
  if (page.permission) requirePermission(page.permission);
  return null;
}
```

## Folder-per-unit + barrel

Every component / form / hook / dialog / store lives in its own folder:

```
components/ActivityFeed/
├── ActivityFeed.tsx                   source
├── ActivityFeed.test.tsx              colocated unit test
└── index.ts                           export { ActivityFeed } from './ActivityFeed.tsx';
```

Imports stay clean: `import { ActivityFeed } from './components/ActivityFeed/index.ts'`.

**Exception:** shadcn primitives in `shared/components/ui/` stay flat (`button.tsx`, `card.tsx`).

## Resource pages — URL-driven CRUD

For pages that map to a backend resource (organizations, members, roles, etc.), add the resource specialization:

```text
pages/<resource>/
├── <resource>.route.tsx               parent — renders the list
├── <resource>.page.ts                 kind: 'layout', children: ['create', '$<resource>Id']
├── <resource>.resource.ts             resource manifest (endpoint, schema, permissions)
├── <Resource>ListPage.tsx             top-level UI — list view that mounts dialogs
├── components/<Name>/                 list widgets (Table, Filters, EmptyState)
├── forms/<Name>Form/                  reusable forms (used by dialogs)
├── dialogs/<Name>Dialog/              URL-driven action dialogs
├── create/                            → /<resource>/create
│   └── create.route.tsx               (renders null; list page reads URL + opens dialog)
└── $<resource>Id/                     → /<resource>/[id]   (show — full-name $param folder)
    └── edit/                          → /<resource>/[id]/edit  (renders null; list opens dialog)
```

CRUD UX mapping:

| Action | URL                     | Renders                      |
| ------ | ----------------------- | ---------------------------- |
| List   | `/<resource>`           | Page                         |
| Create | `/<resource>/create`    | Dialog over list             |
| Show   | `/<resource>/[id]`      | Page or dialog               |
| Edit   | `/<resource>/[id]/edit` | Dialog over list             |
| Delete | (no URL)                | Inline `AlertDialog` confirm |

Dialogs are **URL-driven** — the parent list page reads `useRouterState` to know which dialog (if any) to open.

## Tests

| Test type                                  | Location                                                                          |
| ------------------------------------------ | --------------------------------------------------------------------------------- |
| Unit (component, hook, form, store)        | Colocated `<Name>.test.{ts,tsx}` next to source                                   |
| Cross-component integration in this island | `__tests__/integration/`                                                          |
| Browser E2E (full app)                     | Project `tests/e2e/` (Playwright) — document flows in island `<PAGE>.OVERVIEW.md` |

**No test required for:** `<page>.route.tsx`, `<page>.page.ts`, `<page>.contracts.ts`, `<PAGE>.OVERVIEW.md`, `index.ts` (barrel).

Vitest picks up `src/**/*.test.{ts,tsx}` AND `src/**/__tests__/**/*.test.{ts,tsx}` via the include glob.

## Index redirects (layout islands)

When `kind: 'layout'` with children, the index route redirects to the default child:

```ts
const indexRoute = createRoute({
  getParentRoute: () => parentRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/<parent>/<default-child>' });
  },
  component: () => null,
});
```

Established cases: `/settings` → `/settings/profile`, `/settings/organization` → `/settings/organization/general`.

## Import boundaries

| Allowed                                   | Forbidden                                                         |
| ----------------------------------------- | ----------------------------------------------------------------- |
| Same island (`./components/`, `./hooks/`) | Other `pages/<feature>/`                                          |
| `@/core/*`, `@/shared/*`, `@/lib/*`       | Sibling child islands' `<page>.api.ts` (each child owns its data) |
| `@/tests/utils/*` from `__tests__/`       | Parent's `api.ts` from children (children fetch independently)    |

## AI workflow (every new island)

1. **Read** `<PAGE>.OVERVIEW.md` (or create it) + the parent's `<page>.page.ts` if nested.
2. **Create files** in order: `<PAGE>.OVERVIEW.md` → `<page>.page.ts` → `<page>.contracts.ts` → `<page>.api.ts` → `<Page>Page.tsx | <Page>Layout.tsx` → `<page>.route.tsx`.
3. **Add components/hooks/forms** under `components/<Name>/`, `hooks/use<Name>/`, `forms/<Name>Form/` — each a folder with `<Name>.{tsx,ts}` + `<Name>.test.{tsx,ts}` + `index.ts`.
4. **Register lazy route** in [`src/app/routes/routeTree.tsx`](../../../src/app/routes/routeTree.tsx): `import('@/pages/<name>/<name>.route.tsx').then(m => ({ default: m.Component }))`.
5. **Update test-id inventory:** [`docs/reference/e2e-testids-inventory.md`](../../../docs/reference/e2e-testids-inventory.md).

## Related

- [`agent-os/rules/file-structure.mdc`](../../rules/file-structure.mdc) — canonical contract
- [`agent-os/skills/page-scaffolding/SKILL.md`](../page-scaffolding/SKILL.md) — step-by-step new-page workflow
- [`agent-os/skills/code-structure/SKILL.md`](../code-structure/SKILL.md) — where each file goes
- [`agent-os/skills/component-promotion/SKILL.md`](../component-promotion/SKILL.md) — moving to shared
- [`agent-os/skills/test-generation/SKILL.md`](../test-generation/SKILL.md) — test conventions
- [`docs/reference/route-island-structure.md`](../../../docs/reference/route-island-structure.md) — reference
