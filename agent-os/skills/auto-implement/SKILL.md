---
name: auto-implement
description: Master orchestrator skill. The user provides a requirement — everything else (parsing, implementation, tests, lint, type-check, route registration, RBAC, docs, data-testid) happens automatically in the background. The user never needs to ask for any dependent task.
---

# Auto-Implement — Full Pipeline from Requirement to Production

This is the **master skill** that orchestrates all other skills. When the user gives a requirement, the agent reads this skill and follows it end-to-end. The user provides **only** the requirement — everything else runs in the background without asking.

---

## What the User Provides

A requirement in one of these forms:

### Option A — Standard format (recommended for features)

The template from `docs/getting-started/requirement-format.md`:

```markdown
## Requirement

### What

[One-line goal]

### Where

[Layer + path: "New page at /notifications", "New shared component", etc.]

### Acceptance criteria

- [ ] [Criterion 1]
- [ ] [Criterion 2]

### Data / API (if applicable)

- **Endpoint(s):** GET /api/…
- **Response shape:** { id, title, … }
- **Permissions:** domain.action

### UI / Behavior (if applicable)

- **Layout:** AppLayout
- **Forms/inputs:** ...
- **Actions:** ...
- **Validation / errors:** ...

### Constraints

- Use apiClient, `<page>.route.tsx` convention, accessible

### Out of scope (optional)

- [What we're NOT doing]
```

**Filled example:** `docs/getting-started/requirements/sample-requirement.md`

**Requirement intake overview (types, skills, rules):** docs/getting-started/requirement-intake.md

### Option B — Short request (for small tasks)

A clear sentence like: "Add a delete button to the organizations table that calls DELETE /api/organizations/:id and requires organizations.delete permission."

### Option C — Vague or feature-sized request

If the user gives something like "we need notifications" or "add billing", the agent asks for the standard format **once** (providing the template), then implements once received.

---

## What the Agent Does Automatically (Background Pipeline)

Once the user provides a requirement (Option A or B), the agent runs **all** of the following without asking for confirmation on any step. The user never sees "Do you want me to add tests?" or "Should I register the route?".

### Phase 1 — Parse & Plan

1. **Parse the requirement** — extract What, Where, Acceptance criteria, Data/API, UI/Behavior, Constraints, Out of scope.
2. **Map to codebase layers** — decide which directories and files to create or modify (pages, shared, core, lib, stores).
3. **Identify skills to chain** — typically: code-structure → page-scaffolding (if new page) → test-generation → lint-guard. Read the most specific skill first.

### Phase 2 — Implement

1. **Follow code-structure skill** (`agent-os/skills/code-structure/SKILL.md`):
   - Place files in the correct layer per the dependency rule.
   - New pages get: `<page>.route.tsx`, `<page>.manifest.ts`, `<Page>Page.tsx`, `<page>.contracts.ts`, `<page>.api.ts`, `hooks/use<X>/`, `components/<Name>/`, `forms/<Name>Form/` (sub-units are folder-per-unit with `index.ts`).
   - Zod schemas in `<page>.contracts.ts`; API functions using `apiClient` in `<page>.api.ts`.
   - TanStack Query hooks in `hooks/use<Name>/use<Name>.ts`.

2. **Follow page-scaffolding skill** (`agent-os/skills/page-scaffolding/SKILL.md`) if creating a new page:
   - Scaffold all standard files.
   - Add `data-testid` attributes on all interactive elements.
   - Use the correct layout (AppLayout, AuthLayout, etc.).

2b. **Follow routing-tenancy skill** (`agent-os/skills/routing-tenancy/SKILL.md`) when the route is org-scoped or touches guards:

- Wire `gatewayFromManifest(manifest)` in `routeTree.tsx`.
- Apply tenancy guard chain from `GUARDS.OVERVIEW.md`.
- Register in `docs/reference/routes-and-ui.md`.

2c. **Follow resource-crud skill** (`agent-os/skills/resource-crud/SKILL.md`) when the requirement is a backend resource:

- List page + URL-driven dialogs, `$param` folders, `<resource>.resource.ts`, L7 bootstrap.

2d. **Follow http-forms-errors skill** (`agent-os/skills/http-forms-errors/SKILL.md`) when forms call APIs:

- `mapValidationErrors` on 422; `RateLimitNotice` for 429; `QueryBoundary` on read panels.

2e. **Follow platform-hygiene skill** (`agent-os/skills/platform-hygiene/SKILL.md`) when env/platform config changes:

- Chain `env-schema-add` for new keys; run `validate:vite-env`, `validate:client-env`, `knip`.

3. **Register route** in `src/app/routes/routeTree.tsx`:
   - Lazy import: `lazy: () => import('@/pages/<name>/<name>.route.tsx').then((m) => ({ default: m.Component }))`.
   - Wrap with `<ProtectedRoute>` if the page is protected.

4. **Add RBAC permissions** in `src/core/rbac/policies.ts`:
   - If the requirement specifies permission names (e.g. `notifications.read`), add them.
   - If not specified but the page is protected, infer from the page name (e.g. `<name>.read`, `<name>.write`).
   - Enforce RBAC in `routeTree.tsx` `beforeLoad` via `gatewayFromManifest(manifest)` (not an island `loader()` export).

### Phase 3 — Test

