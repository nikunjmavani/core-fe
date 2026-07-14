# Runbook: environment variables (core-fe)

Canonical reference for every workflow that touches environment variables in
**core-fe** — local bootstrap, Netlify/GitHub sync, adding keys, and troubleshooting.

Related: [`docs/integrations/credentials-and-env.md`](../../integrations/credentials-and-env.md),
[`docs/reference/frontend-platform.md`](../../reference/frontend-platform.md).

## TL;DR

| What                                  | Command                                        |
| ------------------------------------- | ---------------------------------------------- |
| Verify schema ↔ `.env.example` parity | `pnpm tool:sync-env-example`                   |
| Auto-append missing keys to template  | `pnpm tool:sync-env-example --fix`             |
| Pre-commit / CI parity gate           | `pnpm validate:env-example`                    |
| Bootstrap local env files             | `pnpm github:sync`                             |
| Verify GitHub Environment secrets     | `CONFIG=<env> pnpm validate:deploy-env`        |
| Add a new env var (skill)             | read `agent-os/skills/env-schema-add/SKILL.md` |

## 1. Mental model

**One schema** declares which keys exist and how they validate:

```text
src/core/config/env-schema.ts   ← Zod + envSchemaKeys
  │
  ├── src/core/config/env.config.ts      ← getClientEnv(), runtime resolution
  ├── src/core/config/platform-config.ts ← auth, modules, deployment flags
  └── .env.example (committed)           ← operator template
```

### Three env classes (FE)

| Class               | Prefix     | Read where                                         | Examples                                  |
| ------------------- | ---------- | -------------------------------------------------- | ----------------------------------------- |
| **Build-time**      | `BUILD_*`  | Vite plugins / `vite.config.ts` only               | `BUILD_I18N_MODE`, `BUILD_I18N_LOCALE`    |
| **Runtime public**  | `VITE_*`   | Client bundle; overridable via `window.__CONFIG__` | `VITE_AUTH_*`, `VITE_DISABLED_MODULES`    |
| **Runtime private** | no `VITE_` | CI / build scripts only                            | `SENTRY_AUTH_TOKEN`, `NETLIFY_AUTH_TOKEN` |

**Client resolution order:** `window.__CONFIG__[key]` → `import.meta.env.VITE_${key}` → Zod default.

**Not env:** live session and organization context from **`GET /auth/me/context`**.

**Also not fetched at boot:** login auth surface (OAuth buttons, email OTP, passkey). Set matching `VITE_AUTH_*` on core-fe and credential env on core-be — no `GET /auth/oauth/providers`.

### `.env.example` halves

Two top-level banners mirror GitHub Secret vs Variable classification:

```text
# ### GitHub Secrets ###     → gh secret set / Netlify sensitive
# ### GitHub Variables ###   → gh variables / public knobs
```

`pnpm github:sync` classifies by **name** (`classifyKey` in `tooling/setup/github/`). Place each key under the half its name resolves to.

## 2. Platform switches

### Auth — per-method booleans (`VITE_AUTH_*`)

| Surface           | Env switch                    | Default |
| ----------------- | ----------------------------- | ------- |
| Email OTP         | `VITE_AUTH_EMAIL`             | on      |
| OAuth Google      | `VITE_AUTH_OAUTH_GOOGLE`      | on      |
| OAuth GitHub      | `VITE_AUTH_OAUTH_GITHUB`      | on      |
| OAuth Apple       | `VITE_AUTH_OAUTH_APPLE`       | off     |
| Passkey           | `VITE_AUTH_PASSKEY`           | on      |
| Auto-start Google | `VITE_AUTH_OAUTH_AUTO_GOOGLE` | off     |

**Not** in `VITE_DISABLED_MODULES`. Monolithic `VITE_AUTH_OAUTH` is removed — use per-provider flags.

### Feature modules — disable list (`VITE_DISABLED_MODULES`)

Comma-separated **product module keys** (e.g. `billing,members`). Disabled modules:

- Routes with `manifest.module` → 404 via `requireModuleGate`
- Nav/settings entries should hide via `isPlatformModuleEnabled()`

See module catalog in [`docs/reference/frontend-platform.md`](../../reference/frontend-platform.md).

### Deployment mode overrides

Optional tri-state env overrides (when set, override API flags from `me/context`):

- `VITE_PERSONAL_ORGANIZATIONS`
- `VITE_TEAM_ORGANIZATIONS`

### Diagnostics / dev tooling — named flags (no build-mode sniffing)

Behavior is env-driven, **never** sniffed from `import.meta.env.DEV/PROD/MODE` in app
code. Each flag is read via `platformConfig`; defaults are production-safe and the local
`.env.local` flips them on (see `injectLocalDevDefaults` in `tooling/dev/setup-local.ts`):

