# Pull request review (core-fe)

**Authors:** use the PR template and run `pnpm health` (or wait for CI).  
**Reviewers:** use this rubric with [engineering-principles](../../agent-os/rules/engineering-principles.mdc) PR review mode.

## At a glance

| Item                    | Reference                                                            |
| ----------------------- | -------------------------------------------------------------------- |
| **Required CI**         | `.github/workflows/pr-ci.yml` — aggregate **Quality gate**           |
| **Author gate (local)** | `pnpm health` or `/ci-local` command                                 |
| **Route contract**      | `docs/reference/routes-and-ui.md` + `pnpm validate:structure`        |
| **Severity**            | **Blocker** = must fix · **Major** = should fix · **Nit** = optional |

## Architecture

| Check                | What to look for                                                  | Severity |
| -------------------- | ----------------------------------------------------------------- | -------- |
| Page isolation       | No `pages/A` importing `pages/B`                                  | Blocker  |
| Dependency direction | `ui → lib → core → shared → pages → app`                          | Blocker  |
| Server state         | TanStack Query for API data — not Zustand                         | Major    |
| Route island         | New routes have manifest, route, OVERVIEW, routeTree registration | Blocker  |

## UI & tokens

| Check           | What to look for                                                                                    | Severity |
| --------------- | --------------------------------------------------------------------------------------------------- | -------- |
| shadcn sources  | Components from allowed sources only                                                                | Major    |
| Semantic tokens | No raw palette classes (`bg-blue-500`, `text-white`)                                                | Blocker  |
| Dark surfaces   | Icons on `bg-brand` / `bg-sidebar` / `bg-primary` use foreground tokens (`src/lib/icon-surface.ts`) | Major    |
| Tests           | Colocated `*.test.ts(x)` on new units                                                               | Major    |

## Security

| Check   | What to look for                                    | Severity |
| ------- | --------------------------------------------------- | -------- |
| Secrets | No tokens in diff; Gitleaks clean                   | Blocker  |
| Auth    | Tokens in memory only; no localStorage session      | Blocker  |
| RBAC    | Protected routes use `requirePermission` in loaders | Blocker  |
