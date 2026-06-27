---
name: platform-hygiene
description: Platform config, env read paths, dead-code and deploy validators for core-fe — platformConfig, build-env allowlist, knip, validate:vite-env, validate:client-env. Use when touching env schema, Vite env reads, knip, or platform config wiring.
---

# Platform hygiene (core-fe)

Use this skill when changing **how config enters the app**, **env validation**, or
**dead-code / deploy gates**. For **adding/removing env keys**, chain **`env-schema-add`**
first — this skill covers **read paths and validators** around that.

**Overview:** `docs/reference/frontend-platform.md`  
**Env add/rename/remove:** `agent-os/skills/env-schema-add/SKILL.md`

---

## Config read paths (single source of truth)

| Need                                                       | Read from                                             | Never                                      |
| ---------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------ |
| Runtime platform (API URL, auth flags, modules, Sentry, …) | `platformConfig` from `@/core/config/env.ts`          | Raw `import.meta.env.VITE_*` in app code   |
| Build metadata (build id, version, i18n build mode)        | `readInjected*` in `src/lib/i18n/build-env.ts`        | Direct `import.meta.env` outside allowlist |
| Env parsing / overrides                                    | `env.config.ts` (`getClientEnv`, `window.__CONFIG__`) | Duplicate Zod schemas                      |

**Allowlisted raw Vite reads:** only `build-env.ts` and `env.config.ts` (`pnpm validate:vite-env`).

---

## Checklist — platform / env change

1. **Env key?** → run **`env-schema-add`** checklist (schema, `.env.example`, sync, tests, runbook).
2. **Runtime consumer?** → wire `platform-config.ts` / `auth-methods.ts`; import `platformConfig` in app code.
3. **Build-time injection?** → extend `build-env.ts` + allowlist in `tooling/validate/vite-env-reads.mjs`.
4. **Types** — `src/vite-env.d.ts` for new `VITE_*` keys.
5. **Tests** — `env-schema.test.ts`, `platform-config.test.ts`, `build-env` tests as applicable.
6. **Validators:**

```bash
pnpm validate:vite-env
pnpm validate:client-env --production   # deploy conditional keys; local may warn on unset API URL
pnpm tool:sync-env-example
```

7. **Dead code** — after removing exports/deps:

```bash
pnpm knip
```

8. **Health** — `pnpm health` or CI-equivalent lanes after broad changes.

---

## Validator reference

| Command                                 | Enforces                                                   |
| --------------------------------------- | ---------------------------------------------------------- |
| `pnpm validate:vite-env`                | No stray `import.meta.env.VITE_*` outside allowlist        |
| `pnpm validate:client-env --production` | Production deploy env completeness (e.g. captcha, API URL) |
| `pnpm knip`                             | Unused exports, deps, files (see `knip.jsonc`)             |
| `pnpm tool:sync-env-example`            | Schema ↔ `.env.example` parity                             |

CI: static-sync lane runs vite-env + client-env; Netlify reusable workflow runs client-env for production builds.

---

## `platformConfig` vs legacy

- Import **`platformConfig`** from `@/core/config/env.ts` — not a deprecated `config` alias.
- Auth surface: `enabledOAuthProviders(authMethods.oauth)` — no redundant OAuth wrapper helpers.
- Module disable: `VITE_DISABLED_MODULES` on manifest `module` — not mixed into auth booleans.

---

## Post-deploy overrides

`public/config.js` → `window.__CONFIG__` with keys **without** `VITE_` prefix. Document operator keys in the file header. See CSP/Trusted Types runbook for SRI promotion.

---

## Anti-patterns

- `import.meta.env.VITE_FOO` in pages, shared, or core (except allowlist files)
- Secrets in `VITE_*` (bundled to client)
- Adding env to `.env.example` without schema field
- Skipping `knip` after deleting modules or dependencies
- Duplicating env parsing outside `env.config.ts`

---

## Verify

```bash
pnpm validate:vite-env
pnpm validate:client-env --production
pnpm knip
pnpm tsc
pnpm test -- --run src/core/config/ src/lib/i18n/build-env.test.ts
```

---

## Related

- Skill: `env-schema-add`, `documentation-maintenance`, `code-quality-security`
- Rule: `agent-os/rules/platform-hygiene-sync.mdc`, `agent-os/rules/env-schema-add-sync.mdc`
- Runbook: `docs/deployment/runbooks/environment-variables.md`
