# Core-FE → Core-BE Integration Plan (Backend API Wiring)

**Project**: core-fe — Enterprise Multi-Tenant Admin Dashboard
**Backend**: core-be `v4.9.0-dev.0` (`docs/openapi/openapi.json`, 92 paths)
**Date**: 2026-06-20
**Status**: Plan — not yet executed
**Supersedes**: `research/06-master-todo-plan.md` P0-1/P0-2 (which assumed a naive `mockResponse → apiClient.get(res.data)` swap — that swap is **wrong**; see Findings).

---

## 0. Why this plan exists (read first)

The original audit (`research/01..05`) reviewed the FE **in isolation** and concluded backend wiring was "mechanical — replace `mockResponse()` with `apiClient` calls." Cross-checking the FE against the **actual `core-be` source DTOs** (not just the OpenAPI spec, which is thin for the keystone endpoints) revealed the FE was built against an **assumed contract that does not match the real backend**. Five structural mismatches make the integration a focused re-architecture of the data + tenancy layer, not a find-and-replace.

### The five findings (evidence-backed)

| #        | Finding                                                                                                                                                                                                                                                                                                                                                                                                     | Impact                                                                                                                           | Evidence                                                                                                                                 |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **MM-1** | **Server-side active-org model.** Org is a signed JWT `org` claim, set via `POST /auth/switch-to-organization` (re-mints the access token). No `{orgId}` in any tenancy path; endpoints are singular `/tenancy/organization/*`.                                                                                                                                                                             | FE's "orgId-in-URL, no switch" design 403s on every org call. Contradicts `CLAUDE.md`'s _"org context travels in the URL path."_ | `core-be` `jwt.util.ts` (`org` claim), `auth.service.ts:350` (`mintForActiveOrganization`), `auth.middleware.ts`, `tenant.middleware.ts` |
| **MM-2** | **Response envelope `{ data, meta:{request_id, pagination?} }`.** `apiClient` already wraps in its own `{ data }`, so callers reading `res.data` get the whole envelope. Lists carry cursor pagination in `meta.pagination`.                                                                                                                                                                                | Every live call path double-unwraps; `my-organizations.ts` silently returns `[]`; every `.parse(res.data)` throws.               | BE `response.util.ts:1-27`; FE `fetch-client.ts:237`, `my-organizations.ts:42,76`                                                        |
| **MM-3** | **snake_case + ISO-string dates + decimal-string money** on the wire. FE contracts are camelCase, no transform.                                                                                                                                                                                                                                                                                             | Every Zod `.parse()` fails.                                                                                                      | BE serializers; FE `organization-contracts.ts`, `auth/types.ts`                                                                          |
| **MM-4** | **ID format `^<prefix>_[a-z0-9]{21}$`** (lowercase, fixed 21). FE uses `org_[A-Za-z0-9]{1,32}`, `inv_[A-Za-z0-9]{1,64}`.                                                                                                                                                                                                                                                                                    | Param guards reject real IDs (wrong charset + length).                                                                           | BE `public-id.util.ts`; FE `lib/routes/params.ts`                                                                                        |
| **MM-5** | **Shape/workflow mismatches** (the long tail): permissions come from `GET /auth/me/context` (not per-org); subscriptions are under `/billing/*` with no seats/amount/currency; **invite = create membership → invite by `membership_id`** (not email+role); member list returns **IDs only**; `login` may return `mfa_required`; **no `POST /auth/register`**; org status is `ACTIVE\|SUSPENDED\|ARCHIVED`. | Multiple FE features need re-modelling, not just re-pointing.                                                                    | BE domain DTOs; FE `organization-api.ts`, `auth-api.ts`                                                                                  |

### Decisions taken (2026-06-20)

- **D1 — Org context: "Switch-on-navigation."** Keep `/organization/$organizationId/...` URLs. The org route guard calls `switch-to-organization`, swaps the in-memory token, then reads `/auth/me/context`. **Accepted limitation:** multi-tab cross-org is best-effort — after a token refresh a background tab may adopt the last-switched org (documented; mitigations in F3).
- **D2 — Backend gaps: "Adapt FE + log change-requests."** Adapt the FE to the backend as-is where feasible; track genuine backend gaps in the **Backend Coordination Register** (§7) for the BE team to decide.

### The silver lining

`GET /auth/me/context` returns **user + active_organization (with `status`) + `my_permissions[]` + `global_role` + `organizations[]`** in one call. Wiring it as the context spine simultaneously **fixes three audit findings for free**: the permission race (SC3), the org-status stub (CV-1 was already a false positive, but this makes it real), and the org-list cache (SC2).

### Per-item lifecycle (applies to every TODO below)

> **Problem → Thinking → Proposed solution → Finalized solution → Docs/skills/rules → Tests (unit/integration/security/e2e/load) → Done-summary → Commit.**

Commit convention (per `CLAUDE.md`): conventional-commit subject, footer `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`; one logical change per commit; `pnpm health` green before push.

---

## 1. Milestones (sequencing)

Vertical-slice first — prove the hard model end-to-end before fanning out the repetitive CRUD.

| Milestone                        | Goal                                                      | Items                              | Exit criteria                                                                                                                                    |
| -------------------------------- | --------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **M1 — Foundation + thin slice** | One real org's dashboard works against real BE, with RBAC | F1–F7, R1–R4, D1, D2 (list/create) | Login (+MFA) → pick org → switch → dashboard renders real data; suspended → redirect; permission-gated route → 403; refresh preserves active org |
| **M2 — Org-admin CRUD**          | Members, invitations, roles, API keys                     | D3, D4, D5, D6                     | Each panel CRUD works against real BE; coordination items filed                                                                                  |
| **M3 — Billing + account**       | Subscriptions, plans, profile, settings, notifications    | D7, D8                             | Billing + account settings work against real BE                                                                                                  |
| **M4 — Hardening**               | Caching, resilience, docs, E2E, load                      | C1–C2, §5 docs, §6 tests           | E2E green; load baseline captured; docs/skills/rules updated; mock layer dev-only                                                                |

Effort (rough, FE-side, assuming BE endpoints exist): M1 ≈ 1.5–2 wks, M2 ≈ 1.5 wks, M3 ≈ 1 wk, M4 ≈ 1 wk.

---

## 2. Foundation work (F) — must land before any domain

### F1 — Envelope unwrap + pagination in the HTTP layer

**Problem.** BE returns `{ data, meta:{request_id, pagination?} }`. `apiClient.get<T>()` returns `{ data: JSON.parse(body) }`, so `res.data` is the _envelope_, not the payload. Every caller double-unwraps; lists lose pagination.

**Thinking.** Two options: (a) fix once in `apiClient` (unwrap `.data`, surface `meta`), or (b) unwrap per-call. (a) is the single highest-leverage fix and keeps every call site clean. Risk: `apiClient` is also used by the (currently unused) `http-data-provider`; both must agree. Auth uses raw `authFetch` (not `apiClient`) and must be handled separately (F7/D1).

**Proposed solution.** Change `apiClient` request core to parse the BE envelope and return the **payload** as `data`, plus expose `meta`. Concretely:

- `request<T>()` parses `body`, validates `{ data, meta }` envelope shape (loose: `data` present, `meta.request_id` string), returns `{ data: body.data as T, meta: body.meta }`.
- Add a typed `Paginated<T>` helper: `{ items: T[]; pageInfo: { perPage; next: string|null; hasMore: boolean; estimatedTotal?: number } }` derived from `data` (array) + `meta.pagination`.
- Non-JSON / 204 responses: return `{ data: undefined, meta: undefined }` (see F6 for content-type guard).
- Keep `X-Request-ID`, idempotency-key, bearer, `credentials:'include'` untouched. **Do not** add `X-Organization-ID` (BE confirms it is vestigial; FE tripwire test stays).

**Finalized solution.** Centralized unwrap in `apiClient` + `Paginated<T>` helper. `core/data-provider/http-data-provider` updated to the new return shape in the same change.

**Docs/skills/rules.** `CLAUDE.md` → HTTP/API section: document the `{data, meta}` envelope, the single unwrap, and `Paginated<T>`. `code-structure` skill: note contracts parse the **payload**, not the envelope.

**Tests.**

- _Unit_: envelope unwrap returns payload; `meta.request_id` surfaced; list → `Paginated<T>` mapping (`next`/`has_more`/optional `estimated_total`); 204/empty body → `undefined` data; malformed envelope → `HttpError`; **regression: `res.data` is the payload, not `{data,meta}`** (the double-unwrap guard).
- _Integration_: a real (recorded) list response flows through to a component with pagination.
- _Security_: tripwire — no `X-Organization-ID` header still holds (`fetch-client.test.ts`).
- _Load_: n/a.

**Done-summary template.** "apiClient now unwraps the BE `{data,meta}` envelope and exposes `Paginated<T>`; all callers read the payload directly; double-unwrap regression test added."

**Commit.** `feat(http): unwrap core-be {data,meta} envelope + Paginated<T> helper`

---

### F2 — snake_case ↔ camelCase contract strategy

**Problem.** Wire is snake_case + ISO strings + decimal-string money; FE types/UI are camelCase. No transform exists, so `.parse()` fails (MM-3).

