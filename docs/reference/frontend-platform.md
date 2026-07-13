# Frontend platform — cross-cutting runtime

How the SPA bootstraps session context, gates routes, handles errors, and
coordinates optional modules. Complements
[`routing-and-tenancy.md`](./routing-and-tenancy.md) and
[`security-model.md`](./security-model.md).

---

## Boot order

```text
main.tsx
  1. resolveOrganizationFromSubdomain()     — seed org store from hostname (sync)
  2. bootstrapResources()                   — register resource manifests (L7)
  3. React mount (App → RouterProvider)
  4. startAuthBootstrap()                   — silent refresh + hydrateSessionContext
  5. initObservabilityWhenIdle()            — Sentry + consented analytics
  6. startVersionCheck()                    — new-deployment reload (prod)
  7. subscribeToAuthBroadcast()               — cross-tab logout
```

**Session context** (`shared/tenancy/session-context.ts`):

| API                             | When                                                      |
| ------------------------------- | --------------------------------------------------------- |
| `hydrateSessionContext()`       | Fetch `me/context`, seed React Query + derived org store  |
| `invalidateSessionContext()`    | Drop cached context (logout side-effects, forced refresh) |
| `invalidateMembershipContext()` | Session + per-org permission cache reset                  |

Auth bootstrap (`shared/auth/service.ts`) calls `hydrateSessionContext()` after
token refresh. Workspace guards and `/` resolver share the same helper.

---

## Configuration

Platform behavior is driven by validated env → `platformConfig` (not runtime config
APIs from core-be).

```text
src/core/config/env-schema.ts     — Zod schema + envSchemaKeys (script-safe)
src/core/config/env.config.ts     — getClientEnv(), window.__CONFIG__ overrides
src/core/config/platform-config.ts — PlatformConfig (auth, modules, deployment)
src/core/config/auth-methods.ts   — AuthMethods + enabledOAuthProviders()
src/lib/i18n/build-env.ts         — allowlisted Vite build injections (buildId, i18n mode)
```

| Concern                 | Env / API                                                                         | Notes                                     |
| ----------------------- | --------------------------------------------------------------------------------- | ----------------------------------------- |
| Auth surface (login UI) | `VITE_AUTH_*`                                                                     | Env-only. No `GET /auth/oauth/providers`. |
| Feature modules (L6b)   | `VITE_DISABLED_MODULES`                                                           | Comma-separated keys on manifest `module` |
| Org deployment mode     | `me/context` + optional `VITE_PERSONAL_ORGANIZATIONS` / `VITE_TEAM_ORGANIZATIONS` | Env override when set                     |
| Session / active org    | `GET /auth/me/context`                                                            | Not env                                   |
| Post-deploy overrides   | `window.__CONFIG__` in `public/config.js`                                         | Keys without `VITE_` prefix               |
| Build metadata          | `VITE_APP_BUILD_ID`, `VITE_APP_VERSION`, `VITE_I18N_BUILD_*` (Vite plugins)       | Read via `build-env.ts` only              |

**Tooling:** `pnpm tool:sync-env-example` keeps `.env.example` in sync with the schema.
**Validators:** `pnpm validate:vite-env` (no env/mode sniffing — `import.meta.env.VITE_*`/`DEV`/`PROD`/`MODE` outside the allowlist, or `.environment`/`.MODE ===` compares),
`pnpm validate:client-env --env <development|production>` (per-environment required + forbidden + strict `allowed` value sets).
**Operators:** [environment-variables runbook](../deployment/runbooks/environment-variables.md).
**Adding keys:** `agent-os/skills/env-schema-add/SKILL.md`.  
**Platform read paths & validators:** `agent-os/skills/platform-hygiene/SKILL.md`.

---

## Security gateway (L1 → L6b)

Composable gates live in `core/security/gateway.ts`:

```ts
gatewayFromManifest(manifest) // manifest.permission + manifest.module + manifest.onDeny
gatewayFromPolicy({ permission, module, onDeny })
gateway(requireSession, requirePermissionGate(...), requireModuleGate(...))
```

Protected routes in `routeTree.tsx` call `gatewayFromManifest` where the island
declares RBAC/module policy (e.g. dashboard). Org-scoped tenancy gates
(`resolveActiveOrg`, `requireOrgStatus`, …) run **before** or **after** per route
needs — see [`GUARDS.OVERVIEW.md`](../src/app/guards/GUARDS.OVERVIEW.md).

`requireFeature(moduleKey)` in `core/security/gates/require-module.ts` is a
synchronous helper for ad-hoc loaders. Routes with a manifest should use
`gatewayFromManifest` (L6b via `manifest.module`) instead — disabled modules
resolve to `notFound()` (404).

---

## Module key catalog (L6b)

Deployment env `VITE_DISABLED_MODULES` (comma-separated) disables feature
surfaces. Manifest `module` keys must match this catalog:

| Key            | Surfaces (today / planned)                                               |
| -------------- | ------------------------------------------------------------------------ |
| `billing`      | Dashboard reference manifest; settings billing panel; subscription hooks |
| `members`      | Members resource registry reference; settings members panel              |
| `integrations` | Settings integrations panel (planned)                                    |

UI should hide nav/settings entries via `isModuleEnabled()` when a module is
off — routes still 404 via the gateway if linked directly.

---

## HTTP errors

| Concern             | Location                                                              |
| ------------------- | --------------------------------------------------------------------- |
| User-facing message | `shared/errors/errorHandler.ts` → `mapApiError`                       |
| 422 → form fields   | `lib/forms/map-validation-errors.ts` → RHF `setError`                 |
| 429 rate limit      | `shared/errors/rate-limit.ts` + `RateLimitNotice` component           |
| Global toast        | `notifyError()` / `notify.ts` via query/mutation `meta.notifyOnError` |