| Flag                 | Dev | Prod (strict) | Effect                                                       |
| -------------------- | --- | ------------- | ------------------------------------------------------------ |
| `VITE_DEBUG_LOGGING` | any | `false` only  | `[Module]` diagnostic console logs                           |
| `VITE_DEVTOOLS`      | any | `false` only  | React Query Devtools + localhost debug panel + theme shuffle |
| `VITE_E2E_HOOKS`     | any | `false` only  | Playwright hooks on `globalThis` (`navigateInApp`, …)        |
| `VITE_VERSION_CHECK` | any | `true` only   | Poll `/version.json` for new deployments (off locally/tests) |

**Strict allowed values (hard fail).** `envProfiles.<env>.allowed` in `env-schema.ts`
declares the permitted value set per key per environment. `pnpm validate:client-env`
**fails** if `.env.<env>` (locally) or the injected GitHub Environment (CI) holds a value
out of range — e.g. `VITE_DEBUG_LOGGING=true` in production is rejected. Development permits
either boolean (typos still rejected).

The only remaining raw env read is the config bootstrap (`env.config.ts`, allowlisted by
`pnpm validate:vite-env`). Tests are **hermetic by construction**: `test` mode loads no env
files (each `.env.<mode>` file — `.env.local`, `.env.development`, `.env.production` — loads only
in its own mode, and there is no catch-all `.env`), so the suite runs on schema defaults;
test-runner env is injected by Vite plugins via `test.env` —
`i18n-build` (multi-locale) and `test-env` (`VITE_CAPTCHA_DISABLED`).

## 3. Build-time deploy (GitHub Actions → Netlify)

core-fe **builds in GitHub Actions**, not on Netlify. All `VITE_*` values are
**baked into the bundle at build time** from GitHub Environment Secrets/Variables
(via `pnpm github:sync` → `.env.<environment>` → GHA workflow env).

| When to set vars                     | Where                                                                                                            |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Normal production deploy             | GitHub Environment Variables/Secrets consumed by the build workflow                                              |
| Post-deploy override without rebuild | `public/config.js` → `window.__CONFIG__` (Docker entrypoint or Netlify `_headers` + injected script)             |
| Local dev                            | `.env.local` (gitignored — your local dev file; `.env.development` / `.env.production` are the deploy-env files) |

Do **not** rely on Netlify UI env vars unless you intentionally build on Netlify
(this repo does not). See [cicd-and-netlify.md](../cicd-and-netlify.md).

## 4. Docker / runtime override (`config.js`)

Production deploy may inject `public/config.js` with `window.__CONFIG__`:

- Strip `VITE_` prefix for keys (e.g. `AUTH_OAUTH_GOOGLE`, not `VITE_AUTH_OAUTH_GOOGLE`)
- Same keys as bundled client env
- See comments in [`public/config.js`](../../../public/config.js)

## 5. Adding or changing a key

Follow **`agent-os/skills/env-schema-add/SKILL.md`** end-to-end:

1. Add field to `src/core/config/env-schema.ts`
2. Wire resolver in `env-resolvers.ts` / `platform-config.ts` if platform-facing
3. Place key in correct `.env.example` half + sub-section
4. Run `pnpm tool:sync-env-example --fix` then `pnpm tool:sync-env-example`
5. Update local `.env.<environment>` and `pnpm github:sync <env> --dry-run`
6. Add PR description block from sync tool output

## 6. Troubleshooting

| Symptom                          | Check                                                               |
| -------------------------------- | ------------------------------------------------------------------- |
| OAuth button missing             | `VITE_AUTH_OAUTH_<PROVIDER>` not `false`; no backend provider fetch |
| OAuth click fails                | core-be may lack provider credentials — fix both sides              |
| Module route 404                 | Key in `VITE_DISABLED_MODULES` or manifest `module` mismatch        |
| Production boot error on CAPTCHA | Set `VITE_TURNSTILE_SITE_KEY` or `VITE_CAPTCHA_DISABLED=true`       |
| `validate:env-example` fails     | Run `pnpm tool:sync-env-example --fix`                              |
| MCP servers missing in Cursor    | Run `pnpm setup:local --no-start` or `pnpm mcp:setup`               |
| Context7 MCP fails               | Set `CONTEXT7_API_KEY` in `.env.local` and reload Cursor            |

## 7. Related files

| File                                   | Role                   |
| -------------------------------------- | ---------------------- |
| `src/core/config/env-schema.ts`        | Zod schema + key list  |
| `src/core/config/env.config.ts`        | Client env parse       |
| `src/core/config/platform-config.ts`   | Typed platform config  |
| `tooling/validate/sync-env-example.ts` | Schema ↔ template sync |
| `tooling/load-env-files.mjs`           | Node script env loader |
