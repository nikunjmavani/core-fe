# Route island structure

Self-contained folders under `pages/<page-name>/` with page-prefixed role files, folder-per-unit sub-units, **`sub-pages/`** for nested routes, **`<page>.page.ts`** for the layout/leaf manifest, and colocated tests.

**Rule (contract):** [`agent-os/rules/file-structure.mdc`](../../agent-os/rules/file-structure.mdc)
**Skill (workflow):** [`agent-os/skills/route-island/SKILL.md`](../../agent-os/skills/route-island/SKILL.md)
**Template:** [`docs/getting-started/route-island-template.md`](../getting-started/route-island-template.md)

---

## Canonical tree

```text
pages/<page-name>/
├── OVERVIEW.md                        REQUIRED — AI/human entry doc
├── <page>.route.tsx                   REQUIRED — Lazy boundary
├── <page>.page.ts                     REQUIRED — Manifest (path, RBAC, testId, kind, children)
├── <Page>Page.tsx                     REQUIRED when kind: leaf — top-level UI
├── <Page>Layout.tsx                   REQUIRED when kind: layout — top-level UI + <Outlet />
├── <page>.contracts.ts                OPTIONAL — Zod schemas
├── <page>.api.ts                      OPTIONAL — fetchers
├── <page>.search.ts                   OPTIONAL — URL search-params schema
├── <page>.fixtures.ts                 OPTIONAL — mocks (REPLACE_WITH_API)
├── <page>.constants.ts                OPTIONAL
├── <page>.resource.ts                 OPTIONAL — resource manifest (resource pages only)
├── store/use<X>Store/                 RARE — page-local Zustand (folder-per-unit + index.ts)
├── components/<Name>/                 folder-per-unit: <Name>.tsx + .test.tsx + index.ts
├── forms/<Name>Form/                  folder-per-unit
├── hooks/use<Name>/                   folder-per-unit
├── dialogs/<Name>Dialog/              folder-per-unit (resource pages)
├── __tests__/integration/             cross-component flows in this island
└── sub-pages/
    └── <sub-page-name>/               full recursive copy of this tree
```

**No `sub-pages/`** when `kind: 'leaf'` and `children: []`.

---

## Naming summary

| Category                      | Style                                  | Example                                                        |
| ----------------------------- | -------------------------------------- | -------------------------------------------------------------- |
| Role files (single-per-page)  | `<page>.<role>.<ext>` lowercase-dotted | `dashboard.route.tsx`, `dashboard.page.ts`, `dashboard.api.ts` |
| Identity doc                  | UPPERCASE                              | `OVERVIEW.md`                                                  |
| Top-level UI                  | PascalCase, page-prefixed              | `DashboardPage.tsx`, `OrganizationLayout.tsx`                  |
| Sub-units                     | PascalCase, no prefix                  | `ActivityFeed/`, `LoginForm/`, `useDashboard/`                 |
| shadcn primitives (exception) | flat lowercase                         | `shared/components/ui/button.tsx`                              |

---

## `<page>.page.ts` (layout + leaf manifest)

| Field        | Role                                                             |
| ------------ | ---------------------------------------------------------------- |
| `segment`    | URL segment; child folder name under `sub-pages/`                |
| `path`       | Full URL                                                         |
| `testId`     | Root `data-testid` for the page container                        |
| `permission` | RBAC for the route's loader; `null` if just auth-gated           |
| `kind`       | `'layout'` (renders `<Outlet />` + has `sub-pages/`) or `'leaf'` |
| `children`   | Sub-pages segments — disk: `sub-pages/<segment>/`                |

```ts
import type { PageManifest } from '@/lib/route-island/page-manifest.ts';

export const page = {
  segment: 'organization',
  path: '/organization',
  testId: 'organization-page',
  permission: 'organization:read',
  kind: 'layout',
  children: ['general', 'members', 'invitations', 'roles', 'api-keys', 'billing'],
} as const satisfies PageManifest;
```