**Thinking.** Options: (a) adopt snake*case throughout the FE (huge UI churn), (b) Zod schemas keyed to snake_case with `.transform()` to existing camelCase domain types at the API boundary (localized churn, UI unchanged), (c) a generic deep snake→camel codec (loses Zod precision, risky on `id` fields like `org*…` vs date coercion). (b) is the standard, type-safe approach and matches the repo's "contracts.ts = Zod source of truth" convention.

**Proposed solution.** For each domain, define **wire schemas** (snake_case, matching the serializer exactly) and `.transform()` into the camelCase domain type the UI already consumes. Coerce dates to `string` (keep ISO; format in UI) and money decimal-strings to a typed `Money`/cents at the boundary where the UI needs numbers (billing). Re-infer all FE types from the transformed schema. Where a FE type can simply become snake-aligned cheaply (new code), do that instead of a transform.

**Finalized solution.** Wire-schema + `.transform()` per domain, colocated in the existing `*-contracts.ts` files. One shared `isoDateString`, `decimalString`, and `publicId(prefix)` Zod helpers in `core/types/` to avoid drift.

**Docs/skills/rules.** `CLAUDE.md` TypeScript section: "contracts parse snake_case wire shapes and transform to camelCase domain types." Add the three Zod helpers to the contracts conventions.

**Tests.**

- _Unit_: each helper (`publicId` accepts `org_<21>`, rejects uppercase/wrong-length; `isoDateString`; `decimalString`→cents); a representative transform (snake in → camel out, nullable fields, optional `estimated_total`).
- _Integration_: covered via each domain's parse test.
- _Load_: n/a.

**Commit.** `feat(contracts): snake_case wire schemas + camelCase transforms + shared zod helpers`

---

### F3 — Active-org "switch-on-navigation" + token swap

**Problem.** Org context must be set server-side via `switch-to-organization` (re-mints token). FE has no switch call; org-scoped calls will 403 (MM-1, D1).

