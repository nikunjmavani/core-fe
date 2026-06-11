---
name: skill-registry
description: Master catalog of all project skills with trigger scenarios, file locations, and decision guidance. Use when the user asks "which skill should I use", "list skills", "what skills exist", "how do I do X", or needs help finding the right approach for a task.
---

# Skill Registry

Complete inventory of project skills. Use this to find the right skill for any task.

## Decision Tree

**"I want to..."**

- ...implement any requirement / build a feature end-to-end (master pipeline) -> **auto-implement** (orchestrates all other skills)
- ...implement a requirement / add a feature / know where to put code -> **code-structure**
- ...submit a requirement in standard format / request is vague or feature-sized -> **requirement-format**
- ...create a new page/route -> **page-scaffolding**
- ...move a component to shared -> **component-promotion**
- ...optimize React performance -> **react-best-practices**
- ...review UI accessibility/design -> **web-design-guidelines**
- ...refactor component API/props -> **composition-patterns**
- ...add lint rules/security checks/CI -> **code-quality-security**
- ...understand commit checks / fix pre-commit failures / run before-commit guard -> **before-commit-guard**
- ...fix lint/type errors after implementation -> **lint-guard** (auto-invoked, never needs user ask)
- ...check/fix code smells and best practices on new or changed code -> **code-smells-best-practices** (live code only)
- ...add tests/write tests/coverage -> **test-generation**
- ...E2E test ids / data-testid / Playwright selectors -> **e2e-testids**
- ...route island / self-contained path / nested sub-route folder -> **route-island**
- ...recommend extensions, IDE setup, productivity, workspace settings -> **extension-settings-recommendations**
- ...add/change docs, where to document, keep README/CLAUDE in sync -> **documentation-maintenance**
- ...run a full project health check / verify everything works after major changes -> **project-health-check**
- ...run full code review / generate code review report -> **full-code-review**
- ...add/style/compose a shadcn component, run the shadcn CLI, choose a component -> **shadcn** (`agent-os/skills/shadcn/SKILL.md`)
- ...make a UI distinctive/polished/beautiful -> **frontend-design** (`agent-os/skills/frontend-design/SKILL.md`) within project guardrails
- ...look up design intelligence (styles, palettes, font pairings, UX/stack/chart guidelines) -> **ui-ux-pro-max** (`agent-os/skills/ui-ux-pro-max/SKILL.md`), advisory only
- ...find/install a skill that doesn't exist yet -> **find-skills** (`agent-os/skills/find-skills/SKILL.md`)

## Task → Required Skills (read in this order)

For each common task, the skills below are required/auto-invoked. `auto-implement` orchestrates the starred (★) chain; `lint-guard` + `code-smells-best-practices` run after **any** code change; `documentation-maintenance` runs when routes/features/docs change.