---

## Folder-per-unit + barrel

Every component/form/hook/dialog/store:

```
<Name>/
├── <Name>.tsx                          source
├── <Name>.test.tsx                     colocated unit test
└── index.ts                            export { <Name> } from './<Name>.tsx';
```

Imports stay clean: `from '@/pages/dashboard/components/ActivityFeed'`.

**Exception:** shadcn primitives in `shared/components/ui/` stay flat.

---

## Resource pages — URL-driven CRUD

Resources (organizations, members, roles, etc.) add a CRUD specialization:

```
pages/<resource>/
├── <resource>.route.tsx                 parent route — renders the list
├── <resource>.page.ts                   kind: 'layout', children: ['create', '$id', '$id-edit']
├── <resource>.resource.ts               resource manifest
├── <Resource>ListPage.tsx               top-level UI — mounts the dialogs
├── components/, forms/, hooks/          folder-per-unit
├── dialogs/                             URL-driven action dialogs (folder-per-unit)
│   ├── Create<Resource>Dialog/
│   ├── Edit<Resource>Dialog/
│   └── Delete<Resource>Dialog/          optional — usually inline AlertDialog
└── sub-pages/
    ├── create/create.route.tsx          → /<resource>/create   (renders null; list opens dialog)
    ├── $id/$id.route.tsx                → /<resource>/[id]     (show)
    └── $id-edit/$id-edit.route.tsx      → /<resource>/[id]/edit  (edit)
```

URL ↔ action mapping:

| Action | URL                     | Renders              |
| ------ | ----------------------- | -------------------- |
| List   | `/<resource>`           | Page                 |
| Create | `/<resource>/create`    | Dialog over list     |
| Show   | `/<resource>/[id]`      | Page or dialog       |
| Edit   | `/<resource>/[id]/edit` | Dialog over list     |
| Delete | (no URL)                | Inline `AlertDialog` |

---

## Index redirects (layout islands)

When `kind: 'layout'` with children, the index route (`/`) redirects to the default child via `beforeLoad`:

```ts
const indexRoute = createRoute({
  getParentRoute: () => parentRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/parent/default-child' });
  },
  component: () => null,
});
```

Established cases:

- `/settings` → `/settings/profile`
- `/settings/organization` → `/settings/organization/general`

---

## Tests

| Test type                                  | Location                                        |
| ------------------------------------------ | ----------------------------------------------- |
| Unit (component, hook, form, store)        | Colocated `<Name>.test.{ts,tsx}` next to source |
| Cross-component integration in this island | `__tests__/integration/`                        |
| Browser E2E (full app, cross-page)         | Project `tests/e2e/` (Playwright)               |

**No test required for:** `<page>.route.tsx`, `<page>.page.ts`, `<page>.contracts.ts`, `OVERVIEW.md`, `index.ts` (barrel).

Vitest globs cover both `src/**/*.test.{ts,tsx}` and `src/**/__tests__/**/*.test.{ts,tsx}`.

---

## Examples

| Island                   | Path                                        | Notes                                      |
| ------------------------ | ------------------------------------------- | ------------------------------------------ |
| Dashboard                | `src/pages/dashboard/`                      | Leaf — top-level UI is `DashboardPage.tsx` |
| Organization hub         | `src/pages/organization/`                   | Layout — children in `sub-pages/`          |
| Members sub-page         | `src/pages/organization/sub-pages/members/` | Leaf under a layout                        |
| Organizations (resource) | `src/pages/organizations/`                  | Resource — list + URL-driven dialogs       |

---

## Imports

- **Allowed:** same island, `@/core/*`, `@/shared/*`, `@/lib/*`, `@/tests/utils/*` (from tests)
- **Forbidden:** other page islands, sibling sub-page `<page>.api.ts`, parent's `<page>.api.ts` from children (children fetch independently)