**Thinking.** The switch must happen **before** any org-scoped fetch on entering an org, and the **new access token must replace the in-memory token atomically** (old token carries the old `org` for ≤15 min). Natural insertion point: inside `requireOrganizationContext` (the org-shell `beforeLoad`), between membership validation and permission load. Token swap must coordinate with the proactive refresh timer (re-schedule on new token) and the single-flight refresh lock (don't switch mid-refresh). Multi-tab caveat (D1): after a refresh, a background tab resolves to the session's persisted active org; mitigate by re-asserting switch when the org-route guard runs (cheap idempotent call) and optionally on `visibilitychange`/focus for the foreground org.

**Proposed solution.**

- New `shared/auth/switch-organization.ts`: `switchToOrganization(orgId)` → `POST /auth/switch-to-organization {organization_id}` → `setAccessToken(data.access_token)` → `scheduleTokenRefresh()`. `switchToPersonal()` analogous. Both go through `apiClient` (writes carry idempotency key automatically) but must **not** recurse through the 401 refresh path inappropriately — guard with the existing single-flight.
- `requireOrganizationContext(orgId)` becomes: parse param → `switchToOrganization(orgId)` (this both **sets context** and **authorizes membership**: BE returns 403 for non-members → map to `notFound()` to preserve the no-leak pattern) → fetch `/auth/me/context` → sync store (active org, status, permissions). `findMembership` via `listMyOrganizations` is no longer the authority (becomes a pre-check / org-picker source only).
- On switch failure: 403/404 → `notFound()`; network/5xx → error boundary.

**Finalized solution.** Switch-in-guard + atomic token swap; membership authorization delegated to the BE switch response (403→404 map). Re-assert switch on every org-route `beforeLoad` (idempotent) to keep the foreground tab's token aligned. Multi-tab limitation documented.

**Docs/skills/rules.** **`CLAUDE.md` Routing/Auth sections: replace the "organization context travels in the URL path" axiom** with the switch-on-navigation model (URL is the _display_ source of truth; server active-org is set per navigation). `docs/reference/routing-and-tenancy.md`: rewrite the org-context flow + multi-tab caveat. `src/app/guards/GUARDS.OVERVIEW.md`: update the guard chain. `route-island` skill: note org guards perform a switch.

**Tests.**

- _Unit_: `switchToOrganization` swaps token + reschedules refresh; 403 → mapped error; failure does not clobber existing token.
- _Integration_: entering `/organization/$id/...` triggers switch then me/context; non-member org → 404 (no existence leak, same as invalid id); rapid A→B navigation ends with B's token + B's permissions (no race); 401 mid-session refresh preserves active org (BE rebinds), token still valid.
- _Security_: token remains memory-only after switch (never localStorage); switch response token is not broadcast cross-tab; non-member switch yields 404 not 403-with-info.
- _E2E_: pick org A → switch to org B via switcher → data + permissions reflect B.
- _Load_ (k6): concurrent switch + refresh on one session (single-flight holds; no refresh-reuse kill).

**Commit.** `feat(tenancy): switch-on-navigation active-org with atomic token swap`

---

### F4 — `/auth/me/context` as the context spine

**Problem.** FE scatters context across `getMyPermissions`, `findMembership`, `listMyOrganizations`, store writes. BE consolidates into one endpoint; permissions are NOT in the JWT and must be re-fetched after switch (MM-5).

**Thinking.** `me/context` returns `{ user, active_organization|null, my_permissions[], global_role|null, organizations[] }`. This should drive `useAuthStore` (user, global role) and `useOrganizationStore` (active org id/slug/status, permissions) and the org picker (`organizations[]`). `active_organization: null` is a valid state → org picker / onboarding. Must be re-fetched after every switch (F3) and on boot (after silent refresh).

**Proposed solution.**

- New `shared/tenancy/me-context.ts`: `fetchMeContext()` → typed `MeContext` (wire schema + transform).
- Boot: after `silentRefresh()`, call `fetchMeContext()` to hydrate stores (replaces `getCurrentUser` for the context fields; `/users/me` still used for full profile in account settings).
- `ensurePermissionsFor` removed; permissions come from `meContext.my_permissions` after switch (kills the module-level race, SC3).
- `useOrganizationStore`: ensure `organizationStatus` maps `ACTIVE|SUSPENDED|ARCHIVED` (lowercase or keep upper — pick one; recommend keep BE casing and update the guard comparison).
- Org status enum: extend FE `organizationSchema.status` to `active|suspended|archived` (or upper) — currently only `active|suspended`.

**Finalized solution.** `fetchMeContext()` is the single hydration source for auth+org context, called on boot and after each switch; `ensurePermissionsFor` deleted.

**Docs/skills/rules.** `CLAUDE.md` Auth/State sections: me/context is the context spine. `docs/reference/routing-and-tenancy.md`: permissions/status provenance. Note SC3 (permission race) is resolved by design.

**Tests.**

- _Unit_: `MeContext` transform (null active org; full org list with `is_active`; permission list; archived status).
- _Integration_: boot → silent refresh → me/context → stores hydrated; switch → me/context re-fetch → permissions change; `active_organization:null` → redirect to picker/onboarding.
- _Security_: permissions only ever come from me/context (no client-trust); super_admin global role bypass still honored by `hasPermission`.
- _Load_: me/context latency under concurrent switches.

**Commit.** `feat(tenancy): adopt /auth/me/context as the auth+org context spine`

---

### F5 — Public-ID param schema fix

**Problem.** FE param regexes reject real IDs (MM-4): backend is `^<prefix>_[a-z0-9]{21}$`.

**Thinking.** `params.ts` has `organizationIdParamSchema` (`org_[A-Za-z0-9]{1,32}`) and `invitationIdParamSchema` (`inv_[A-Za-z0-9]{1,64}`). Both wrong charset (allow uppercase) and length. Use the shared `publicId(prefix)` helper from F2.

**Proposed solution.** Replace both regexes with `publicId('org')` / `publicId('inv')` → `^org_[a-z0-9]{21}$` / `^inv_[a-z0-9]{21}$`. Audit any other place that validates/derives IDs (org store, builders).

**Finalized solution.** All ID validation routes through `publicId(prefix)`; param schemas updated; preserve `notFound()` on mismatch.

**Docs/skills/rules.** None beyond F2.

**Tests.**

- _Unit_: accepts canonical 21-char lowercase id; rejects uppercase, 20/22-char, missing prefix, empty.
- _Integration_: `/organization/ORG_…` (uppercase) → 404; `/organization/org_<21>` → resolves.
- _Security_: path traversal / injection strings still rejected (regex is strict).

**Commit.** `fix(routing): align public-id param schemas with core-be (_[a-z0-9]{21})`

---

### F6 — Error model + content-type alignment

**Problem.** BE returns structured errors and i18n codes (e.g. `errors:insufficientOrganizationPermissions`, `422` validation, `409` conflicts); `authFetch` parses JSON without a content-type guard (MV-3); FE `HttpError` must map cleanly.

**Thinking.** Need: (a) parse BE error envelope into `HttpError` (status + code + safe message; reuse existing `sanitizeServerMessage`), (b) guard `.json()` behind a content-type check (avoid SyntaxError on HTML 502/proxy pages), (c) decide UX for common codes: 403 perms → unauthorized/notFound per context; 409 conflicts (duplicate slug/name, subscription exists) → form errors; 422 → field validation; 429 → retry/backoff (already handled).

**Proposed solution.** Extend error parsing in `fetch-client` + `authFetch` to read the BE error shape; add content-type guard; map a small table of codes→UX. Keep messages sanitized.

**Finalized solution.** Shared error-parsing for both clients; content-type guard; code→UX map documented.

**Docs/skills/rules.** `docs/reference/security-model.md` or a new `docs/reference/api-errors.md`: BE error envelope + FE mapping table.

**Tests.**

- _Unit_: error envelope → `HttpError` (status/code/message); non-JSON body → graceful `HttpError`, not SyntaxError; sanitizer still strips SQL/paths/stacks.
- _Integration_: 403 on a gated action → toast/redirect; 409 duplicate slug on create-org → inline form error; 422 → field errors.
- _Security_: server messages never surface SQL/paths/stack (existing sanitizer test extended).

**Commit.** `feat(http): map core-be error envelope to HttpError + content-type guard`

---

### F7 — Login MFA branching + auth response unwrap

**Problem.** `POST /auth/login` returns **either** `{access_token, session_id}` **or** `{mfa_required, mfa_session_token}`. FE assumes a token always. Auth responses are also enveloped (`{data}`), and `authFetch` parses bare bodies (MM-2/MM-5). No `POST /auth/register` exists.

**Thinking.** `authFetch` must unwrap `data`. Login result is a discriminated union; on `mfa_required` route to `/mfa` carrying `mfa_session_token`; MFA completion is `POST /auth/mfa/login {mfa_session_token, totp_code|recovery_code}` → `{access_token, session_id}`. CAPTCHA (Turnstile) token is expected on login/mfa-login — FE must integrate or BE must allow a dev bypass (coordination). Registration model unknown (no endpoint) → coordination item; for now keep `/register` UI behind a flag or repurpose to invite/OAuth/magic-link.

**Proposed solution.**

- `authFetch` unwraps `{data}` (+ content-type guard from F6).
- `authApi.login` returns `LoginResult = {kind:'token', accessToken, sessionId} | {kind:'mfa', mfaSessionToken}`.
- LoginForm branches: token → set token + me/context (F4) + navigate `/`; mfa → navigate `/mfa` with the session token.
- New `authApi.mfaLogin({mfaSessionToken, totpCode|recoveryCode})`.
- Wire CAPTCHA token into login payload (Turnstile widget) — flag-gated; coordination for dev bypass.
- `register`: gate behind coordination (no BE endpoint) — see §7.

**Finalized solution.** Discriminated login result + MFA-login wiring + enveloped auth unwrap; CAPTCHA + register flagged for coordination.

**Docs/skills/rules.** `CLAUDE.md` Auth: login MFA branch + CAPTCHA note. `docs/reference/security-model.md`: MFA login flow.

**Tests.**

- _Unit_: login token branch; login mfa branch; mfa-login success; enveloped auth unwrap; recovery-code path.
- _Integration_: login→mfa→dashboard happy path; bad TOTP → error; login token → dashboard.
- _Security_: interim `mfa_session_token` never stored as the access token; not persisted; expires.
- _E2E_: full MFA login.
- _Load_: login throttle/CAPTCHA behavior under burst (k6, expect 429s).

**Commit.** `feat(auth): MFA-aware login + enveloped auth responses`

---

## 3. RBAC route wiring (R) — the audit's real finding, now unblocked

### R1 — Enforce `manifest.permission` in route guards

**Problem.** `requirePermission` exists but is never wired into the live route tree (loaders that call it aren't registered). Dashboard declares `permission:'organization:read'` but its `beforeLoad` never checks it (CV-2/V7/V8).

**Thinking.** Permissions are now reliably in the store via me/context (F4). Add a single helper that org routes call in `beforeLoad` after the active-org + status gates. Must early-return on `preload`. Manifest permission values must match the **18 real BE codes** (MM-5).

**Proposed solution.** `requireManifestPermission(manifest)` → `if (manifest.permission) requirePermission(manifest.permission)`. Call it in each org route's `beforeLoad` (dashboard first; future panels as added). Verify each manifest's `permission` against the 18-code catalog.

**Finalized solution.** Helper wired into org-route `beforeLoad`; manifests audited against the BE permission catalog.

**Docs/skills/rules.** `src/app/guards/GUARDS.OVERVIEW.md`; `docs/reference/routing-and-tenancy.md`; `route-island` skill (every leaf sets `permission` + the route enforces it).

**Tests.**

- _Unit_: `requireManifestPermission` no-ops on null, redirects to `/unauthorized` without permission, passes with it; preload early-return.
- _Integration_: member lacking `organization:read` → `/unauthorized`; super_admin bypass; permission-gated panel hidden+blocked.
- _Security_: cannot reach a gated route by direct URL without the permission.

**Commit.** `feat(rbac): enforce manifest.permission in org route guards`

---

### R2 — Real organization status gate

**Problem.** `requireActiveOrganization` reads `store.organizationStatus` with an `?? 'active'` boot fallback (not a stub — CV-1 was a false positive), but the status enum must align to BE `ACTIVE|SUSPENDED|ARCHIVED` and be populated from me/context (F4).

**Thinking.** With F4, `organizationStatus` is set from `active_organization.status` on every switch. Map `SUSPENDED` (and `ARCHIVED`?) → redirect to `/suspended`. Decide `ARCHIVED` UX (likely also blocked; possibly a distinct page later).

**Proposed solution.** Extend the store status type to the three BE values; guard redirects when `!== 'active'/'ACTIVE'`; keep the boot fallback only while context is unsynced (existing org-id guard).

**Finalized solution.** Status sourced from me/context; `SUSPENDED`+`ARCHIVED` → `/suspended`; ARCHIVED-specific surface deferred.

**Docs/skills/rules.** `pages/.../suspended/SUSPENDED.OVERVIEW.md`; routing-and-tenancy doc.

**Tests.**

- _Unit_: status mapping; redirect on suspended/archived; pass on active.
- _Integration_: suspended org → `/suspended`; active → dashboard.
- _Security_: suspended org cannot reach gated routes.

**Commit.** `fix(tenancy): gate org routes on real me/context status`

---

### R3 — `requireFeature` via capabilities/plan

**Problem.** `requireFeature` is an empty stub (never called).

**Thinking.** me/context `active_organization.capabilities` gives type-derived flags (`can_invite_members`, etc.); plan/feature flags would come from billing/subscription or a flags service. For now, implement against `capabilities` + (optionally) plan; this is low-priority (no current call sites).

**Proposed solution.** Implement `requireFeature(feature)` to read `capabilities` (and later plan features); `notFound()` or upsell redirect when absent. Defer real plan-feature gating until billing (D7) lands.

**Finalized solution.** Capability-backed `requireFeature`; plan-feature gating deferred to D7.

**Docs/skills/rules.** GUARDS.OVERVIEW.md.

**Tests.** _Unit_: gates on capability present/absent. _Integration_: capability-gated action hidden. (Low priority.)

**Commit.** `feat(rbac): implement requireFeature via org capabilities`

---

### R4 — Remove the permission race (folded into F4)

**Problem.** `ensurePermissionsFor` uses a module-level `permissionsLoadedFor` (SC3).

**Finalized solution.** Deleted in F4 — permissions come from me/context per switch; no module-level mutable. This item is a **verification + test** task, not separate code.

**Tests.** _Integration_: rapid A→B→A switches never show the wrong org's permissions (the SC3 scenario).

**Commit.** (covered by F4) — add the race regression test under `tests/security/` or colocated.

---

## 4. Domain integration tracks (D)

Each track: rewire mock fns → `apiClient` with the **new contract**, define wire-schema + transform (F2), unwrap envelope (F1), and file coordination items (§7). Common template below; per-domain specifics follow.

> **Per-track lifecycle:** Problem (mock today) → Endpoint mapping → Contract gotchas → Solution (rewire + schema) → Tests (unit parse/transform, integration CRUD, security gate) → Coordination.

### D1 — Auth & session

| FE today                                  | Real BE                                                | Notes                                                 |
| ----------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------- |
| `login` → `POST /auth/login`              | same                                                   | discriminated union (F7); CAPTCHA                     |
| `register` → `POST /auth/register`        | **MISSING**                                            | §7-A                                                  |
| `verifyEmail` → `POST /auth/email/verify` | same                                                   | enveloped                                             |
| `mfaVerify` (interim token)               | `POST /auth/mfa/login` (mfa_session_token)             | F7 — different param model                            |
| `me` → `GET /users/me`                    | same                                                   | UserOutput (no `role`, `first_name`/`last_name`) — D8 |
| `forgot/reset` → `/auth/password/*`       | same                                                   | enveloped                                             |
| `refresh`/`logout` (`service.ts`)         | `/auth/refresh` (cookie), `/auth/logout` (Bearer, 204) | already close; unwrap + 204                           |
| OAuth callback (`CallbackPage`)           | `/auth/oauth/{provider}/callback`                      | **stubbed** token-exchange — §7-D                     |
| passwordless (magic-link, webauthn)       | `/auth/magic-link/*`, `/auth/webauthn/*`               | currently inline stubs                                |

**Tests.** unit (each parser + token/mfa branch), integration (login/mfa/refresh/logout/password-reset/email-verify flows), security (token memory-only; refresh single-flight; 401 replay), e2e (login, MFA, OAuth), load (login throttle).

### D2 — Organizations & tenancy

| FE today                                                             | Real BE                                             |
| -------------------------------------------------------------------- | --------------------------------------------------- |
| `listMyOrganizations` → `GET /tenancy/organizations` (assumed array) | same, **paginated** (`Paginated<Organization>`)     |
| `createOrganization` → `POST /tenancy/organizations {name,slug}`     | same, **201**, Idempotency-Key (auto)               |
| (new) current org                                                    | `GET /tenancy/organization`                         |
| (new) patch org                                                      | `PATCH /tenancy/organization {name?,slug?,status?}` |
| (new) by-slug                                                        | `GET /tenancy/organizations/by-slug/{slug}`         |

**Contract.** `Organization = {id, name, slug:string\|null, type:'PERSONAL'\|'TEAM', status:'ACTIVE'\|'SUSPENDED'\|'ARCHIVED', logo_url:string\|null, capabilities, created_at, updated_at}` (spec omits `type`+`capabilities`+nullable slug — **trust the serializer**). Slug pattern `^[a-z0-9]+(?:-[a-z0-9]+)*$`.
**Tests.** unit (Organization transform incl. null slug, PERSONAL, all 3 statuses; paginated list mapping; create 201), integration (list→picker; create→appears; suspend via patch), security (non-member orgs absent from list).

### D3 — Memberships

| FE today                      | Real BE                                                                    |
| ----------------------------- | -------------------------------------------------------------------------- |
| `listMembers`                 | `GET /tenancy/organization/memberships` (`membership:read`) — **IDs only** |
| `updateMemberRole({role})`    | **NOT supported** — PATCH only updates `status`                            |
| `updateMemberStatus`          | `PATCH .../memberships/{id} {status}`                                      |
| `removeMember`                | `DELETE .../memberships/{id}` → 204                                        |
| (new) my perms for membership | `GET .../memberships/{id}/permissions` → `{permissions:[]}`                |

**Contract.** `Membership = {id(mem_), user_id, organization_id, role_id, status:'INVITED'\|'ACTIVE'\|'SUSPENDED', joined_at:string\|null, created_at, updated_at}`. **No user name/email/avatar; no role-change endpoint.**
**Coordination (§7-B, §7-E):** member-list enrichment (names/emails) + role assignment mechanism. FE interim: resolve role_id→role name from `listRoles`; user identity TBD (placeholder or extra fetch).
**Tests.** unit (Membership transform; status enum), integration (list members; change status; remove), security (`membership:manage` gate on mutations).

### D4 — Invitations

| FE today                          | Real BE                                                                                                     |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `createInvitation({email, role})` | `POST .../invitations {membership_id, expires_in_days?}` → 201 `{invitation}` — **two-step, no email/role** |
| `listInvitations`                 | `GET .../invitations` (`include_total?`)                                                                    |
| `revokeInvitation`                | `DELETE .../invitations/{id}` → 204                                                                         |
| `resendInvitation`                | `POST .../invitations/{id}/resend {expires_in_days?}` → `{invitation}`                                      |
| (new) pending (user)              | `GET /tenancy/invitations/pending`                                                                          |
| `acceptInvitation`                | `POST /tenancy/invitations/{id}/accept {token}` → bare `Invitation` (user-only)                             |
| (new) decline                     | `POST /tenancy/invitations/{id}/decline` → 204                                                              |

**Contract.** `Invitation = {id(inv_), membership_id, email, expires_at, accepted_at:string\|null, revoked_at:string\|null, created_at}`. **No `status` (derive: revoked→declined/revoked; accepted; expired; else pending), no `role`, token never returned.** Create/resend wrap in `{invitation}`; accept is bare.
**Coordination (§7-C):** invite-by-email convenience; accept needs the raw token (from the email link → `/accept-invite` reads `?token=`). The `/accept-invite/$invitationId` route must read a `token` search param.
**Tests.** unit (Invitation transform + status derivation from timestamps; wrapped vs bare unwrap), integration (create membership→invite; resend; revoke; pending list; accept w/ token; decline), security (`invitation:manage` gate; accept restricted to matching-email user).

### D5 — Roles & permissions

| FE today                                     | Real BE                                                                                                        |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `listRoles`                                  | `GET .../roles` (`role:read`)                                                                                  |
| `createRole({name,description,permissions})` | `POST .../roles {name, description?}` — **no permissions on create**                                           |
| `updateRole({permissions})`                  | `PATCH .../roles/{id} {name?,description?}` + **separate** `PUT .../roles/{id}/permissions {permission_codes}` |
| `deleteRole`                                 | `DELETE .../roles/{id}` → 204 (409 if has members)                                                             |
| (new) catalog                                | `GET /tenancy/permissions` → 18 codes                                                                          |
| (new) role perms                             | `GET .../roles/{id}/permissions` → `[{permission_code}]`                                                       |

**Contract.** `Role = {id(rol_), name, description:string\|null, is_system:boolean, created_at, updated_at}` (**no permissions array, no member_count**). Permission catalog: the **18 codes** (align FE `organizationPermissionSchema` exactly; drop test-only extras). Role-permission set via `PUT {permission_codes:[...]}` (0–200).
**Tests.** unit (Role transform; catalog parse = 18 codes; permission set/replace), integration (create role; set permissions via PUT; rename; delete w/ members→409; system role read-only), security (`role:manage` gate; `is_system` not editable/deletable).
**Coordination:** FE role UI must split "edit role meta" from "edit role permissions" (two calls); `member_count` not provided (compute client-side from memberships or §7-B).

### D6 — API keys

| FE today                             | Real BE                                                                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `listApiKeys`                        | `GET .../api-keys` (`api-key:read`) — pagination has **no estimated_total**                                               |
| `createApiKey({name,expiresInDays})` | `POST .../api-keys {name, scopes[], expires_in_days?}` → 201 `{api_key, raw_key}` — **scopes required (real perm codes)** |
| `renameApiKey`                       | `PATCH .../api-keys/{id} {name?, status?}`                                                                                |
| `revokeApiKey`                       | `DELETE .../api-keys/{id}` → 204 (or PATCH status REVOKED)                                                                |
| (new) rotate                         | `POST .../api-keys/{id}/rotate` → 201 `{api_key, raw_key}` (expiry dropped)                                               |

**Contract.** `ApiKey = {id(key_), organization_id, name, key_prefix, last_used_at:string\|null, expires_at:string\|null, status:'ACTIVE'\|'REVOKED', created_at, updated_at}`. **`raw_key` (`ak_[0-9a-f]{64}`) only on create/rotate** (nested `{api_key, raw_key}`); **scopes write-only (never returned).**
**Tests.** unit (ApiKey transform; nested create/rotate unwrap; raw_key shape; no-estimated_total pagination), integration (create with scopes; show secret once; rotate; rename; revoke), security (`api-key:manage` gate; scopes ⊆ caller permissions → else 403; raw_key shown once, not stored).

### D7 — Billing (plans + subscriptions) — biggest remap

| FE today (`/tenancy/.../subscription`)                      | Real BE                                                                               |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `getSubscription()`                                         | `GET /billing/subscriptions` (list, org from JWT) / `GET /billing/subscriptions/{id}` |
| `updateSubscriptionPlan(plan: 'free'\|'pro'\|'enterprise')` | `POST /billing/subscriptions/{id}/change-plan {plan_id}` (`pln_…`)                    |
| (new) create                                                | `POST /billing/subscriptions {plan_id, billing_cycle}`                                |
| (new) cancel/resume                                         | `POST .../{id}/cancel` · `POST .../{id}/resume`                                       |
| (new) plans                                                 | `GET /billing/plans` · `GET /billing/plans/{id}`                                      |

**Contract.** `Plan = {id(pln_), name, description:string\|null, price_monthly:string, price_yearly:string, currency:'USD'..., is_active, created_at, updated_at}` — **no features/limits/seats/interval/slug.** `Subscription = {id(sub_), status:UPPERCASE(8 vals), billing_cycle:'MONTHLY'\|'YEARLY', current_period_start/end, trial_end:string\|null, cancel_at_period_end, canceled_at:string\|null, provider:string\|null, plan_id:string\|null, created_at, updated_at}` — **no seats/seatsUsed/amountCents/currency/renewsAt.** Request `billing_cycle` is **lowercase**, response **uppercase**. PATCH body must be empty `{}`.
**FE remodel.** Drop `Plan` enum + `PLAN_PRICING` + seats from the UI (or source seats elsewhere — §7-F). Map `renewsAt → current_period_end`; pricing from the Plan rows (decimal-string → cents at boundary). Plan selection keys off `pln_…` ids, not enum.
**Tests.** unit (Plan + Subscription transforms; casing; decimal→cents; null plan_id), integration (list plans; view subscription; change plan; cancel/resume; create), security (`subscription:read`/`subscription:manage` gates).
**Coordination (§7-F):** seat model (billing has none); confirm trial/proration UX.

### D8 — User profile, settings, notifications

| FE today                            | Real BE                                                                                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `updateProfile({name?, jobTitle?})` | `PATCH /users/me {first_name?, last_name?, avatar_key?}` — **no name/jobTitle/email**                                                       |
| `me`                                | `GET /users/me` → +`{capabilities, personal_organization_id}`                                                                               |
| (new) avatar                        | `PUT /users/me/avatar {avatar_key}` (JSON) · `DELETE` → 204 (upload bytes via upload domain)                                                |
| (new) settings                      | `GET/PATCH /users/me/settings` → `{is_dark_mode_enabled, is_notifications_enabled, language, preferred_locales[]}`                          |
| (new) notif prefs                   | `GET/PUT /users/me/notification-preferences` → array of `{notification_type, channel(EMAIL\|SMS\|PUSH\|IN_APP), is_enabled}` (full-replace) |
| (new) org notif policies            | `GET/POST/PATCH/DELETE /tenancy/organization/notification-policies` (`pol_` ids)                                                            |

**Contract.** `User = {id(usr_), email, is_email_verified, is_mfa_enabled, first_name:string\|null, last_name:string\|null, avatar_url:string\|null, status:'ACTIVE'\|'LOCKED'\|'SUSPENDED', created_at, updated_at}` (+GET-only `capabilities`, `personal_organization_id`). **No `role` on user.** Update `AuthUser` schema accordingly (split name; drop `role` from `/me` — global role comes from me/context; `organizationId`→`personal_organization_id`).
**FE remodel.** ProfileForm: `name`→`first_name`+`last_name`, remove `jobTitle`; email read-only (no edit endpoint). Settings theme is a **boolean** (`is_dark_mode_enabled`), not a `light|dark|system` enum — reconcile with `useThemeStore` (system option becomes FE-only). Avatar: two-step (upload domain → `avatar_key` → PUT). Notification prefs: tuple array, not a matrix.
**Tests.** unit (User transform; settings boolean theme; notif-prefs array replace), integration (update profile; settings persist; avatar attach/remove; notif prefs round-trip), security (only self mutations; `notification-policy:*` gates on org policies).
**Coordination:** theme `system` reconciliation; avatar upload domain wiring.

---

## 5. Docs / skills / rules to update (explicit register)

| Artifact                                  | Change                                                                                                    | Driven by  |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------- |
| `CLAUDE.md` — Routing                     | **Remove** "org context travels in the URL path"; add switch-on-navigation + multi-tab caveat             | F3, D1     |
| `CLAUDE.md` — HTTP/API                    | Document `{data,meta}` envelope, single unwrap, `Paginated<T>`, snake→camel transforms, switch token swap | F1, F2, F3 |
| `CLAUDE.md` — Auth/State                  | me/context spine; MFA login branch; CAPTCHA; permissions from me/context                                  | F4, F7, R4 |
| `docs/reference/routing-and-tenancy.md`   | Rewrite org-context flow; status provenance; multi-tab limitation                                         | F3, F4, R2 |
| `src/app/guards/GUARDS.OVERVIEW.md`       | New guard chain (switch + me/context + manifest permission)                                               | F3, R1–R3  |
| `docs/reference/security-model.md`        | MFA login, token swap on switch, error model                                                              | F6, F7     |
| **new** `docs/reference/api-errors.md`    | BE error envelope → FE `HttpError` mapping table                                                          | F6         |
| `route-island` skill                      | Org guards perform a switch; leaves set + enforce `permission`                                            | F3, R1     |
| `code-structure` skill                    | Contracts parse payload (post-unwrap), snake→camel transform convention                                   | F1, F2     |
| `knip.jsonc` / `sonar-project.properties` | When mocks deleted, drop mock exclusions; promote contracts to real                                       | M4         |
| Mock map (`CLAUDE.md`)                    | Keep (dev-only) but note real wiring is primary                                                           | M4         |

---

## 6. Test strategy (all layers)

**Frameworks (per `CLAUDE.md`):** Vitest projects `unit` (colocated) + `security` (`tests/security/`); Playwright (`tests/e2e/`); k6 (`tests/load/`). Coverage is a **raise-only ratchet** (currently branches 59 / functions 61 / lines 66 / statements 66) — wiring real code + tests should raise these; never lower. Patch coverage ≥ 80% on changed lines (PR CI).

### Unit (colocated `*.test.ts`)

- Per F2 helper (`publicId`, `isoDateString`, `decimalString`).
- Per domain: wire-schema parse + transform (happy, nullable, enum casing, optional pagination fields, wrapped vs bare unwrap).
- F1 envelope unwrap + `Paginated<T>`; F6 error mapping + content-type guard; F7 login discriminated union; F3 token swap; F4 me/context hydration; F5 id regexes.

### Integration (colocated `__tests__/integration/` + `renderWithProviders`)

- **Guard chain**: switch → me/context → store hydrate; non-member → 404; suspended → `/suspended`; permission-gated → `/unauthorized`; preload early-return.
- **Race**: rapid org A→B→A ends on B's token+permissions (SC3 regression).
- **Refresh**: 401 → single-flight refresh → replay; active org preserved (BE rebind).
- **Flows**: login/MFA/logout; create-org; members status/remove; invite (membership→invite→accept w/ token); roles + permission PUT; api-key create/rotate (secret once); billing change-plan/cancel/resume; profile/settings/notif round-trips.

### Security (`tests/security/`)

- Token memory-only after login **and** after switch (never localStorage/sessionStorage).
- Switch token not broadcast cross-tab; cross-tab logout still kills all tabs.
- No `X-Organization-ID` header (existing tripwire).
- 403/non-member → no existence leak (404 parity).
- Permission gates enforced on direct-URL access.
- API-key `raw_key` shown once, never persisted; scopes ⊆ caller perms.
- Reset/verify tokens scrubbed from telemetry (existing) still hold with real flows.
- Mock-mode rejection in prod/staging (existing) still holds.

### E2E (Playwright)

- Login → org picker → dashboard (real-ish via test API/MSW or staging).
- Switch org via switcher → data reflects new org.
- Suspended org → suspended page. Unauthorized → unauthorized page.
- Invite member end-to-end; manage roles; rotate API key.
- MFA login; OAuth login (when §7-D resolved).

### Load (k6, `tests/load/`)

- `me/context` + `switch-to-organization` under concurrency (token re-mint + single-flight refresh; assert no refresh-reuse session kills).
- Paginated list endpoints (members/invitations/roles) at page sizes up to 100.
- Login burst → expect 429 + CAPTCHA gating; backoff/jitter (pairs with C2).
- Dashboard cold-load p95 within Lighthouse/bundle budgets (existing budgets).

### Tests to update / remove

- **Update**: any test asserting URL-only org context; `requireOrganizationContext` tests (now switches); `organization-membership` tests (ensurePermissionsFor removed); `my-organizations` tests (envelope/pagination); auth tests (envelope + MFA branch); param-schema tests (new regex).
- **Remove**: `ensurePermissionsFor` race-cache tests tied to the module-level variable (replaced by me/context); mock-store tests for any mock deleted in M4.
- **Keep**: token-storage, single-flight refresh, telemetry-scrub, no-org-header, mock-rejection security tests.

---

## 7. Backend coordination register (decision D2)

> ✅ **RESOLVED 2026-06-23 — every item is implemented in core-be (commit `d6b34355` + PR #775). See §11 for the as-built flows. Retained below as history.**

File these with the `core-be` team; FE proceeds with the documented interim where possible.

| ID       | Gap                                                                                          | FE interim                                                         | Ask                                                                                    |
| -------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| **§7-A** | **No `POST /auth/register`**                                                                 | Gate `/register` behind a flag; rely on invite/OAuth/magic-link    | Confirm registration model; add endpoint or document the canonical signup path         |
| **§7-B** | **Member list returns IDs only** (no name/email/avatar; no member_count)                     | Resolve `role_id`→role name via `listRoles`; show partial identity | Enrich membership list (embed user summary) or provide a batch user-lookup for members |
| **§7-C** | **Invite is two-step + by `membership_id`** (no email/role; token not returned)              | Implement create-membership→invite; accept via emailed `?token=`   | Optional invite-by-email convenience endpoint                                          |
| **§7-D** | **OAuth callback token-exchange contract** is FE-stubbed                                     | Keep mock callback in dev                                          | Confirm cookie-set vs body-token contract for `/auth/oauth/{provider}/callback`        |
| **§7-E** | **No role-assignment on membership PATCH** (status only)                                     | Use whatever role assignment exists (TBD)                          | Clarify how a member's role is set/changed                                             |
| **§7-F** | **No seat concept in billing**; plans have no features/limits                                | Drop seats from billing UI                                         | Confirm seat/quota source (or add to plan/subscription)                                |
| **§7-G** | **CAPTCHA (Turnstile) on login/mfa-login**                                                   | Integrate widget; flag for dev                                     | Provide dev bypass / test keys                                                         |
| **§7-H** | **OpenAPI spec omits response schemas** for `me/context`, `switch-to-organization` (+others) | Hand-write FE schemas from serializers                             | Emit response schemas so FE can contract-test against the spec                         |
| **§7-I** | **Theme is a boolean** (`is_dark_mode_enabled`) vs FE `light\|dark\|system`                  | Keep `system` as FE-only preference                                | (Optional) richer theme field                                                          |

---

## 8. Risks & open questions

1. **Multi-tab org independence** is sacrificed (D1). If product needs true per-tab orgs, revisit (would require BE per-request scoping — §MM-1, BE designed against it).
2. **Member identity** (§7-B) blocks a complete members table; interim UX is degraded until resolved.
3. **Registration** (§7-A) — `/register` may be dead until the signup model is confirmed.
4. **CAPTCHA** (§7-G) can block automated E2E/load unless dev keys/bypass exist.
5. **Contract drift**: without spec response schemas (§7-H), FE schemas are hand-derived from source and can drift — add a recorded-fixture contract test as a tripwire.
6. **Token-swap correctness** under concurrent refresh + switch is the trickiest code path; F3 tests + k6 (§6) must cover it before M1 exit.
7. **Coverage ratchet**: large code additions must arrive with tests to keep the raise-only thresholds satisfied (patch coverage ≥80%).

---

## 9. Definition of done (program level)

- [ ] M1 exit criteria met (real login→switch→dashboard with RBAC + status).
- [ ] All `REPLACE_WITH_API` removed from wired domains; mock layer dev-only and rejected in prod/staging.
- [ ] Envelope/snake-case/id-format mismatches resolved (F1/F2/F5) with regression tests.
- [ ] me/context spine live; permission race + org-status findings closed (F4/R2/R4).
- [ ] RBAC enforced on org routes (R1).
- [ ] Docs/skills/rules in §5 updated (esp. the `CLAUDE.md` URL-context axiom).
- [ ] Backend coordination register (§7) filed with owners.
- [ ] `pnpm health` + patch-coverage + E2E green; k6 baseline captured.

---

## 10. Execution breakdown (PR-by-PR)

Verified against working-tree state on 2026-06-20 (your uncommitted WIP does **not** yet implement any item below). M1 is broken into small, independently-reviewable PRs in dependency order. Each PR = one logical commit, must leave `pnpm health` green, ships its own tests, and updates the coverage ratchet upward (never down). M2–M4 are listed at task granularity (each becomes its own small PR when reached).

**Branching:** work off `docs/be-integration-plan` (or a fresh `feat/be-integration` cut from `main`); one branch per PR, squash-merge. Mock mode stays the dev default until M4; every PR keeps the `config.useMockApi` path working so the app is never broken in dev.

### M1 — Foundation + RBAC + thin vertical slice

> **Goal / exit:** real `login (+MFA) → org picker → switch → dashboard` against the live API, with permission + status gating, and refresh that preserves the active org.

---

#### PR-1 — HTTP envelope unwrap + pagination (F1)

- **Problem.** `apiClient.request()` returns `{ data: JSON.parse(body) }`, so `res.data` is the whole `{data,meta}` envelope. Lists lose `meta.pagination`.
- **Files.** `src/core/http/fetch-client.ts` (unwrap `body.data`; surface `meta`); **new** `src/core/http/pagination.ts` (`Paginated<T>` + `toPaginated()` mapper); `src/core/data-provider/http-data-provider/http-data-provider.ts` (consume payload + `meta.pagination`); `src/core/http/fetch-client.test.ts`.
- **Change.** `request<T>()` validates a loose envelope (`data` present, `meta.request_id: string`), returns `{ data: body.data as T, meta }`. 204/empty → `{ data: undefined }`. Keep bearer/idempotency/`X-Request-ID`/`credentials:'include'`; **do not** add `X-Organization-ID`.
- **Acceptance.** `res.data` is the payload; `meta.request_id` reachable; list → `Paginated<T>`; malformed envelope → `HttpError`; **double-unwrap regression test** added.
- **Tests.** _unit_: unwrap, meta, Paginated mapping (`next`/`has_more`/optional `estimated_total`), 204, malformed. _security_: no-org-header tripwire still passes.
- **Commit.** `feat(http): unwrap core-be {data,meta} envelope + Paginated<T>`

#### PR-2 — Shared wire helpers (F2)

- **Files.** **new** `src/core/types/wire.ts` (`publicId(prefix)` → `^<prefix>_[a-z0-9]{21}$`, `isoDateString`, `decimalString`→cents) + `wire.test.ts`.
- **Acceptance.** `publicId('org')` accepts `org_<21 lc>` and rejects uppercase/wrong-length/missing-prefix; date + money helpers round-trip.
- **Tests.** _unit_ only.
- **Commit.** `feat(contracts): shared zod wire helpers (publicId/date/decimal)`

#### PR-3 — Public-ID param fix (F5)

- **Problem (verified).** `params.ts:17` `org_[A-Za-z0-9]{1,32}`, `:30` `inv_[A-Za-z0-9]{1,64}` — wrong charset + length.
- **Files.** `src/lib/routes/params.ts` (use `publicId('org')`/`publicId('inv')`); `params.test.ts`.
- **Acceptance.** canonical 21-char lowercase ids pass; uppercase / 20–22-char / no-prefix → `null` → `notFound()`.
- **Tests.** _unit_ (accept/reject matrix); _integration_ (`/organization/ORG_…` → 404; valid → resolves).
- **Commit.** `fix(routing): align public-id param schemas with core-be (_[a-z0-9]{21})`

#### PR-4 — Error model + content-type guard (F6)

- **Files.** `src/core/http/fetch-client.ts` (parse BE error envelope → `HttpError{status,code,message}`); `src/shared/auth/service.ts` (`authFetch` content-type guard before `.json()`); `src/shared/errors/HttpError.ts` (add `code`); **new** `docs/reference/api-errors.md`; tests.
- **Acceptance.** error envelope → typed `HttpError`; non-JSON (HTML 502) → graceful `HttpError`, not `SyntaxError`; `sanitizeServerMessage` still strips SQL/paths/stacks.
- **Tests.** _unit_ (envelope→HttpError, non-JSON, sanitizer); _integration_ (403→redirect, 409→form error, 422→field errors).
- **Commit.** `feat(http): map core-be error envelope to HttpError + content-type guard`

#### PR-5 — `/auth/me/context` spine + auth/user contract realignment (F4, D1-part)

- **Files.** **new** `src/shared/tenancy/me-context.ts` (`fetchMeContext()` + wire schema/transform); `src/shared/auth/types.ts` (`User`: `first_name`/`last_name`, `is_email_verified`, `is_mfa_enabled`, `status`, drop `role`/`name`; `organizationId`→`personal_organization_id`); `src/shared/api/auth-api.ts` (envelope unwrap; `me`→`/users/me` shape); `src/shared/auth/service.ts` (`silentRefresh` → `fetchMeContext` hydration); `src/shared/store/useAuthStore` (user + global role); `src/shared/store/useOrganizationStore` (status enum `active|suspended|archived`); tests.
- **Acceptance.** boot → silent refresh → me/context hydrates auth+org stores; `active_organization:null` → org picker/onboarding; permissions populated from `my_permissions`.
- **Tests.** _unit_ (MeContext transform: null org, archived, perms); _integration_ (boot hydration; null-org redirect).
- **Commit.** `feat(tenancy): adopt /auth/me/context as auth+org context spine`

#### PR-6 — Switch-on-navigation + token swap (F3, R4)

- **Problem (verified).** `route-guards.ts:33` resolves org via `findMembership` + `ensurePermissionsFor` (module-level race) with **no switch**; org calls will 403.
- **Files.** **new** `src/shared/tenancy/switch-organization.ts` (`switchToOrganization(orgId)` → POST switch → `setAccessToken` → `scheduleTokenRefresh`; `switchToPersonal()`); `src/app/guards/route-guards.ts` (`requireOrganizationContext` = parse → `switchToOrganization` (403→`notFound()`) → `fetchMeContext` → store sync); `src/shared/tenancy/organization-membership.ts` (delete `ensurePermissionsFor`/`permissionsLoadedFor`; `findMembership` → picker-source only); `src/shared/tenancy/organization-context.ts` (status `archived`; fix stale "org header" docstring); tests.
- **Acceptance.** entering an org route switches + swaps token + hydrates that org's perms; rapid A→B→A ends on the correct org (no race); non-member → 404 (no leak); token stays memory-only.
- **Tests.** _unit_ (token swap + reschedule; 403 map; failure doesn't clobber token); _integration_ (switch→me/context; **SC3 race regression**; 401 refresh preserves active org); _security_ (token memory-only after switch; not broadcast).
- **Commit.** `feat(tenancy): switch-on-navigation active-org with atomic token swap`

#### PR-7 — MFA-aware login + enveloped auth (F7, D1)

- **Files.** `src/shared/api/auth-api.ts` (`login` → discriminated `LoginResult`; **new** `mfaLogin`; unwrap `{data}`); `src/shared/api/auth-contracts.ts`; `src/pages/login/forms/LoginForm/LoginForm.tsx` (branch token vs mfa); `src/pages/mfa/forms/MfaForm/MfaForm.tsx` (`/auth/mfa/login`); CAPTCHA token behind a flag (§7-G); tests.
- **Acceptance.** login token → dashboard; login `mfa_required` → `/mfa` (carry `mfa_session_token`) → mfa-login → dashboard; bad TOTP → error.
- **Tests.** _unit_ (both branches, recovery-code, envelope unwrap); _integration_ (login→mfa→dashboard; token→dashboard); _security_ (interim mfa token never stored as access token).
- **Commit.** `feat(auth): MFA-aware login + enveloped auth responses`

#### PR-8 — RBAC route wiring (R1, R2, R3)

- **Problem (verified).** `requirePermission` never wired in `routeTree.tsx`; dashboard manifest declares `organization:read` but its `beforeLoad` doesn't enforce it; `requireFeature` empty stub.
- **Files.** `src/app/routes/routeTree.tsx` (add `requireManifestPermission(manifest)` to org-route `beforeLoad`, after status gate, `preload` early-return); `src/app/guards/route-guards.ts` (`requireActiveOrganization` handles `suspended`+`archived`; implement `requireFeature` via `capabilities`); audit each org manifest's `permission` vs the **18-code catalog**; tests.
- **Acceptance.** member lacking `organization:read` → `/unauthorized`; super_admin bypass; suspended/archived → `/suspended`; preload no-ops.
- **Tests.** _unit_ (`requireManifestPermission`; status mapping; feature gate); _integration_ (gated route blocked; bypass); _security_ (no direct-URL bypass).
- **Commit.** `feat(rbac): enforce manifest.permission + real status/feature gates`

#### PR-9 — Organizations domain (D2) + dashboard data

- **Problem (verified).** `my-organizations.ts:42` `Array.isArray(res.data)` breaks on envelope; `:76` `organizationSchema.parse(res.data)` parses envelope; `organizationSchema` has required `slug` + only `active|suspended`.
- **Files.** `src/shared/tenancy/my-organizations.ts` (Paginated list unwrap; create 201; snake→camel transform); `src/shared/api/organization-contracts.ts` (`Organization` wire schema: nullable `slug`, `type PERSONAL|TEAM`, `status ACTIVE|SUSPENDED|ARCHIVED`, `capabilities`); dashboard fetch wiring; tests.
- **Acceptance.** org picker lists real orgs; create returns + appears; PERSONAL (null slug) handled.
- **Tests.** _unit_ (Organization transform incl. null slug/all statuses; paginated list; create 201); _integration_ (list→picker; create flow).
- **Commit.** `feat(tenancy): wire organizations list/create to core-be`

#### PR-10 — M1 docs + axiom correction (part of §5)

- **Files.** `CLAUDE.md` (replace "org context travels in the URL path" → switch-on-navigation; envelope/snake_case/Paginated; MFA login); `docs/reference/routing-and-tenancy.md`; `src/app/guards/GUARDS.OVERVIEW.md`; `docs/reference/security-model.md`; `route-island` + `code-structure` skills.
- **Acceptance.** docs/skills match the implemented model; `pnpm docs:lint` green.
- **Commit.** `docs: switch-on-navigation org model + envelope conventions`

**M1 exit gate:** `pnpm health` green; integration suite covers login/MFA/switch/refresh/RBAC/suspended; one E2E happy path (`login → picker → switch → dashboard`) green against a test API.

### M2 — Org-admin CRUD (one PR per domain)

- **D3 Memberships** — list (IDs-only; resolve role names via D5; **file §7-B/§7-E**), status PATCH, remove, `/permissions`. Tests: transform, CRUD integration, `membership:manage` gate.
- **D4 Invitations** — two-step create (membership→invite by `membership_id`), list (`include_total`), revoke, resend, pending, accept (`?token=` → `/accept-invite`), decline. Derive status from timestamps; wrapped-vs-bare unwrap. **File §7-C.** Tests: status-derivation, full invite/accept flow, gate.
- **D5 Roles & permissions** — roles CRUD (no perms on create), separate `PUT roles/{id}/permissions {permission_codes}`, catalog (`GET /tenancy/permissions` = 18 codes); align `organizationPermissionSchema` to exactly those 18; split role-meta vs role-perms UI. Tests: catalog parse, set-replace, system-role read-only, gate.
- **D6 API keys** — CRUD + rotate; nested `{api_key, raw_key}` on create/rotate (secret shown once); scopes = real perm codes. Tests: nested unwrap, secret-once, scope ⊆ caller perms, gate.

### M3 — Billing + account (one PR per domain)

- **D7 Billing** — plans (decimal-string pricing), subscriptions under `/billing/*` (list/get/create/change-plan/cancel/resume); drop FE `Plan` enum + `PLAN_PRICING` + seats; map `renewsAt→current_period_end`; handle UPPERCASE status + casing trap. **File §7-F.** Tests: Plan/Subscription transforms, casing, change-plan/cancel/resume, gates.
- **D8 Profile/settings/notifications** — `/users/me` (split name; no role/jobTitle; email read-only), avatar key flow, settings (boolean theme — reconcile `useThemeStore` `system`), notification-preferences (tuple-array full-replace), org notification-policies. Tests: transforms, round-trips, self-only gate.

### M4 — Hardening

- **C1 Caching** — `me/context` + org list behind TanStack Query (proper fix for SC2; reinforces SC3). Tests: cache hit/invalidation.
- **C2 Resilience** — retry jitter in `exponentialDelay` (SC4/MV-2); optional circuit breaker.
- **Mocks/config** — delete `organization-mock-store.ts` + fixtures (or keep strictly dev-gated per CLAUDE map); update `knip.jsonc` + `sonar-project.properties`; confirm `useMockApi` hard-off in prod/staging.
- **Tests** — full E2E suite (§6); k6 baselines (`me/context`+switch concurrency; paginated lists; login burst); raise coverage ratchet.
- **Docs** — finish §5 register (`docs/reference/api-errors.md`, remaining skill/rule edits).

### Non-backend quick wins (independent — fold in opportunistically)

These need no backend and can land any time (separately offered earlier): idle-timeout `mousemove`/`scroll` removal, `redirect` validation at `validateSearch`. _(Retry jitter is folded into C2.)_

### Suggested first move

PR-1 → PR-2 → PR-3 are pure FE, fully unit-testable today with zero backend dependency, and de-risk the envelope/casing/id foundation everything else builds on. Recommend starting there even before the `core-be` coordination items (§7) come back.

---

## 11. Backend status update — REQ-1…7 RESOLVED (2026-06-23)

`core-be` shipped the full coordination set in commit **`d6b34355`** ("membership management overhaul, billing seat model & API contract docs (REQ-1–7)") plus PR **#775** (`auth-otp-signup-flows`). **Merged to `dev`; not yet in `origin/main`** — the one residual dependency is getting it onto the FE's target release line. **There are no remaining backend blockers; M1–M3 are all buildable against the real API.** §7 above is retained as history.

### As-built flows (supersede §4 domain tracks where noted)

- **Members embed identity (was D3 / CR-8).** `GET /tenancy/organization/memberships` (and `/:id`) now return — by default (no `expand`), batched (no N+1), `MEMBERSHIP_READ`-gated:
  `{ …membership, user:{ id, email, first_name, last_name, avatar_url }, role:{ id, name }, invitation:{ id, expires_at }|null }` (invitation only on INVITED rows). The members table works directly; the §7-B workaround is dropped.
- **Role change (was D3 / CR-9).** `PATCH /tenancy/organization/memberships/:id { role_id }` (and/or `{ status }`; ≥1 required) → updated membership with embedded `role`. Same privilege-escalation guard as create.
- **Invite = add-member-by-email (was D4 / CR-10). ⚠️ BREAKING:** standalone `POST /organization/invitations` (create) is **removed**. Invite via `POST /tenancy/organization/memberships { email, role_id, expires_in_days? }` (`MEMBERSHIP_MANAGE`, `X-Idempotency-Key`) → provisions a pending user if the email is new, creates an INVITED membership, emails a token. Remaining invitation routes (list/revoke/resend/pending/accept/decline) stay. Accept: `POST /api/v1/invitations/:id/accept { token }` requires auth + **verified email** + email-match → flips ACTIVE. Errors carry `error.reason` = `seat_limit_reached` | `membership_already_exists`.
- **Billing seats/features (was D7 / CR-13).** Plan exposes `features:{…}` + `limits:{ seats:number|null }` (null = unlimited; seeded Free=1/Starter=5/Pro=25). Subscription exposes `seats_total` + `seats_used` (derived from active+invited count). Server-enforced: 409 `error.reason=seat_limit_reached` on add/reactivate over cap; over-cap downgrade auto-suspends excess. FE keeps the seats UI.
- **me/context + switch schemas (CR-4 / CR-5).** Both emit `{data,meta}` schemas in `openapi.json`. ⚠ `active_organization.capabilities` is sent at runtime but **missing from the spec schema** — type-gen from the spec alone misses it; the FE wire schema must add it.
- **Error branching (CR-2).** `code` stays coarse; branch on the additive **`error.reason`** slug on 4xx: `seat_limit_reached`, `membership_already_exists`, `organization_slug_exists`, `invitation_revoked`, `invitation_already_accepted`, `invitation_expired`.

### New auth flows the FE must now support (D1 / D8 additions)

Signup/OTP/magic-link are **OTP-code based** (not link-token). All `{data,meta}`, POST→201, CAPTCHA via `X-Captcha-Token`.

- **`POST /auth/signup` `{ email, password, first_name?, last_name? }`** → `{ access_token, session_id? }` (login-shaped) or `{ mfa_required, mfa_session_token }`. The **same body claims** a pre-provisioned invited row (server decides by inspecting the existing row — no request-side flag); account starts unverified, login allowed pre-verification. 409 `emailAlreadyRegistered` if a real account exists. _(Spec gap: 201 has no response schema — mirror login.)_
- **Email OTP:** `POST /auth/email/verify { email, code (6-digit) }` → `{ message }`, sets verified; `POST /auth/email/resend-verification` (authed) re-issues. (15-min TTL, 5 attempts, 60s cooldown.)
- **Magic-link OTP:** `POST /auth/magic-link/send { email }` → `{ message, expires_in_minutes }` (uniform for new/existing; auto-signs-up unknown email); `POST /auth/magic-link/verify { email, code (6-digit) }` → token + sets verified.
- **Invited-new-user onboarding:** signup(claim) → email/verify → invitations/:id/accept; OR magic-link send→verify (verifies inline) → accept; OR OAuth login (claims + verifies) → accept.

### Personal vs Team organizations (every signup auto-provisions a personal org)

**Auto-provisioning.** Every _completed_ auth flow creates exactly one **PERSONAL** org for the user — idempotent (DB enforces one-per-owner), gated on `PERSONAL_ORGANIZATION_ENABLED`, best-effort (never fails auth): email+password `POST /auth/signup`, OAuth, magic-link, **and all of their invited-account claim paths**. **Exception:** an invited user added by email who has **not yet claimed** (never logged in) has **no** personal org — it's created at claim. So "every user has a personal org" holds only _after_ first auth.

|                  | PERSONAL                   | TEAM                                                                    |
| ---------------- | -------------------------- | ----------------------------------------------------------------------- |
| `type`           | `PERSONAL`                 | `TEAM`                                                                  |
| `slug`           | **null**                   | required kebab                                                          |
| members          | owner only (single-member) | multi-member                                                            |
| per owner        | **at most 1** (DB index)   | up to `MAX_TEAM_ORGANIZATIONS_PER_OWNER`                                |
| `capabilities.*` | all **false**              | all **true**                                                            |
| created via      | auto on signup             | `POST /tenancy/organizations {name,slug}` (forces TEAM; caller = owner) |

**Blocked on a personal org → HTTP 422** (`assertTeamOrganization`, not 403): add-member/invite (`errors:personalOrganizationNoMembers`), create role (`errors:personalOrganizationNoRoles`), transfer-ownership + delete (`errors:personalOrganizationImmutable`). Both org types still give the owner a full-permission `Owner` role — the restriction is by org **type**, not RBAC.

**Surfacing:**

- After a fresh signup the token's active-org claim is the **personal org** (default-active resolver is personal-first), so `me/context.active_organization` is the personal org — **not null**; the user always lands somewhere.
- The personal org **IS included** in `me/context.organizations[]` and `GET /tenancy/organizations` (owner-matched). The switcher must render a list entry with `slug: null` + all-false capabilities; distinguish it by `type === 'PERSONAL'` (or match `personal_organization_id`).
- `GET /users/me` → `personal_organization_id` (null if disabled/unclaimed) + `capabilities { personal_organizations, team_organizations }` (deployment flags).
- `POST /auth/switch-to-personal` (no body) re-mints to the personal org (never 403; 404 only if disabled/missing).

**FE implications (fold into the plan):**

- **Onboarding/resolver (F4):** fresh signup → personal org is active → land on a personal-scoped dashboard, **not** the onboarding/empty state. Route to onboarding only when there is genuinely no active org (team-only deployment, or unclaimed invitee → `switch-to-personal` 404).
- **Org switcher (D2):** group/label **Personal** vs **Team**; "Create organization" (= a TEAM org) is the explicit collaborate CTA; the personal entry has no slug.
- **Member/role/invite UI (D3–D5):** gate by the org's `capabilities` flags (hide/disable on personal); treat a 422 `errors:personalOrganization*` as the backstop, not an auth error.
- **Billing (D7):** hide billing on `type === 'PERSONAL'` (see residual ask #5).

### Residual minor BE asks (non-blocking)

1. Land `auth-otp-signup-flows` on `main` (currently `dev` only).
2. Add a 201 response schema to `POST /auth/signup`.
3. Add `capabilities` to `active_organization` / `organizations[]` in the me/context spec schema.
4. (cosmetic) magic-link route summaries still say "token"; body is an OTP `code`.
5. Decide whether **PERSONAL orgs may have subscriptions/billing** — there is currently **no `assertTeamOrganization` guard in the billing domain**, so personal-org subscription changes aren't type-blocked. If they shouldn't be allowed, add a guard; the FE hides billing on personal orgs regardless.

### Plan impact

- §7 register: **closed** (all resolved; 4 minor residuals above).
- Domain tracks: **D3** simplifies (identity embedded; role-change exists), **D4** simplifies (invite = add-member) **but** gains signup-claim + OTP wiring, **D7** keeps seats, **D1/D8** gain signup/OTP/magic-link/claim flows.
- M1 still starts at **PR-1 → PR-3** (pure FE). No milestone is backend-blocked.

---

## 12. Update — backend shipped on `dev` (2026-06-23, `origin/dev` @ `f8a22e32`)

A re-check against current `origin/dev` (earlier reads were 3 commits stale) confirms the backend is **complete**; §11's residual asks are essentially closed and two FE-facing optimizations landed.

**Shipped:**

- **#788** — `can_manage_billing` capability (TEAM `true` / PERSONAL `false`; rides on every org response incl. `me/context`) + `assertTeamOrganization('BILLING')` on subscription create/change-plan/cancel/resume (personal → **422 `errors:personalOrganizationNoBilling`**). **Both OpenAPI gaps also fixed** (signup 201 schema + `capabilities`/`type` on the org schema). → §11 residual asks **#2, #3, #5 are DONE**. (Org `slug` stays non-nullable in the spec; personal slug is `null` at runtime → FE keys off `type === 'PERSONAL'`.)
- **#789** — **switch** (`switch-to-organization`/`-personal`) now returns the **active-org delta** `{ access_token, active_organization, my_permissions, global_role }`; **accept** (`/tenancy/invitations/:id/accept`) now returns **`organization_id`**.
- **#790** — BE published **`core-be/docs/reference/api/frontend-auth-guide.md`** — the authoritative client-integration guide (token-in-memory, single-flight reactive refresh, envelope single-unwrap, switch = re-mint + swap, header matrix, a full reference `auth.js`). **The FE auth layer should mirror it.**
- Remaining residual: **#1** (land these on `main` for production — currently `dev` only) and **#4** (cosmetic magic-link "token"→"code" wording). Both non-blocking.

**Refinements to fold into the build (supersede where they differ from §3–§11 / research/09):**

1. **Gate on the intersection** — show an action only when the org **capability is available AND** the caller **holds the permission** (research/09 said "or"; the guide says AND). e.g. billing = `can_manage_billing` ∧ `subscription:*`.
2. **Switch is one call** (F3/PR-6): switch → swap in-memory token → repaint from the returned `active_organization` + `my_permissions` → flip `is_active` in the cached `organizations[]`. **No post-switch `GET /auth/me/context`**; re-fetch full context only on cold reload.
3. **Team-join is a straight line**: `accept` → use returned `organization_id` → `switch-to-organization`.
4. **Invited-new-user join** (authoritative): accept requires a **verified** email (`403 errors:invitationRequiresVerifiedEmail`). A brand-new invitee verifies via **magic-link/OAuth** (claims placeholder + verifies + provisions personal org in one step) or **signup + `email/verify {code}`**, then accept→switch. **Don't hard-block the UI on `is_email_verified === false`** — route through verification for the accept action.
5. **Contract tweaks** for the FE Zod layer: notification field is **`message`** (+`data`/`action_url`/`action_label`), not `body`; `GET /users/me` adds optional `is_mfa_enabled` + `capabilities {personal_organizations, team_organizations}` + `personal_organization_id`; public-id prefixes are **2–5 chars** (`am_`, `whk_`, …) over `[a-z0-9]{21}`; error branching uses **`error.reason`** (6 slugs: `seat_limit_reached`, `membership_already_exists`, `organization_slug_exists`, `invitation_revoked`, `invitation_already_accepted`, `invitation_expired`) + `error.code`/`type`/`errors[]`.
6. **Removed invitation routes** (research/09 D4): list/create/pending/decline are gone — **invite = `POST .../memberships {email, role_id}`**, **join = `accept`**. Only revoke + resend remain under `/tenancy/organization/invitations`.

**Net: backend complete on `dev`; no FE blockers. FE work proceeds per §10 (PR-1 → …), with the auth layer mirroring `frontend-auth-guide.md`.**
