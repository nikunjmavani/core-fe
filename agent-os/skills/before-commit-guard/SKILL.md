---
name: before-commit-guard
description: Pre-commit gate that runs on every git commit. Ensures env docs, public assets, format, lint, and types pass before code is committed. Use when user asks about commit checks, pre-commit, path-to-production gates, or fixing commit failures.
---

# Before-Commit Guard — Path-to-Production Gate

This skill runs **automatically when the user runs `git commit`** via the Husky pre-commit hook. It enforces the same quality gates used for path-to-production, at commit time.

## When to Invoke (Agent)

- User asks: "what runs on commit?", "pre-commit guard", "before commit checks", "why did my commit fail?", "fix commit failure"
- User wants to run the guard manually: `pnpm run before-commit-guard`
- Modifying `.husky/pre-commit` or pre-commit checks — read code-quality-security for consistency

## What Runs on `git commit`

The pre-commit hook (`.husky/pre-commit`) runs:

| #   | Check                   | Script/Command                              | Purpose                                          |
| --- | ----------------------- | ------------------------------------------- | ------------------------------------------------ | ------- | --------------------------- |
| 1   | **before-commit-guard** | `./scripts/validate/before-commit-guard.sh` | Env docs, public assets, lint-staged, type-check |
| 2   | Gitleaks                | `gitleaks protect --staged`                 | Secret/API key detection (if installed)          |
| 3   | Merge conflict markers  | `grep -rlE '^(<{7}                          | >{7}                                             | ={7})'` | Reject unresolved conflicts |
| 4   | Large file check        | `wc -c`                                     | Reject files > 1MB                               |

### Inside before-commit-guard.sh

1. **validate:env-example** — `.env.example` documents all vars from `scripts/required-env.txt` (VITE_API_BASE_URL, NODE_VERSION).
2. **validate:public** — Required public assets exist: config.js, theme-init.js, vite.svg, manifest.webmanifest, \_headers, offline.html, robots.txt.
3. **lint-staged** — ESLint --fix + Prettier on staged `.ts`, `.tsx`, `.css`, `.json`, `.md`, `.yaml`, `.yml`.
4. **type-check** — `tsc --noEmit` for full project.

## How to Fix Failures

### validate:env-example fails

**Error:** "`.env.example` is missing required var(s): NODE_VERSION"

**Fix:** Add the missing var to `.env.example`. See `scripts/required-env.txt` for the list. Example:

```
NODE_VERSION=24
```

### validate:public fails

**Error:** "Missing required files in public/: ..."

**Fix:** Add the missing file to `public/`. See `public/README.md` for the full list.

### lint-staged / ESLint fails

**Fix:** Run `pnpm lint:fix` and fix any remaining errors manually. Common issues:

- Import ordering → `simple-import-sort` (auto-fixed)
- Unused imports → remove or use `_` prefix
- `security/detect-object-injection` → add block disable with justification for safe dynamic access
- React purity / impure in render → move to effect or handler

See **lint-guard** skill for full fix patterns.

### type-check fails

**Fix:** Run `pnpm type-check` to see errors. Fix TypeScript errors (strict mode, no `any`, proper types).

## Manual Run

Run the guard without committing:

```bash
pnpm run before-commit-guard
```

This runs only the before-commit-guard checks (env, public, lint-staged, type-check). Gitleaks, conflict markers, and large file checks run only in the actual pre-commit hook.

## Relationship to Full Health Check

| Check                | before-commit-guard                | pnpm health     |
| -------------------- | ---------------------------------- | --------------- |
| validate:env-example | ✅                                 | ✅              |
| validate:public      | ✅                                 | ✅              |
| format (Prettier)    | ✅ via lint-staged on staged files | ✅ format:check |
| lint                 | ✅ via lint-staged on staged files | ✅ full lint    |
| type-check           | ✅                                 | ✅              |
| tests                | ❌ (too slow for commit)           | ✅              |
| build                | ❌ (too slow for commit)           | ✅              |
| bundle size          | ❌ (needs build)                   | ✅              |
| gitleaks             | ✅ in pre-commit                   | ❌              |
| conflict markers     | ✅ in pre-commit                   | ❌              |
| large file           | ✅ in pre-commit                   | ❌              |

Use `pnpm health` or `pnpm health:fix` for the full path-to-production flow before release.

## Config Files

| File                                      | Purpose                                          |
| ----------------------------------------- | ------------------------------------------------ |
| `scripts/validate/before-commit-guard.sh` | Main guard script                                |
| `.husky/pre-commit`                       | Invokes guard + gitleaks + conflict + large file |
| `package.json` `lint-staged`              | ESLint + Prettier on staged files                |
| `scripts/required-env.txt`                | Required env var names for .env.example          |