1. **Follow test-generation skill** (`agent-os/skills/test-generation/SKILL.md`):
   - Create colocated test files for every new component, hook, service, and page.
   - Include `vitest-axe` accessibility checks (`toHaveNoViolations()`); dialogs use `axeForDialog`.
   - Use `data-testid` on test contracts; run `pnpm validate:testids` when adding pages/forms.
   - For user flows spanning routes, add `tests/e2e/<feature>.e2e.test.ts` per **playwright-e2e** skill (hybrid selectors).
   - Skip test files for exceptions: `<page>.route.tsx`, `<page>.manifest.ts`, `<page>.contracts.ts`, `<page>.constants.ts`, `types.ts`, `index.ts` (barrel), `<PAGE>.OVERVIEW.md`.

2. **Run tests** (mentally or via terminal) — ensure no regressions.

### Phase 4 — Lint & Type-check

1. **Follow lint-guard skill** (`agent-os/skills/lint-guard/SKILL.md`):
   - Fix all ESLint errors (nested ternaries, purity, import ordering, type imports, etc.).
   - Fix all TypeScript errors (`tsc --noEmit`).
   - If a new pattern needs an ESLint override, add it to `eslint.config.mjs` (not inline disables).
   - Ensure `pnpm lint` and `pnpm type-check` pass with zero errors.

### Phase 5 — Documentation

1. **Update docs if structure changed**:
   - `README.md` — if routes, scripts, or architecture sections are affected.
   - `CLAUDE.md` — if env paths, architecture, or conventions changed.
   - Do not ask "Should I update the README?" — just update if relevant.

### Phase 6 — Verify Acceptance Criteria

1. **Check each acceptance criterion** from the requirement against the implementation:
   - List implemented? Empty state? Loading/error states? Actions? Permissions?
   - If a criterion is **not met**, implement it now.
   - Report a brief summary of what was built and how each criterion was satisfied.

---

## Pipeline Summary

```text
User provides requirement
        │
        ▼
  ┌─────────────┐
  │ 1. Parse     │  Extract What / Where / Criteria / API / UI
  └──────┬──────┘
         ▼
  ┌─────────────┐
  │ 2. Implement │  code-structure + page-scaffolding
  └──────┬──────┘
         ▼
  ┌─────────────┐
  │ 3. Route +   │  Register in routes/routeTree.tsx
  │    RBAC      │  Add permissions in policies.ts
  └──────┬──────┘
         ▼
  ┌─────────────┐
  │ 4. Test      │  test-generation (colocated, axe, data-testid)
  └──────┬──────┘
         ▼
  ┌─────────────┐
  │ 5. Lint +    │  lint-guard (ESLint 0 errors, tsc 0 errors)
  │    Types     │
  └──────┬──────┘
         ▼
  ┌─────────────┐
  │ 6. Docs      │  README / CLAUDE.md if affected
  └──────┬──────┘
         ▼
  ┌─────────────┐
  │ 7. Verify    │  Each acceptance criterion met
  └─────────────┘
         ▼
    Done — user sees clean result
```

---

## Rules

- **Never ask** "Do you want tests?", "Should I register the route?", "Do you need RBAC?", "Should I update docs?" — the answer is always yes.
- **Only ask** when a required piece of information is genuinely missing and cannot be inferred (e.g. the user says "add a page" but doesn't specify the URL path and it can't be inferred from context).
- **Infer defaults** when possible: protected route, AppLayout, permission name from page name.
- **Fix everything before responding**: the user should see clean code, passing lint, passing types, and colocated tests — not a follow-up question.

---

## Skills Chained by This Orchestrator

| Order | Skill              | Path                                          | What it handles                                         |
| ----- | ------------------ | --------------------------------------------- | ------------------------------------------------------- |
| 1     | code-structure     | `agent-os/skills/code-structure/SKILL.md`     | File placement, dependency rules, import conventions    |
| 2     | page-scaffolding   | `agent-os/skills/page-scaffolding/SKILL.md`   | Full page directory: route, page, contracts, api, hooks |
| 3     | test-generation    | `agent-os/skills/test-generation/SKILL.md`    | Colocated tests, vitest-axe, data-testid                |
| 4     | lint-guard         | `agent-os/skills/lint-guard/SKILL.md`         | ESLint 0 errors, TypeScript 0 errors, common fixes      |
| 5     | requirement-format | `agent-os/skills/requirement-format/SKILL.md` | Requirement parsing and format template                 |

Additional skills invoked when relevant:

- **routing-tenancy** — org-scoped routes, guard chains, gateway, session context
- **resource-crud** — backend resource list + URL-driven CRUD dialogs
- **http-forms-errors** — mutation error mapping, QueryBoundary read paths
- **platform-hygiene** — env read paths, knip, vite-env / client-env validators
- **env-schema-add** — add/rename/remove env keys (chains from platform-hygiene)
- **component-promotion** — when a component needs to move to `shared/`
- **composition-patterns** — when building complex component APIs
- **react-best-practices** — when optimizing performance
- **web-design-guidelines** — when auditing UI/UX
- **code-quality-security** — when modifying ESLint, Husky, or CI config

---

## Related Rules (Always Active)

| Rule                   | What it enforces                                  |
| ---------------------- | ------------------------------------------------- |
| `agent-behavior`       | Never ask for confirmation on dependent tasks     |
| `skill-router`         | Auto-route to correct skill based on task pattern |
| `testing-requirements` | Tests auto-generated on every source file change  |
| `project-conventions`  | Architecture, imports, state management           |
| `file-structure`       | Directory layout, route.tsx convention            |

---

## Quick Reference: What the User Gets

The user writes:

> "Here's my requirement: [What / Where / Acceptance criteria / ...]"

The user receives (in one response, no follow-up questions):

- All source files created/modified in the correct layers
- Route registered and lazy-loaded
- RBAC permissions added (if protected)
- Colocated tests with accessibility checks
- Zero lint errors, zero type errors
- Docs updated if structure changed
- Summary of acceptance criteria and how each was satisfied
