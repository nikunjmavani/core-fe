---
description: Run the read-only pre-merge review pipeline and aggregate one report
argument-hint: (no arguments — reviews the current diff)
allowed-tools: Bash(git diff*), Bash(pnpm*)
---

Run the **pre-merge review** pipeline as read-only agents over the current diff, then aggregate one report:

1. **code-smells-best-practices** — dependency direction (`pages` ↛ `pages`, shared ↛ pages), import extensions, no `any`, apiClient usage, no inline styles, form-error testid consistency on touched UI.
2. **web-design-guidelines** — accessibility, focus management, forms, semantic tokens (no raw palette), shadcn composition rules on touched components.
3. **lint-guard** (review mode) — would `pnpm lint` and `pnpm type-check` pass on the diff? Flag ESLint/TS issues without editing.
4. **verifier** — run `/validate` + relevant tests (`pnpm test:unit`; `pnpm test:security` if auth/CSP/token code changed); confirm the change actually works.

Each finding names the procedural skill that fixes it (agent finds, skill fixes). Produce a single prioritized report — blocking gaps first, then optional improvements. This is review-only: do not edit files.
