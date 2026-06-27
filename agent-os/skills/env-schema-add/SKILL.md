---
name: env-schema-add
description: Walk through adding, renaming, or removing an env var safely in core-fe. Decides Secret vs Variable, picks the correct .env.example sub-section, keeps schema, template, validators, and GitHub Environments in sync. Use when src/core/config/env-schema.ts or .env.example changes.
---

# Env schema add (core-fe)

Use this skill whenever you **add, rename, or remove** an environment variable in core-fe.

Adding a key is **two aligned decisions**: its **classification** (GitHub Secret vs Variable) and — wherever a workflow consumes it — its **access context** (`secrets.NAME` vs `vars.NAME`).

## The two-half rule

`.env.example` has exactly two top-level halves, marked by `# ###...###` banners:

```text
# ############################################################
# GitHub Secrets (Netlify / GitHub Actions — sensitive)
# ############################################################

# --- Build / deploy ---
SENTRY_AUTH_TOKEN=...

# ############################################################
# GitHub Variables (public or operational knobs)
# ############################################################

# --- API ---
VITE_API_BASE_URL=...
```

Every key sits under exactly one half. Sub-sections (`# --- Title ---`) group related keys.

## Decision tree — Secret or Variable

1. **Credential or signing material?** → **Secret** (`*_TOKEN`, `*_AUTH_TOKEN`, `SENTRY_AUTH_TOKEN`, …).
2. **Leak would grant unauthorized access?** → **Secret**.
3. **Public identifier or operational knob?** → **Variable** (`VITE_*` client flags, `NODE_VERSION`, `NETLIFY_SITE_ID`, public DSN/site keys).
4. **Still unsure?** → default **Secret**.

## FE-specific prefixes

| Prefix    | Where to add in schema              | Bundled to client? |
| --------- | ----------------------------------- | ------------------ |
| `VITE_*`  | `envSchemaBase` + `clientEnvSchema` | Yes                |
| `BUILD_*` | `envSchemaBase` only                | No (build plugins) |
| No prefix | `envSchemaBase` only                | No (CI/scripts)    |

**Platform-facing `VITE_*` keys** also need wiring in:

- `src/core/config/env-resolvers.ts` (if parsed/transformed)
- `src/core/config/platform-config.ts` (if exposed on `PlatformConfig`)
- `src/core/config/auth-methods.ts` (if auth surface)

## Checklist — add a key

1. **Schema** — add Zod field to `src/core/config/env-schema.ts`.
2. **Runtime** — wire `env.config.ts` / `platform-config.ts` if app reads it.
3. **Template** — add to `.env.example` under correct half + sub-section; use `# OPTIONAL — <condition>` when conditionally required.
4. **Sync** — run `pnpm tool:sync-env-example --fix` then `pnpm tool:sync-env-example`.
5. **Types** — extend `src/vite-env.d.ts` for new `VITE_*` keys if needed.
6. **Tests** — colocated tests in `env-schema.test.ts`, `env-resolvers.test.ts`, or `platform-config.test.ts`.
7. **Docs** — update `docs/deployment/runbooks/environment-variables.md` if operator-facing.
8. **GitHub** — update local `.env.<environment>`; `pnpm github:sync <env> --dry-run`.
9. **PR** — include "Environment variable changes" block in description.

## Remove or rename a key

1. Remove from schema + all resolvers/consumers.
2. Remove from `.env.example`.
3. Run `pnpm tool:sync-env-example`.
4. Grep repo for old name; update workflows and docs.
5. Leave a release note if deploy envs must drop the old key.

## Auth vs modules (do not mix)

- **Auth** = individual `VITE_AUTH_*` booleans (never `VITE_DISABLED_MODULES`).
- **Modules** = `VITE_DISABLED_MODULES` comma list (`billing`, `members`, …).

## config.js contract

Runtime deploy overrides use `window.__CONFIG__` with keys **without** `VITE_` prefix. Document new public keys in `public/config.js` header comment when operators may override at deploy. See [csp-trusted-types-production.md](../../docs/deployment/runbooks/csp-trusted-types-production.md) for SRI promotion.

## Netlify / GitHub Actions deploy

- **Build-time `VITE_*`:** set in GitHub Environment Variables/Secrets; GHA bakes them into `dist/` at build. Do not expect Netlify UI env to apply unless you build on Netlify (this repo does not).
- **Post-deploy override:** inject `public/config.js` with stripped key names (no `VITE_` prefix).
- **Sync hosted env:** `pnpm github:sync <environment>` after updating local `.env.<environment>`.

## Related

- Runbook: `docs/deployment/runbooks/environment-variables.md`
- Rule: `agent-os/rules/env-schema-add-sync.mdc`
- Skill: `agent-os/skills/platform-hygiene/SKILL.md` (validators + read paths)
- Platform config: `docs/reference/frontend-platform.md`