| Task                                                      | Required skills (in order)                                                                                                                                                                                                  |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Implement a feature / requirement (end-to-end)**        | auto-implement ★ → requirement-format (if vague) → code-structure → page-scaffolding (if new route) → shadcn + frontend-design (UI) → test-generation → lint-guard → code-smells-best-practices → documentation-maintenance |
| **New page / route / sub-route**                          | route-island → page-scaffolding → code-structure → shadcn (UI) → test-generation → e2e-testids → lint-guard → documentation-maintenance                                                                                     |
| **New / changed UI component**                            | shadcn (add/compose) → frontend-design (craft) → ui-ux-pro-max (guidance, advisory) → web-design-guidelines (a11y) → composition-patterns (API) → test-generation → lint-guard                                              |
| **Design decision (style/palette/font/chart)**            | ui-ux-pro-max (query DB, advisory) → frontend-design (direction) → shadcn (tokens/components) — never override neutral tokens/brand without user ask                                                                        |
| **Add/choose a shadcn component or run the CLI**          | shadcn (single skill: CLI + critical rules + 20 allowed sources)                                                                                                                                                            |
| **Style / beautify / restyle existing UI**                | frontend-design (within tokens/brand) → shadcn (primitives) → web-design-guidelines (a11y) → lint-guard                                                                                                                     |
| **Build a form**                                          | shadcn (Field/FieldGroup/InputGroup) → code-structure (contracts.ts + react-hook-form + zod) → web-design-guidelines → test-generation → lint-guard                                                                         |
| **Data table / list / filters**                           | shadcn (Table + DataTable) → react-best-practices (perf) → web-design-guidelines → test-generation → lint-guard                                                                                                             |
| **Promote a component to shared/**                        | component-promotion → code-structure → test-generation → lint-guard                                                                                                                                                         |
| **Refactor a component API / remove boolean-prop sprawl** | composition-patterns → react-best-practices → test-generation → lint-guard                                                                                                                                                  |
| **Fix React performance / re-renders / bundle size**      | react-best-practices → lint-guard                                                                                                                                                                                           |
| **Add or update tests**                                   | test-generation → lint-guard                                                                                                                                                                                                |
| **E2E selectors / data-testid on UI**                     | e2e-testids → test-generation (unit tests) → lint-guard                                                                                                                                                                     |
| **Accessibility / UX audit**                              | web-design-guidelines (→ frontend-design if visual polish also needed)                                                                                                                                                      |
| **Lint / type-check failures**                            | lint-guard (then code-quality-security if config changes)                                                                                                                                                                   |
| **Code smells on changed code**                           | code-smells-best-practices → lint-guard                                                                                                                                                                                     |
| **ESLint / Husky / CI / security pipeline change**        | code-quality-security → before-commit-guard                                                                                                                                                                                 |
| **Before committing**                                     | before-commit-guard (env docs, assets, format, lint, types)                                                                                                                                                                 |
| **Docs change / new route affecting README/CLAUDE**       | documentation-maintenance                                                                                                                                                                                                   |
| **Extensions / IDE setup / new tooling**                  | extension-settings-recommendations                                                                                                                                                                                          |
| **Full project health check**                             | project-health-check (chains docs, tests, lint, build, bundle)                                                                                                                                                              |
| **Full code review report**                               | full-code-review                                                                                                                                                                                                            |
| **"Which skill do I use?"**                               | skill-registry (this file)                                                                                                                                                                                                  |
| **"Is there a skill for X?" / capability missing**        | find-skills (discover + install, then wire into router/registry/docs)                                                                                                                                                       |

> If a task has **no** matching row here or in `skill-router.mdc`, use **find-skills** to look for one before building from scratch; if none exists, proceed with general capabilities.

## Skill Inventory

### 0a. auto-implement (Master Orchestrator)

**Path:** `agent-os/skills/auto-implement/SKILL.md`
**Purpose:** The master skill that runs the full pipeline from requirement to production-ready code. The user provides only a requirement (standard format, short sentence, or vague request); the agent handles everything else in the background: parse → implement → route → RBAC → test → lint → docs → verify.

**Trigger keywords:** Any requirement, any feature request, "here's my requirement", "implement this", "build this", "add this feature"

**Key behaviors:**

- Orchestrates all other skills in order: code-structure → page-scaffolding → test-generation → lint-guard
- Never asks for confirmation on tests, routes, RBAC, docs, lint — does them all
- If request is vague, delegates to requirement-format skill to get the template first
- Verifies every acceptance criterion before responding
- Ensures zero lint errors and zero type errors before the user sees the result

**Skills it chains:** code-structure, page-scaffolding, test-generation, lint-guard, requirement-format, component-promotion (when relevant)

**Related rules:** agent-behavior, skill-router, testing-requirements

---

### 0b. lint-guard (Background — Auto-Invoked)

**Path:** `agent-os/skills/lint-guard/SKILL.md`
**Purpose:** Automatically fix all ESLint errors, TypeScript errors, and common code-quality issues after every implementation. Runs in the background — the user never asks for it.

**Trigger keywords:** (None — auto-invoked by auto-implement and agent-behavior rule after every code change)

**Key behaviors:**

- Fixes nested ternaries (extract to helper/if-else)
- Fixes React purity issues (Date.now() in render → state + effect)
- Fixes setState-in-effect (→ queueMicrotask)
- Fixes import ordering, unused imports, type imports
- Fixes void-use, fire-and-forget promises
- Adds ESLint config overrides for known patterns instead of inline disables
- Ensures `pnpm lint` = 0 errors and `pnpm type-check` = 0 errors

**ESLint config overrides reference:** Test files, build plugins, analytics providers, route modules, shadcn/ui — all documented in the skill.

**Related skills:** auto-implement (parent orchestrator), code-quality-security (ESLint config changes)

---

### 0c. code-smells-best-practices (Live Code Only)

**Path:** `agent-os/skills/code-smells-best-practices/SKILL.md`
**Purpose:** When any code is added or changed, check only the **modified/live code** for code smells and best-practice violations and fix them in the same change set. Ensures architecture (app not importing from pages), import conventions, no inline styles, no `any`, apiClient from fetch-client, and form-error testid consistency.

**Trigger keywords:** (Auto-invoked when code is added or changed); "fix code smells", "check best practices", "review my changes", "clean up this code"

**Key behaviors:**

- Scope: only files added or modified in the current change (no full codebase audit unless asked)
- Fix: dependency violations (app → core instead of app → pages), import spacing and apiClient path, replace inline styles with CSS/Tailwind, type tests properly (no any), align form-error testid
- Runs without asking; fixes applied in the same turn

**Related skills:** lint-guard (runs after; handles ESLint/TS), code-structure (placement rules), auto-implement (may chain this)

---

### 0d. code-structure

**Path:** `agent-os/skills/code-structure/SKILL.md`
**Purpose:** Canonical code structure and placement rules for implementing any requirement. Ensures code goes in the right layer (core / pages / shared / lib) and that tests are added automatically without user input.

**Trigger keywords:** "implement requirement", "add feature", "where do I put", "code structure", "new component", "new page", "new API"

**Key behaviors:**

- Defines dependency rule: shared ← pages ← core; pages never import from pages
- Placement cheat sheet: route → pages/<name>/route.tsx; API → pages/<name>/api.ts; shared UI → shared/components/
- Requires automatic test generation as part of every implementation (no user ask)
- References test-generation and page-scaffolding for full flow

**Related skills:** page-scaffolding, test-generation, component-promotion, requirement-format, file-structure rule

---

### 0b. requirement-format

**Path:** `agent-os/skills/requirement-format/SKILL.md`
**Purpose:** When the user's request is vague or feature-sized, ask for requirements using the standard format (docs/getting-started/requirement-format.md). When they provide a requirement doc in that format, parse it and implement fully without asking (tests, route, RBAC included).

**Trigger keywords:** "I have a requirement", "here's my requirement", "use the requirement format", "requirement template", vague/feature-sized request (e.g. "we need notifications", "add billing")

**Key documents:**

- Full intake (types, skills, rules): `docs/getting-started/requirement-intake.md`
- Format + template: `docs/getting-started/requirement-format.md`
- Filled example: `docs/getting-started/requirements/sample-requirement.md`

**Key behaviors:**

- If request is vague/feature-sized and no formatted doc given → respond with template/link and ask user to fill it; do not build from one line.
- If user provides doc with What, Where, Acceptance criteria (and optional Data/API, UI/Behavior, Constraints) → parse and implement completely; no confirmation questions.

**Related skills:** code-structure, page-scaffolding, test-generation, agent-behavior rule

---

### 1. page-scaffolding

**Path:** `agent-os/skills/page-scaffolding/SKILL.md`
**Purpose:** Scaffold a complete page directory with all standard files following the page-first architecture. Now includes automatic test generation, `data-testid` placement, and Zod response validation.

**Trigger keywords:** "create page", "new page", "add route", "scaffold page", "add feature page"

**Key files it creates/touches:**

- `src/pages/<name>/route.tsx` (required route marker)
- `src/pages/<name>/<Name>Page.tsx` (main component with `data-testid`)
- `src/pages/<name>/contracts.ts` (Zod schemas)
- `src/pages/<name>/api.ts` (API functions with Zod validation)
- `src/pages/<name>/hooks/use<Name>.ts` (TanStack Query hooks)
- `src/app/routes/routeTree.tsx` (route registration)
- Test files for all of the above (auto-generated)

**Related skills:** component-promotion (if new components need sharing later), test-generation (auto-invoked)

---

### 2. component-promotion

**Path:** `agent-os/skills/component-promotion/SKILL.md`
**Purpose:** Move a component from a page-specific location to the shared layer when used by 2+ page groups.

**Trigger keywords:** "move to shared", "promote component", "make reusable", "extract to shared", "used in multiple pages"

**Key files it touches:**

- Source: `src/pages/<page>/components/<Component>.tsx`
- Target: `src/shared/components/<Component>.tsx`
- All consumer files (import path updates)
- Corresponding test files (move tests too)

**Rule:** Only promote when used by 2+ different page groups AND contains no page-specific business logic.

**Related skills:** page-scaffolding (often creates the components that later get promoted), test-generation (update test imports)

---

### 3. react-best-practices

**Path:** `agent-os/skills/react-best-practices/SKILL.md`
**Purpose:** React and Next.js performance optimization guidelines from Vercel Engineering. 57 rules across 8 categories.

**Trigger keywords:** "optimize performance", "fix re-renders", "reduce bundle size", "waterfall", "slow rendering", "memo", "lazy loading"

**Key categories (by priority):**

1. Eliminating waterfalls (CRITICAL)
2. Bundle size optimization (CRITICAL)
3. Server-side performance (HIGH)
4. Client-side data fetching (MEDIUM-HIGH)
5. Re-render optimization (MEDIUM)
6. Rendering performance (MEDIUM)
7. JavaScript performance (LOW-MEDIUM)
8. Advanced patterns (LOW)

**Project-specific implementations:**

- `React.memo` on `DataTable` component
- `useMemo` on `DataTableToolbar` computations
- `preconnect`/`dns-prefetch` hints in `index.html`
- Lazy loading via route-level code splitting
- Bundle budgets enforced via `size-limit`

**Related skills:** composition-patterns (component architecture affects performance)

---

### 4. web-design-guidelines

**Path:** `agent-os/skills/web-design-guidelines/SKILL.md`
**Purpose:** Review UI code for Web Interface Guidelines compliance. Fetches latest rules from Vercel's guidelines repo.

**Trigger keywords:** "review UI", "check accessibility", "audit design", "review UX", "check a11y", "ARIA", "focus states", "WCAG"

**Categories covered:**

- Accessibility (aria-labels, semantic HTML, keyboard, skip-nav)
- Focus states (visible focus, focus-visible)
- Forms (autocomplete, validation, errors)
- Animation (prefers-reduced-motion)
- Typography (curly quotes, tabular-nums)
- Images (dimensions, lazy loading, alt text, WebP)
- Dark mode and theming
- Touch and interaction
- WCAG 2.1 AA compliance (Perceivable, Operable, Understandable, Robust)

**Project-specific implementations:**

- Skip-navigation links in AuthLayout and AppShell
- `aria-sort` on DataTableColumnHeader
- `scope="col"` on TableHead
- `aria-label` on OTP inputs, dialog close buttons, pagination selects
- `role="alert"`, `aria-live="assertive"` on OfflineIndicator and RetryError
- `OptimizedImage` with WebP/lazy/fallback
- `Permissions-Policy` header

**Usage:** Provide file paths for review. The skill fetches fresh guidelines from the source URL before each review.

**Related skills:** composition-patterns (component design affects accessibility), frontend-design (aesthetic quality)

---

### 4b. frontend-design (installed skill)

**Path:** `agent-os/skills/frontend-design/SKILL.md` (installed via `npx skills add https://github.com/anthropics/skills --skill frontend-design`)
**Purpose:** Design-thinking + aesthetic quality for building/styling/beautifying UI — distinctive typography hierarchy, intentional color/theme, high-impact motion, spatial composition, depth/atmosphere, memorable details; avoid generic "AI slop".

**Trigger keywords:** "build a page/component", "style this", "beautify", "make it look better", "polish the UI", "landing page", "dashboard design", "design an interface"

**Precedence (important):** apply _within_ this project's guardrails, which win:

- Components from shadcn (`agent-os/skills/shadcn/SKILL.md`) + the 20 allowed sources (`agent-os/rules/ui-sources.mdc`)
- Colors from neutral semantic tokens in `src/index.css` (no raw colors / no purple-on-white)
- Fonts/brand stay configured unless the user asks to change them
- Accessibility/UX from `web-design-guidelines`
- Use it to elevate craft/polish, **not** to override the component library, tokens, or brand. Standalone artifacts may get more creative latitude.

**Related skills:** web-design-guidelines (a11y/UX), shadcn (components/tokens), ui-ux-pro-max (design DB), composition-patterns (component API)
**Related rules:** ui-sources (allowed sources)

---

### 4c. ui-ux-pro-max (installed skill)

**Path:** `agent-os/skills/ui-ux-pro-max/SKILL.md` (installed via `npx skills add https://github.com/nextlevelbuilder/ui-ux-pro-max-skill --skill ui-ux-pro-max`)
**Purpose:** Searchable design-intelligence database — 50+ styles, 161 color palettes, 57 font pairings, 161 product types, 99 UX guidelines, 25 chart types, and per-stack rules (incl. shadcn). Query it for design recommendations and UX checks.

**How to query (requires `python3`; local-only, no network):**

```bash
python3 agent-os/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain <style|color|ux|typography|chart|product|icons>
python3 agent-os/skills/ui-ux-pro-max/scripts/search.py "<query>" --stack shadcn
```

**Trigger keywords:** "what style for", "color palette", "font pairing", "which chart", "UX guideline", "design system for [product]", "is this UI professional"

**Precedence (advisory only):** project guardrails win — do **not** let its palette/font/style suggestions override the neutral semantic tokens in `src/index.css`, configured fonts/brand, or shadcn component choices. Authoritative skills remain **shadcn** (components/tokens), **frontend-design** (craft), **web-design-guidelines** (a11y). Don't run `--persist` (writes `design-system/` files) unless the user asks.

**Safety note:** flagged "High Risk" by the installer's Gen heuristic, but the bundled Python (`core.py`, `search.py`, `design_system.py`, `data/_sync_all.py`) is a local BM25 search + CSV/markdown generator with **no** network/subprocess/eval/exec — reviewed and safe.

**Related skills:** frontend-design (craft), shadcn (components/tokens), web-design-guidelines (a11y)
**Related rules:** ui-sources (allowed sources)

---

### 5. composition-patterns

**Path:** `agent-os/skills/composition-patterns/SKILL.md`
**Purpose:** React composition patterns for building flexible, maintainable components. Avoid boolean prop proliferation.

**Trigger keywords:** "compound component", "too many boolean props", "render props", "context provider", "component API design", "refactor component"

**Key patterns:**

1. Architecture: avoid boolean props, compound components (HIGH)
2. State: decouple implementation, context interface, lift state (MEDIUM)
3. Implementation: explicit variants, children over render props (MEDIUM)
4. React 19: no forwardRef (skip -- project uses React 18)

**Related skills:** react-best-practices (architecture affects performance), web-design-guidelines (composition affects accessibility)

---

### 6. code-quality-security

**Path:** `agent-os/skills/code-quality-security/SKILL.md`
**Purpose:** Three-layer quality and security pipeline -- ESLint plugins, Husky pre-commit, GitHub Actions CI. Now includes commitlint, bundle budgets, Lighthouse CI, release-please, load testing, mutation testing.

**Trigger keywords:** "add eslint rule", "lint config", "pre-commit", "CI failing", "security scan", "gitleaks", "semgrep", "what checks run", "bundle size", "release", "deploy"

**Key files:**

- `eslint.config.mjs` -- ESLint rules and plugins (Layer 1)
- `.husky/pre-commit` -- Pre-commit hook script (Layer 2)
- `.husky/commit-msg` -- Commit message validation (Layer 2)
- `.commitlintrc.json` -- Conventional commit config (Layer 2)
- `.gitleaks.toml` -- Secret scan allowlist (Layer 2)
- `.github/workflows/ci.yml` -- CI workflow (Layer 3)
- `.github/workflows/preview.yml` -- PR preview builds (Layer 3)
- `.github/workflows/release.yml` -- release-please (Layer 3)
- `.github/workflows/load-test.yml` -- k6 load tests (Layer 3)
- `.github/workflows/mutation-test.yml` -- Stryker mutation tests (Layer 3)
- `.lighthouserc.cjs` -- Lighthouse CI assertions (Layer 3)
- `.size-limit.json` -- Bundle size budgets (Layer 3)
- `.github/dependabot.yml` -- Automated dependency updates (Layer 3)
- `.semgrepignore` -- Semgrep ignore patterns for CI (Layer 3)

**Related skills:** before-commit-guard (pre-commit hook invokes it)

---

### 6b. before-commit-guard

**Path:** `agent-os/skills/before-commit-guard/SKILL.md`
**Purpose:** Pre-commit gate that runs on every `git commit`. Ensures env docs, public assets, format, lint, and types pass before code is committed. Invoked automatically by `.husky/pre-commit` when user runs `git commit`.

**Trigger keywords:** "what runs on commit", "pre-commit guard", "before commit checks", "why did my commit fail", "fix commit failure", "commit checks"

**Key behaviors:**

- Runs via `./scripts/validate/before-commit-guard.sh` on every `git commit`
- Checks: validate:env-example, validate:public, lint-staged, type-check
- Plus (in pre-commit): gitleaks, merge conflict markers, large file (>1MB)
- Manual run: `pnpm run before-commit-guard`
- Documents how to fix each failure type

**Related skills:** code-quality-security (pre-commit config), lint-guard (fix patterns for lint/type failures)

---

### 6a. route-island

**Path:** `agent-os/skills/route-island/SKILL.md`
**Purpose:** Identical directory structure for every route and sub-route (`<page>.manifest.ts`, direct child folders, colocated tests); feature code stays inside the island; `<PAGE>.OVERVIEW.md` as AI entry; import boundaries.

**Trigger keywords:** "route island", "self-contained route", "sub-route folder", "everything under this path", "same directory structure per route"

**Key artifacts:**

- Skill: `agent-os/skills/route-island/SKILL.md`
- Reference: `docs/reference/route-island-structure.md`
- Template: `docs/getting-started/route-island-template.md`
- Examples: `src/pages/organization/$organizationId/dashboard/`, `src/pages/login/`

---

### 6b. e2e-testids

**Path:** `agent-os/skills/e2e-testids/SKILL.md`
**Purpose:** Add and maintain `data-testid` attributes for Playwright E2E and stable RTL queries. Naming conventions, per-route checklist, and inventory updates.

**Trigger keywords:** "test id", "data-testid", "e2e selector", "playwright id", "ids for e2e"

**Key artifacts:**

- Skill: `agent-os/skills/e2e-testids/SKILL.md`
- Inventory: `docs/reference/e2e-testids-inventory.md`
- Specs: `tests/e2e/*.spec.ts` using `page.getByTestId(...)`

**Auto-invocation:** With page-scaffolding, auto-implement UI, or when user prepares E2E tests.

---

### 7. test-generation

**Path:** `agent-os/skills/test-generation/SKILL.md`
**Purpose:** Automatically generate colocated test files for new source files. Covers components, forms, pages, stores, services, utilities, and hooks.

**Trigger keywords:** "add test", "write test", "test coverage", "missing tests", "generate test"

**Auto-invocation:** Triggered automatically when new `.tsx`/`.ts` source files are created under `src/` (via testing-requirements rule).

**Key conventions:**

- Colocated tests (same directory as source)
- `vitest-axe` accessibility assertions in all component tests
- `data-testid` selectors for stable element queries
- `userEvent` for realistic interaction testing
- Coverage thresholds: 80% (branches, functions, lines, statements)

**Test stack:**

- Vitest (unit runner)
- React Testing Library (component rendering)
- vitest-axe (accessibility)
- @testing-library/user-event (interactions)
- Playwright (E2E)
- @axe-core/playwright (E2E accessibility)
- Stryker (mutation testing, CI-only)

**Related skills:** page-scaffolding (creates files that need tests), code-quality-security (CI runs tests)

---

### 9. shadcn (single canonical skill)

**Path:** `agent-os/skills/shadcn/SKILL.md` (installed via `pnpm dlx skills add shadcn/ui`)
**Purpose:** The one skill for **all** shadcn/ui work — _how_ to add/fix/debug/style/compose components (CLI + Critical Rules) **and** _where_ a block comes from (its "Project rules — core-fe" section folds in the 20 allowed sources + selection workflow). The former `shadcn-component-selection` is merged into it and is now just a pointer (`agent-os/skills/shadcn-component-selection/SKILL.md`).

**Trigger keywords:** "add/fix/style a shadcn component", "shadcn CLI", "components.json", "preset", "which component for", "pick a component", "use shadcn components only", "best component for [X]", "login form", "sidebar", "data table", "block"

**Key behaviors:**

- CLI-first: `pnpm dlx shadcn@latest info|search|docs|view|add`; check installed components before writing custom markup
- Enforce Critical Rules: semantic tokens (no raw colors / manual `dark:`), `gap-*` not `space-*`, `size-*` for equal w/h, `cn()`, `data-icon` on button icons, full Card/Tabs/Avatar composition
- Selection: first build → pick the single best of the 20 allowed sources and implement; user wants options → present best 3 with direct links and ask
- After `add`: review files, fix imports to `@/shared/components/ui`, swap icons to lucide
- Ask which registry when adding a block and none is specified

**Related skills:** code-structure (placement), composition-patterns (component API)
**Related rules:** ui-sources (canonical list of 20 sources)

---

### 10. extension-settings-recommendations

**Path:** `agent-os/skills/extension-settings-recommendations/SKILL.md`
**Purpose:** Recommends and updates workspace extensions (`.vscode/extensions.json`) and workspace settings (`.vscode/settings.json`) for productivity based on project stack. Does not modify user-level settings (defer to update-cursor-settings skill).

**Trigger keywords:** "recommend extensions", "better productivity", "setup IDE", "which extensions", "cursor settings", "IDE setup", "new tooling"

**Key behaviors:**

- Read current `.vscode/extensions.json` and `.vscode/settings.json`; use curated list in skill's reference.md (category → extension ID → when to recommend)
- Recommend only extensions missing and valuable for stack (React, TypeScript, Vite, Tailwind, Vitest, Playwright, ESLint, Prettier)
- Suggest workspace settings that match project conventions; apply only when user or context implies "apply"
- When adding/changing tooling (new test framework, linter, language), consider invoking to suggest or update extensions/settings

**Related skills:** update-cursor-settings (user-level settings: theme, font, keybindings)

---

### 11. documentation-maintenance

**Path:** `agent-os/skills/documentation-maintenance/SKILL.md`
**Purpose:** When to update which doc and where docs live. Use when adding/changing docs, adding routes or features that affect README/CLAUDE, or when the user asks where to document something or how docs are organized.

**Trigger keywords:** "add doc", "where to document", "update README", "docs structure", "reorganize docs", "documentation index"

**Key behaviors:**

- Docs are organized by use case: getting-started, deployment, integrations, process, reference
- Index: `docs/README.md`; all paths use lowercase kebab-case
- When adding a doc: create in correct directory, add to docs/README.md, update README/CLAUDE if linked
- Keep README "Documentation" section and CLAUDE "Documentation" section in sync with actual paths

**Related rules:** agent-behavior (update docs as part of implementation without asking)

---

### 12. project-health-check

**Path:** `agent-os/skills/project-health-check/SKILL.md`
**Purpose:** Full project health audit after major code changes. Verifies docs (links, routes, tools), creates missing colocated tests, fixes lint/type/format errors, ensures build and bundle size pass, runs validation scripts, and reports a summary table.

**Trigger keywords:** "run health check", "check everything", "verify the project", "make sure everything works", "full project health check", "post-major-change audit"

**Key behaviors:**

- Seven phases: doc integrity → missing tests → static analysis (lint, type-check, format) → build → tests (with coverage) → validation (env, public) → summary table
- Fixes broken doc links, creates tests for non-exception source files, applies lint-guard and test-generation patterns
- Does not stop until every check passes; outputs pass/fail table
- CLI counterpart: `pnpm health` (report only), `pnpm health:fix` (auto-fix format + lint, then check)

**Related skills:** documentation-maintenance (Phase 1), lint-guard (Phase 3), test-generation (Phase 2), code-smells-best-practices (optional on modified files)

---

### 13. full-code-review

**Path:** `agent-os/skills/full-code-review/SKILL.md`
**Purpose:** Generate a full code review report covering security, performance, quality, readability, maintainability, and scalability. Writes to `reports/code-review/full-code-review-report.md`.

**Trigger keywords:** "run code review", "generate code review report", "full code review", "code review report"

**Key behaviors:**

- Runs lint, type-check, format check, build, size limit, tests, and coverage
- Greps for architecture violations (app/core/shared importing from pages) and dangerous patterns (dangerouslySetInnerHTML, innerHTML, eval)
- CLI: `pnpm report:code-review` (or `node scripts/reports/code-review-report.mjs`)

**Related skills:** project-health-check (broader audit), code-quality-security (lint/CI), lint-guard (static analysis)

---

### 8. skill-registry (this skill)

**Path:** `agent-os/skills/skill-registry/SKILL.md`
**Purpose:** Master catalog of all skills. Helps find the right skill for any task.

**Trigger keywords:** "which skill", "list skills", "what skills exist", "help me find"

**Maintenance:** Update this file whenever a skill is added, removed, or renamed. When adding a skill, add it to the Decision Tree, **Task → Required Skills** matrix, Skill Inventory, Cross-Reference table, and ensure `skill-router.mdc` includes it. **Installed (ecosystem) skills** live in `agent-os/skills/<name>/` and are tracked in `skills-lock.json` (e.g. `shadcn`, `frontend-design`, `find-skills`); **project skills** live in `agent-os/skills/<name>/`.

---

### 14. find-skills (installed skill)

**Path:** `agent-os/skills/find-skills/SKILL.md` (installed via `npx skills add https://github.com/vercel-labs/skills --skill find-skills`)
**Purpose:** Discover and install skills from the open agent-skills ecosystem when a needed capability isn't already covered by this registry or `skill-router.mdc`.

**Trigger keywords:** "is there a skill for X", "find a skill", "can you do X", "extend capabilities", "search skills"

**Key behaviors:**

- Check the [skills.sh](https://skills.sh/) leaderboard, then `npx skills find <query>`
- Prefer reputable, high-install skills (1K+ installs; official sources like `vercel-labs`, `anthropics`)
- Present options (name, what it does, installs, install command) before installing
- Install into `agent-os/skills/` (tracked in `skills-lock.json`); then **wire the new skill into `skill-router.mdc`, this registry, and docs**
- If none exists: proceed with general capabilities or suggest `npx skills init`

**Related skills:** skill-registry (catalog of what's already installed)

## Cross-Reference: Skills by File Area

| Area of Codebase                                      | Relevant Skill(s)                                                                                               |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Any new feature / requirement                         | **auto-implement** (master), code-structure, test-generation, code-smells-best-practices, lint-guard (all auto) |
| `src/pages/`                                          | auto-implement, code-structure, page-scaffolding, component-promotion, test-generation                          |
| `src/shared/components/`                              | component-promotion, composition-patterns, **shadcn** (`agent-os/skills/shadcn`), test-generation               |
| `src/shared/components/ui/`                           | composition-patterns, web-design-guidelines, **shadcn** (`agent-os/skills/shadcn`)                              |
| `src/core/`                                           | test-generation                                                                                                 |
| `src/lib/`                                            | test-generation                                                                                                 |
| `src/stores/`                                         | test-generation                                                                                                 |
| `eslint.config.mjs`                                   | code-quality-security, lint-guard                                                                               |
| `.husky/`                                             | code-quality-security                                                                                           |
| `.github/workflows/`                                  | code-quality-security                                                                                           |
| `catalog-info.yaml`                                   | (Backstage integration)                                                                                         |
| `.vscode/`                                            | **extension-settings-recommendations**                                                                          |
| `docs/`, README, CLAUDE                               | **documentation-maintenance**                                                                                   |
| Full project / post-change audit                      | **project-health-check**, lint-guard, test-generation, documentation-maintenance                                |
| Full code review report                               | **full-code-review**                                                                                            |
| Any React component                                   | react-best-practices, composition-patterns, web-design-guidelines, test-generation                              |
| UI/design decisions (style, palette, font, chart, UX) | **ui-ux-pro-max** (advisory DB), frontend-design, web-design-guidelines, shadcn                                 |

## Always-Active Rules (not skills)

These Cursor rules are always loaded and do not need to be invoked:

| Rule                 | File                                      | Purpose                                                                                                   |
| -------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| project-conventions  | `agent-os/rules/project-conventions.mdc`  | Architecture, imports, state management                                                                   |
| ui-sources           | `agent-os/rules/ui-sources.mdc`           | Allowed 20 shadcn UI sources; for all shadcn work read the single skill `agent-os/skills/shadcn/SKILL.md` |
| file-structure       | `agent-os/rules/file-structure.mdc`       | Directory layout, route.tsx convention                                                                    |
| testing-requirements | `agent-os/rules/testing-requirements.mdc` | Test generation auto-trigger, data-testid convention                                                      |
| context7-libraries   | `agent-os/rules/context7-libraries.mdc`   | Library doc lookup via Context7 MCP                                                                       |
| skill-router         | `agent-os/rules/skill-router.mdc`         | Auto-routes tasks to the right skill; complete all steps without asking                                   |
| agent-behavior       | `agent-os/rules/agent-behavior.mdc`       | Complete tests, route reg, RBAC, docs without asking; never ask "Do you want X?"                          |

## Enterprise Platform Integration

| Tool           | Config File                                        | Purpose                                   |
| -------------- | -------------------------------------------------- | ----------------------------------------- |
| Backstage      | `catalog-info.yaml`                                | Service catalog registration              |
| Nginx          | `nginx/default.conf`                               | SPA serving, caching, security headers    |
| PWA            | `public/manifest.webmanifest`, `vite.config.ts`    | Offline support, installability           |
| release-please | `.releaserc.json`, `.release-please-manifest.json` | Human-gated releases                      |
| Sentry         | `src/core/observability/sentry.ts`                 | Error tracking + PII scrubbing            |
| PostHog        | `src/core/analytics/posthog.ts`                    | Analytics + feature flags                 |
| Web Vitals     | `src/core/observability/performance.ts`            | Performance monitoring → PostHog + Sentry |
