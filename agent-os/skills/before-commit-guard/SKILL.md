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

| # | Check | Script/Command | Purpose |
| --- | ----------------------- | ------------------------------------------- | ------------------------------------------------ | ------- | --------------------------- |
| 1 | **before-commit-guard** | `./tooling/validate/before-commit-guard.sh` | Env docs, public assets, lint-staged, env/mode-sniffing gate, type-check, lockfile sync |
| 2 | Env-file guard | `git diff --cached` vs `.env*` | Reject committing any `.env*` except `.env.example` |
| 3 | Gitleaks | `gitleaks protect --staged` | Secret/API key detection (if installed) |
| 4 | Merge conflict markers | `grep -rlE '^(<{7}                          | >{7}                                             | ={7})'` | Reject unresolved conflicts |
| 5 | Large file check | `wc -c` | Reject files > 1MB |

### Inside before-commit-guard.sh

1. **validate:env-example** — `.env.example` documents all keys from `src/core/config/env-schema.ts` (via `pnpm tool:sync-env-example`).
2. **validate:public** — Required public assets exist: config.js, theme-init.js, vite.svg, manifest.webmanifest, \_headers, offline.html, robots.txt.
3. **lint-staged** — ESLint --fix + Prettier on staged `.ts`, `.tsx`, `.css`, `.json`, `.md`, `.yaml`, `.yml`.
4. **validate:vite-env** — env/mode-sniffing gate: no `import.meta.env.DEV/PROD/MODE` or `platformConfig.environment === '<name>'` / `.MODE ===` outside the config-kernel allowlist. Behavior must be driven by named `platformConfig` flags.
5. **type-check** — `tsc --noEmit` for full project.
6. **validate:lockfile** — _only when the commit stages `package.json` or `pnpm-lock.yaml`_ — runs `pnpm install --frozen-lockfile` (the exact check CI runs) to prove the lockfile is in sync. Catches a dependency or `pnpm.overrides` change that forgot to regenerate the lockfile before it can reach dev.

## How to Fix Failures

### validate:env-example fails

**Error:** "`.env.example` is missing required var(s): NODE_VERSION"

**Fix:** Add the missing key to `.env.example` (or run `pnpm tool:sync-env-example --fix`). See `agent-os/skills/env-schema-add/SKILL.md`.

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

### validate:lockfile fails

**Error:** "`ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` … The current "overrides" configuration doesn't match the value found in the lockfile" (or a lockfile-outdated error).

**Cause:** You changed a dependency or `pnpm.overrides` in `package.json` without regenerating `pnpm-lock.yaml`. A frozen install then fails — which reds **every** CI job on the PR, and any open release-please PR inherits the mismatch and goes all-red too.

**Fix:** Run `pnpm install`, then stage `package.json` **and** `pnpm-lock.yaml` in the same commit. **Rule:** a dependency/override change and its lockfile update are one atomic change — a desynced lockfile must never reach dev.

## Manual Run

Run the guard without committing:

```bash
pnpm run before-commit-guard
```

This runs only the before-commit-guard checks (env, public, lint-staged, vite-env, type-check, and lockfile sync when `package.json`/`pnpm-lock.yaml` are staged). The env-file guard, gitleaks, conflict markers, and large file checks run only in the actual pre-commit hook. Run the lockfile check directly any time with `pnpm run validate:lockfile`.

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

| File                                      | Purpose                                                                 |
| ----------------------------------------- | ----------------------------------------------------------------------- |
| `tooling/validate/before-commit-guard.sh` | Main guard script                                                       |
| `tooling/validate/lockfile-sync.sh`       | `validate:lockfile` — frozen-install lockfile ↔ package.json sync check |
| `.husky/pre-commit`                       | Invokes guard + gitleaks + conflict + large file                        |
| `package.json` `lint-staged`              | ESLint + Prettier on staged files                                       |
| `src/core/config/env-schema.ts`           | Schema source of truth for env keys                                     |
| `tooling/validate/sync-env-example.ts`    | Schema ↔ `.env.example` parity                                          |
