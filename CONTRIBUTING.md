# Contributing to Core Frontend

This document is for **humans** working on the project. It explains how the repo is organized, what documentation exists, how AI assistance is configured, and what you can expect to happen automatically.

---

## Documentation You Need

| Document                                                    | Purpose                                                                                                                                            |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **README.md**                                               | Quick start, scripts, code structure, third-party libs, env vars, architecture, how to request changes from AI.                                    |
| **CLAUDE.md**                                               | Single source of truth for conventions: architecture, route marker, imports, state, styling, auth, testing. Read before making changes.            |
| **CONTRIBUTING.md** (this file)                             | For humans: where things live, what runs automatically, how to work with the codebase and with AI.                                                 |
| **docs/getting-started/requirement-format.md**              | Standard format for writing feature requirements (template + field guide). Use so the AI can implement in one pass.                                |
| **docs/getting-started/requirements/sample-requirement.md** | Filled example of the requirement format (Notifications page).                                                                                     |
| **.env.example**                                            | Reference for all environment variables; copy to `.env.local` for local overrides.                                                                 |
| **agent-os/docs/cursor-mcp-setup.md**                       | **Onboarding (Cursor users):** Set up MCP locally (Context7, shadcn, Tailwind, core-be-api). Required for AI assistance with docs and backend API. |

---

## Running the Project

- **Where:** All commands from **project root** (the directory containing `package.json`).
- **Install:** `pnpm install`
- **Dev:** `pnpm dev` → app at http://localhost:5173
- **Scripts:** See the "Where to Run & Scripts" table in **README.md**.

---

## Code Structure (Quick Reference)

- **`src/app/`** — Route config, guards, providers, error boundaries.
- **`src/core/`** — Auth, HTTP, RBAC, tenancy, config (no React components).
- **`src/pages/<name>/`** — One directory per route: `route.tsx`, `<Name>Page.tsx`, `contracts.ts`, `api.ts`, `hooks/`, `components/`, `forms/`.
- **`src/shared/`** — Reusable UI, layouts, forms, hooks (used by 2+ page groups).
- **`src/lib/`** — Pure utilities (e.g. `cn()`). **`src/stores/`** — Zustand (theme, UI).

**Rule:** `shared` ← `pages` ← `core`. Pages never import from other pages.

Full layout and diagrams are in **README.md** and **CLAUDE.md**.

---

## Cursor Rules and Skills (AI Behavior)

The project uses **Cursor rules** (`agent-os/rules/*.mdc`) and **skills** (`agent-os/skills/*/SKILL.md`) so that AI assistance follows project conventions and completes dependent work **without asking you**.

**Onboarding (Cursor users):** Set up MCP locally so the AI can use Context7, shadcn, Tailwind, and the backend API. See **[agent-os/docs/cursor-mcp-setup.md](agent-os/docs/cursor-mcp-setup.md)** for step-by-step instructions.

### Always-active rules

These are applied automatically (no need to mention them):

- **project-conventions.mdc** — Architecture, imports, state, file conventions.
- **file-structure.mdc** — Route marker, page directory shape, dialog vs full page.
- **context7-libraries.mdc** — Use Context7 MCP for up-to-date library docs.
- **skill-router.mdc** — Routes your request to the right skill; complete all steps without asking.
- **agent-behavior.mdc** — Complete tests, route registration, RBAC, docs as part of the work; never ask "Do you want me to add tests?" etc.
- **testing-requirements.mdc** — Auto-generate colocated tests when creating/changing source files; no user confirmation.

### Skills (invoked by task type)

When you ask for something (e.g. "add a settings page"), the **skill-router** matches your request to a skill. The master **auto-implement** skill orchestrates the full pipeline: parse requirement → implement → route → RBAC → test → lint → docs → verify. Everything happens **without asking** "Do you need tests?" or "Should I register the route?"

| You say / do                                   | Skill used                       | What gets done (no confirmation asked)                                                                               |
| ---------------------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Any requirement** (feature, page, component) | **auto-implement** (master)      | Full pipeline: code-structure → page-scaffolding → test-generation → lint-guard → docs → verify acceptance criteria. |
| Add a page, implement a feature                | code-structure, page-scaffolding | Placement, route.tsx, page, contracts, api, hooks, **tests**, route registration, RBAC if protected, data-testid.    |
| Add a new component/file under src/            | test-generation                  | Colocated test file created automatically.                                                                           |
| Move component to shared                       | component-promotion              | Move file + test, update imports; create test if missing.                                                            |
| Optimize performance, re-renders               | react-best-practices             | Applied during implementation.                                                                                       |
| UI review, accessibility                       | web-design-guidelines            | Review against a11y/form/typography rules.                                                                           |
| Lint/CI/security changes                       | code-quality-security            | Consistency with existing pipeline.                                                                                  |
| _(after every code change)_                    | **lint-guard** (auto)            | Fix all ESLint + TypeScript errors silently before responding.                                                       |