**Custom toasts (`notify.ts`):** never pass `id: undefined` to `toast.custom()` — Sonner
[#679](https://github.com/emilkowalski/sonner/issues/679) overwrites the generated id and
breaks dismiss. Only spread `{ id }` when defined.

**422 mapping:** pass mutation errors through `mapValidationErrors(error, setError)`
before falling back to `notifyError`.

---

## Offline stance

The app is **online-first**. There is no offline mutation queue or service-worker
write path for API calls.

- `OfflineIndicator` (`shared/components/OfflineIndicator/`) shows a dismissible
  banner when `navigator.onLine` is false.
- TanStack Query retries skip 401 (auth interceptor owns refresh); other failures
  surface via `QueryBoundary` / `RetryError` on read paths.
- Users should not lose in-progress **local** drafts: onboarding uses
  `useUnsavedChangesGuard` + persisted `useOnboardingStore`; settings panels
  register dirty state via `SettingsDirtyProvider`.

Do not silently drop failed writes — show error + retry affordance.

---

## New-deployment reload

Production only (`startVersionCheck()` in `main.tsx`):

- Polls `/version.json` every 60s + on tab refocus (`src/core/version/check.ts`).
- First poll ~**2s** after bootstrap (`VERSION_CHECK_INITIAL_DELAY_MS`).
- When `buildId` differs from `VITE_APP_BUILD_ID`, shows a **persistent info toast**
  (“Update available” + **Refresh now**) via `app/version/show-update-available-toast.ts`.
- **Dismiss (×)** snoozes re-notification for **15 minutes** per buildId
  (`version-update-snooze.ts`); idle / hidden-tab reload still applies as backstop.
- Reload is **deferred** until safe: not mid-edit; **immediately when the tab is
  hidden**; otherwise after ~60s idle.
- User can tap **Refresh now** anytime — same reload path as the automatic one.
- At most one reload per advertised `buildId` (sessionStorage loop guard).

See **`docs/reference/cross-browser-support.md`** and **`docs/reference/tools-and-usage.md`**.

---

## Observability (Sentry)

Production error monitoring is wired whenever **`VITE_SENTRY_DSN` is set**
(`.env.development` for local QA, Netlify/GitHub for deploys). **Not** consent-gated
(unlike PostHog). Sentry env: **`development`** in `pnpm dev`, **`production`** on deploy.

| Layer                      | Location                                       | Sentry product                 |
| -------------------------- | ---------------------------------------------- | ------------------------------ |
| Init (idle, post-splash)   | `app/observability/sentry.ts`                  | SDK bootstrap                  |
| React root boundary        | `App.tsx` → `reportReactError`                 | Issues + component stack       |
| Route boundary             | `app/routes/ErrorBoundary.tsx` → `reportError` | Issues                         |
| Query/mutation failures    | `core/http/queryClient.ts`                     | Issues + query/mutation extras |
| Router + fetch tracing     | TanStack + `httpClientIntegration`             | Performance                    |
| Session replay + profiling | prod integrations only                         | Replays, Profiles              |
| Web Vitals (poor only)     | `app/observability/performance.ts`             | Issues (warning)               |
| Source maps                | `vite.config.ts` + CI secrets                  | Releases                       |

Full data catalog, env vars, local verification, and Sentry project checklist:
**[`docs/integrations/sentry-frontend.md`](../integrations/sentry-frontend.md)**.
PostHog + web-vitals analytics remain consent-gated; Sentry is not. Full PostHog
event catalog: **[`docs/integrations/posthog-frontend.md`](../integrations/posthog-frontend.md)**.

---

Use `shared/components/QueryBoundary` for **server-state panels** (settings
sections, dashboard widgets) that depend on TanStack Query:

1. **Wrap the query at the panel boundary** — parent holds `useQuery` / hook;
   child render-prop receives typed `data`.
2. **Do not** duplicate loading/error branches inline (`isLoading` + `<Skeleton>` +
   `isError` + `<p role="alert">`) when `QueryBoundary` covers the same UX.
3. **Mutations** stay outside the boundary — use `notifyError` / form helpers on
   failure.
4. **Custom loading** — pass `loading=` only when the default skeleton is wrong
   for the layout.
5. **Error copy** — pass `errorMessage=` for domain-specific retry text; default
   uses `errors` namespace.

Migrated panels: `OrganizationMembersPanel`, `OrganizationRolesPanel`,
`AccountBillingPanel`, `OrganizationGeneralPanel`, dashboard widgets.

---

## Resource registry (L7)

Reference bootstrap in `core/resources/bootstrap.ts` (called from `main.tsx`):

- `membersResource` — schema + CRUD permissions for future members island
- `listResources()` — nav/dev-tools consumer

Full resource pages register in `<resource>.resource.ts` and call
`registerResource` at bootstrap when the island ships.

---

## Related

- [`pwa-manifest-and-app-icon.md`](./pwa-manifest-and-app-icon.md) — install surface + icon sync
- [`local-production-perf.md`](./local-production-perf.md) — Lighthouse / bundle on production build
- [`route-island-structure.md`](./route-island-structure.md) — manifest `module` field
- [`internationalization.md`](./internationalization.md) — i18n CI (`pnpm validate:i18n`)
- [`../deployment/runbooks/environment-variables.md`](../deployment/runbooks/environment-variables.md) — env schema, auth switches, deploy overrides
- [`../deployment/runbooks/csp-trusted-types-production.md`](../deployment/runbooks/csp-trusted-types-production.md) — CSP / Trusted Types ops
- [`../integrations/credentials-and-env.md`](../integrations/credentials-and-env.md) — where to get credentials