Full skill list and triggers: **agent-os/skills/skill-registry/SKILL.md**.

---

## What Happens Without You Asking

When you request a change, the agent runs the **auto-implement** pipeline:

1. **Parse your requirement** — extract What, Where, Acceptance criteria, API, UI, Constraints.
2. **Implement** — place code in the correct layer, scaffold pages, create components/hooks/forms.
3. **Register routes** in `src/app/routes/routeTree.tsx` and add **RBAC** in `src/core/rbac/policies.ts`.
4. **Add or update tests** — colocated test files with vitest-axe and data-testid.
5. **Fix lint + types** — lint-guard ensures zero ESLint errors and zero TypeScript errors.
6. **Update docs** — README.md / CLAUDE.md when the change affects structure or conventions.
7. **Verify acceptance criteria** — each criterion checked before responding.

**None of these steps require confirmation.** The user provides only the requirement.

If you ever see the agent asking for confirmation on tests, routes, RBAC, lint, or docs, point it to **agent-os/rules/agent-behavior.mdc** and **agent-os/skills/auto-implement/SKILL.md**.

---

## How to Request Changes (For Best Results)

### For features or multi-part work: use the requirement format

Use the **standard requirement format** so the agent has everything in one place and implements without back-and-forth:

1. **Template and field guide:** [docs/REQUIREMENT_FORMAT.md](docs/REQUIREMENT_FORMAT.md) — copy the template and fill in: What, Where, Acceptance criteria, Data/API, UI/Behavior, Constraints (and optional Out of scope).
2. **Filled example:** [docs/requirements/sample-requirement.md](docs/requirements/sample-requirement.md) — sample "Notifications page" requirement.

Paste your filled requirement into the chat. The agent will parse it and implement fully (tests, route registration, RBAC) without asking. If you give a vague request (e.g. "we need notifications"), the agent will ask you to use this format and point you to the template and sample.

### For small, single-step requests

Be specific about **what** and **where**; the agent will infer the rest and complete dependent tasks.

- **Good:** "Add a notifications page at /notifications with a list and mark-all-read button."
- **Good:** "Add a Settings page with profile form (name, email) and theme toggle."

For a short template and more examples, see "How to Request Changes (Best Format for AI)" in **README.md**.

---

## Adding a New Page (Manual Checklist)

If you prefer to do it yourself or verify after AI:

1. Create `src/pages/<name>/` with `route.tsx`, `<Name>Page.tsx`, `contracts.ts`, `api.ts`, `hooks/`, `components/`, `forms/` as needed.
2. Register the route in `src/app/routes/routeTree.tsx` (lazy import).
3. Add permissions in `src/core/rbac/policies.ts` if the route is protected.
4. Add colocated tests (see **agent-os/rules/testing-requirements.mdc** and **agent-os/skills/test-generation/SKILL.md**).
5. Use `data-testid` per the convention in testing-requirements.

---

## Testing

- **Unit/integration:** `pnpm test` (Vitest). Tests are colocated (e.g. `Button.test.tsx` next to `Button.tsx`).
- **E2E:** `pnpm test:e2e` (Playwright).
- **Coverage:** `pnpm test:coverage`. Thresholds are in `vitest.config.ts`.

Component tests must include **vitest-axe** accessibility checks. See **agent-os/skills/test-generation/SKILL.md** for templates.

---

## Summary

- **README.md** and **CLAUDE.md** are the main docs; **CONTRIBUTING.md** is for humans working on the project.
- **Rules and skills** in `agent-os/rules/` and `agent-os/skills/` drive AI behavior and are **invoked automatically** when your request matches.
- The **auto-implement** skill is the master pipeline: requirement → implement → route → RBAC → test → lint → docs → verify. All dependent tasks (tests, routes, RBAC, lint, docs) are completed **without asking you**.
- **You provide only the requirement.** Everything else is handled in the background.
