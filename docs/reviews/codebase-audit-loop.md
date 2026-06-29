# Codebase Audit — rolling loop

Living audit log appended by a `/loop` review (every 10 min, rotating perspective).
**Analysis only — no code is changed by the loop.** Each item: Area · Severity ·
Current (file:line) · Suggestion · Pros (+) · Cons (−). Triage/assign as you go.

Severity scale: Critical > High > Medium > Low > Info.

---

## Iteration 1 — Security overview (2026-06-29)

### 1.1 OAuth start URL is navigated to without client-side origin validation

- **Area:** Auth / open-redirect (defense-in-depth)
- **Severity:** Low–Medium
- **Current:** `src/shared/forms/AuthForm/AuthForm.tsx:109` —
  `const url = await authApi.oauthStart(provider); window.location.assign(url);`.
  The full-page redirect trusts whatever URL the backend returns; there is no
  allowlist check on its origin before navigating.
- **Suggestion:** Validate `url`'s origin against the known IdP/provider origins
  (or at least assert `https:` + a configured allowlist) before `assign`. Reuse
  the spirit of `shared/auth/redirect-safety.ts`.
- **+** Closes an open-redirect/phishing vector if the backend is ever tricked or
  misconfigured; cheap, isolated check.
- **−** Backend is the OAuth broker and already controls this URL, so it's
  belt-and-suspenders; an allowlist needs maintenance as providers change.

### 1.2 `ChartStyle` injects CSS via `dangerouslySetInnerHTML`

- **Area:** XSS / CSS-injection surface
- **Severity:** Low
- **Current:** `src/shared/components/ui/chart.tsx:89` —
  `<style dangerouslySetInnerHTML={{ __html: css }} />` where `css` is built from
  `ChartConfig` color values (`buildThemeCss`). Safe today because configs are
  developer-defined, but the values are interpolated into CSS unescaped.
- **Suggestion:** Document/enforce that chart `config` colors are never sourced
  from API/user input; optionally validate color strings against a
  `^#[0-9a-fA-F]{3,8}$|^(hsl|oklch|rgb)\(` pattern before interpolation.
- **+** Prevents a future CSS-injection (`}</style><script>…`) if a config color
  ever becomes data-driven.
- **−** Vendored shadcn file (churn vs upstream); currently a theoretical risk.

### 1.3 PostHog persists to `localStorage+cookie`

- **Area:** Privacy / analytics
- **Severity:** Low
- **Current:** `src/app/analytics/posthog.ts:57` — `persistence: 'localStorage+cookie'`.
  Consent-gated at init, but confirm that **withdrawing** consent clears the
  PostHog `localStorage`/cookie state (not just stops new capture).
- **Suggestion:** On consent withdrawal call `posthog.opt_out_capturing()` +
  `posthog.reset()` (clears stored distinct_id) and verify the keys are gone.
- **+** Aligns with GDPR "withdraw as easily as give"; avoids stale identifiers.
- **−** None significant; small wiring in the consent flow.

### 1.4 `rel` inconsistency on external `target="_blank"` links

- **Area:** Best practice (tabnabbing)
- **Severity:** Info
- **Current:** `ConsentBanner.tsx:48` uses `rel="noreferrer"`;
  `BillingInvoicesTable.tsx:63` uses `rel="noopener noreferrer"`. Both are safe
  (`noreferrer` implies `noopener`), but the codebase is inconsistent.
- **Suggestion:** Standardize on `rel="noopener noreferrer"` for every external
  `_blank` link (lint rule or a small `ExternalLink` wrapper).
- **+** One obvious correct pattern; reviewers stop re-checking.
- **−** Pure consistency; no behavioural change.

### Verified OK (this pass)

- **Access token is memory-only** — no `localStorage`/`sessionStorage` token
  writes found; only an auto-google skip flag and a `safeRedirect`-validated
  returnTo path use `sessionStorage`. Matches `docs/reference/security-model.md`.
- **`QrCode` `dangerouslySetInnerHTML`** (`QrCode.tsx:95`) is locally-generated
  SVG from the otpauth URI, already documented with a `biome-ignore`. Accepted.

### ✅ Resolved (2026-06-29)

All four findings from this pass are fixed, each with a regression test:

- **1.1** — `isSafeExternalHttpsUrl` added to `shared/auth/redirect-safety.ts`;
  `AuthForm` now rejects a non-`https`/malformed OAuth URL before `assign()`.
  Test: `redirect-safety.test.ts`.
- **1.2** — `lib/css-safe.ts` `isSafeCssColor` allowlist guards the chart
  `<style>` interpolation. Test: `css-safe.test.ts`.
- **1.3** — `purgeAnalyticsOnConsentRevoked()` (opt-out + `reset(true)`, no-op
  unless PostHog was active) wired to the `denied` consent decision.
  Test: `capture-consent-decision.test.ts`. (Note: no withdrawal UI exists yet —
  this is the correct behaviour for when a privacy toggle is added.)
- **1.4** — `ConsentBanner` external link standardized to
  `rel="noopener noreferrer"`. Test: `ConsentBanner.test.tsx`.

---

## Iteration 2 — RBAC & tenancy authorization (2026-06-29)

### 2.1 `requirePermission` reads store permissions without asserting the org matches the route

- **Area:** RBAC / tenancy isolation (latent coupling)
- **Severity:** Medium
- **Current:** `src/core/rbac/guards.ts:48` — `requirePermission` does
  `const { permissions } = useOrganizationStore.getState()` and checks
  `hasPermission({ role, permissions }, …)`. It does **not** assert that
  `store.organizationId` matches the org in the route. Correctness depends
  entirely on an earlier guard (`requireOrganizationContext` →
  `ensurePermissionsFor`) having synced the right org's permissions first.
- **Suggestion:** Pass the expected org id into the permission gate (or read it
  from gate context) and fail closed when `store.organizationId` differs —
  mirroring the FE-52 slug check already in `requireActiveOrganization`.
- **+** Removes a silent cross-tenant authorization risk if guards are ever
  reordered/omitted; makes the gate self-contained and unit-testable in isolation.
- **−** Slightly more plumbing (org id into the gate); duplicates a check the
  chain already guarantees today.

### 2.2 `ensurePermissionsFor` keeps stale permissions on a failed cross-org refetch

- **Area:** Tenancy / fail-closed
- **Severity:** Low–Medium
- **Current:** `src/shared/tenancy/organization-membership.ts:72` —
  `if (permissionsLoadedFor === organizationId && store.permissions.length > 0) return; store.setPermissions(await getMyPermissions()); permissionsLoadedFor = organizationId;`.
  On a cross-org navigation the previous org's `permissions` stay in the store
  until the `await` resolves; if `getMyPermissions()` **throws**, the store still
  holds the prior org's permissions and `permissionsLoadedFor` still points at it.
  (Happy path is safe — the chain awaits this before `requirePermission`.)
- **Suggestion:** When `organizationId` differs, clear `permissions` +
  `permissionsLoadedFor` _before_ the fetch, and only set `permissionsLoadedFor`
  after a successful `setPermissions` (already true) — so a failure leaves an
  empty (deny-all) set rather than another org's grants.
- **+** Guarantees fail-closed on a permission-fetch error; no cross-tenant grant
  survives a failed switch.
- **−** A transient empty-permissions flash could 403 a legitimate user mid-load
  (mitigated since the fetch error already surfaces an error boundary).

### 2.3 `super_admin` god-mode trusts the in-memory role

- **Area:** RBAC / client trust boundary (defense-in-depth)
- **Severity:** Low
- **Current:** `src/core/rbac/policies.ts:36` — `if (ctx.role === 'super_admin') return true;`.
  `role` comes from the in-memory auth store (set from the backend token). A
  tampered in-memory role would pass every **client-side** permission check.
- **Suggestion:** Keep it (UI gating is UX only; the backend re-checks), but
  document it as an explicit accepted risk in `security-model.md` and ensure no
  _destructive_ action relies on this client check alone without a server 403 path.
- **+** Confirms the client RBAC is non-authoritative by design; cheap to document.
- **−** None; purely a clarity/assurance note.

### 2.4 Empty-list asymmetry in `hasAllPermissions` / `hasAnyPermission`

- **Area:** RBAC API footgun
- **Severity:** Info
- **Current:** `src/core/rbac/policies.ts:46,59` — `hasAllPermissions([])` is
  vacuously `true`; `hasAnyPermission([])` is `false`. A component/route that
  computes a permission list dynamically and lands on `[]` could accidentally
  authorize via the `All` variant.
- **Suggestion:** Document the asymmetry at the call sites, or add a dev-time
  warning when an empty list is passed to `hasAllPermissions`.
- **+** Prevents an accidental "allow when no permissions required" path.
- **−** Marginal; no current caller passes a dynamic empty list.

### Verified OK (this pass)

- **Guard ordering is correct** — the `$organizationSlug` layout's `beforeLoad`
  runs `requireOrganizationContext` (which `await`s `ensurePermissionsFor`)
  before the child route's `requirePermission`, so the happy path has no stale
  permission window.
- **Default-deny gateway** — `gatewayFromPolicy` always pushes `requireSession`;
  a route that forgets a permission still fails closed (authenticated, not open).
- **`requireActiveOrganization` fails closed** on slug mismatch (FE-52).

### ✅ Resolved (2026-06-29)

All four findings fixed, each with a regression test:

- **2.1** — `requirePermission` takes `expectedOrgSlug`; `requirePermissionGate`
  binds it from `ctx.params.organizationSlug` and fails closed on a tenant
  mismatch. Tests: `guards.test.ts`, `require-permission.test.ts`.
- **2.2** — `ensurePermissionsFor` clears the prior org's grants before a
  cross-org refetch, so a failed switch leaves an empty deny-all set.
  Test: `organization-membership.test.ts`.
- **2.3** — documented as accepted risk #5 in `docs/reference/security-model.md`
  (client RBAC is non-authoritative; backend re-checks). super_admin behaviour
  is already test-locked in `policies.test.ts` / `guards.test.ts`.
- **2.4** — `hasAllPermissions([])` now emits a dev-only warning about the
  vacuous-true footgun. Test: `policies.test.ts`.

---

## Iteration 3 — HTTP client & auth-token resilience (2026-06-29)

### 3.1 429 auto-retry ignores `Retry-After` and pre-empts the RateLimitNotice

- **Area:** HTTP / rate-limit handling
- **Severity:** Medium
- **Current:** `src/core/http/fetch-client.ts:134` — `shouldRetry` returns `true`
  for **every** 429 (all methods), and `doOne` (`:238`) retries using
  `exponentialDelay(retryCount)` — the **server's `Retry-After` header is never
  read**. So the client retries up to `MAX_RETRIES` on its own clock (1s→2s→4s)
  before surfacing the error, likely re-hitting the limit, and delaying the
  `RateLimitNotice` UX that is meant to show 429s to the user.
- **Suggestion:** Either don't auto-retry 429 at all (surface immediately to
  `RateLimitNotice`), or honor `Retry-After` (capped) instead of exponential
  backoff. At minimum, cap 429 retries to 1.
- **+** Stops the client amplifying rate-limit pressure; users see the
  retry-after countdown sooner; respects server intent.
- **−** Read paths lose a transparent auto-recovery on transient 429s; needs the
  `Retry-After` parse (already available via `getRateLimitRetryAfterSeconds`).

### 3.2 Network-retry and status-retry are separate loops → retry budget can be exceeded

- **Area:** HTTP / resilience (load amplification)
- **Severity:** Low–Medium
- **Current:** `fetch-client.ts:187` — `attemptFetch` retries **network** errors
  on its own `retryCount` recursion; `doOne` (`:219`) retries **5xx/429** by
  calling `doOne(retryCount + 1)` → a fresh `attemptFetch`. The two loops both
  key off `retryCount` but are independent, so a request that mixes network +
  5xx failures can issue more than `MAX_RETRIES` attempts (worst case ≈
  `(MAX_RETRIES+1)²`).
- **Suggestion:** Track a single total-attempt counter (or a deadline budget)
  threaded through both paths so retries are globally bounded.
- **+** Predictable, bounded outbound load against a failing/slow backend.
- **−** Small refactor of the retry recursion; needs tests for the mixed
  network-then-5xx case.

### 3.3 Timeouts (`AbortError`) are retried like connection errors

- **Area:** HTTP / latency
- **Severity:** Low
- **Current:** `fetch-client.ts:197` — `err.name === 'AbortError'` (the
  `fetchWithTimeout` deadline) is classed as `isNetworkError` and retried for
  idempotent methods. A slow endpoint therefore burns `timeout × attempts` plus
  backoff before failing (compounded by 3.2).
- **Suggestion:** Distinguish a timeout from a connection error; retry timeouts
  fewer times (or not at all) and/or enforce an overall request deadline.
- **+** Faster, more predictable failure on a degraded endpoint; less piled
  latency for the user.
- **−** Loses a retry that occasionally recovers a one-off slow response.

### 3.4 Response envelope is cast, not validated, at the HTTP boundary

- **Area:** Input validation / type-safety (HTTP layer)
- **Severity:** Low
- **Current:** `fetch-client.ts:57,276` — `isEnvelope` only checks that a `data`
  key exists; the payload is then returned as `parsed.data as T` — an unchecked
  cast. Runtime correctness depends entirely on each caller doing `schema.parse`
  (some do, some don't).
- **Suggestion:** Keep per-endpoint Zod `parse` on security/integrity-critical
  reads (the documented convention) and add a lint/CI note; optionally accept an
  optional schema in the client for opt-in validation.
- **+** Closes the gap where a drifted server shape silently flows in as the
  wrong TS type.
- **−** Per-endpoint Zod has a (small) runtime cost; a generic client schema hook
  adds API surface.

### Verified OK (this pass)

- **401 refresh is loop-safe** — single-flight `refreshAccessToken` + one replay;
  a second 401 after a fresh token → `forceLogout` (`:226`), never a refresh loop.
- **Idempotency-Key is minted once per logical request** (`:185`) and reused
  across retries + the post-refresh replay, so the server can de-dupe writes.
- **Timeout handle is cleared in `finally`** (`:99`) — no dangling timer.
- **POST/PATCH are not retried on 5xx** (not in `IDEMPOTENT_METHODS`) — safe
  default even though the idempotency key would technically allow it.

### ✅ Resolved (2026-06-29)

3.1–3.3 fixed by unifying the retry path in `fetch-client.ts` (one `run` loop
with a single attempt budget; success-body parsing extracted to `parseJsonBody`).
Each with a regression test in `fetch-client.test.ts`:

- **3.1** — `nextRetryDelay` honors `Retry-After` for a 429, at most once and
  only within `HTTP.MAX_RETRY_AFTER_MS` (5s); otherwise surfaces to
  `RateLimitNotice` immediately. Tests: 429 with/without/over-cap Retry-After.
- **3.2** — connection-error and bad-status retries now share one `attempt`
  counter, so total attempts are bounded by `MAX_RETRIES + 1`. Test: mixed
  connection + 5xx failures stay within budget.
- **3.3** — `classifyFetchError` distinguishes `timeout` (AbortError) from
  `connection`; timeouts are no longer retried. Test: AbortError → single call.
- **3.4** — left as a convention note (per-endpoint Zod `parse` stays the guard);
  no code change.

---

## Iteration 4 — React purity & state correctness (2026-06-29)

### 4.1 Data-table URL state is seed-once → back/forward doesn't restore the view

- **Area:** React state / URL as source-of-truth
- **Severity:** Low–Medium
- **Current:** `src/shared/hooks/useDataTableUrlState/useDataTableUrlState.ts:55`
  — `initialSorting` is memoized on `[enabled]` only (URL `search.sort`
  deliberately excluded), and `initialPageIndex/Size` (`:70`) feed TanStack
  Table's `initialState`, which the table reads **once** at mount. So a deep
  link works, but an in-session URL change (browser back/forward, or another
  control editing `?sort=`/`?page=`) does **not** update the table — the table
  becomes the source of truth after mount and the URL only flows one way out.
- **Suggestion:** Either make the table controlled (drive `state` from the URL
  each render, not just `initialState`), or add a keyed remount / effect that
  re-syncs table state when the relevant search params change.
- **+** Back/forward and shared in-app links restore the exact table view;
  removes the seed-vs-source ambiguity.
- **−** Controlled tables are more wiring and re-render on each URL patch; risk of
  a write→URL→read loop if not de-duped.

### 4.2 `new Date()` is called during render

- **Area:** React purity
- **Severity:** Low
- **Current:** `DashboardHero.tsx:64`
  (`new Date().toLocaleDateString(...)`) and
  `AppLayout/variants/AppLayoutSidebar.tsx:113`
  (`new Date().getFullYear()`) read the clock **in render** — impure, recomputed
  on every render, and not reactive (won't roll over at midnight without an
  unrelated re-render).
- **Suggestion:** Compute once (module-level for the year, `useMemo` for the
  date) or, if a live date is wanted, a small `useNow`-style hook.
- **+** Pure render; the React Compiler can memoize the subtree; no surprise
  recompute.
- **−** Trivial gain; a midnight-accurate date needs an explicit timer anyway.

### 4.3 Stripe return params are read imperatively in a mount effect, not via the router

- **Area:** React state / effects
- **Severity:** Low
- **Current:** `AccountBillingPanel.tsx:99` and
  `BillingPaymentMethods/BillingPaymentMethods.tsx:76` read Stripe redirect
  params from `window.location` inside a `[]` effect and `setState`
  (the two `react-hooks/set-state-in-effect` suppressions). They consume-once via
  `clearStripeBillingReturnParams()`, but bypass the router's typed `search`.
- **Suggestion:** Read the return params from the route's `validateSearch`
  schema (typed, testable) and derive the panel state from it, clearing via a
  `navigate({ search })` instead of imperative URL mutation.
- **+** Removes the imperative `window.location` read + the effect-setState
  pattern; one source of truth for URL state; unit-testable without globals.
- **−** Needs the billing route search schema to model the Stripe return params;
  a bit more route plumbing.

### 4.4 `initialFilters` recomputes on every search change but is consumed once

- **Area:** React / dead work
- **Severity:** Info
- **Current:** `useDataTableUrlState.ts:61` — `initialFilters` is memoized on
  `[enabled, search.q, search.role]`, so it recomputes whenever those params
  change, yet TanStack Table only reads `initialState` at mount. The
  recomputation has no effect after mount (and misleadingly _looks_ like it
  re-syncs, unlike the deliberately-frozen `initialSorting`).
- **Suggestion:** Memoize on `[enabled]` for consistency with `initialSorting`
  (and resolve 4.1 if real re-sync is wanted).
- **+** Removes confusing dead recomputation; consistent seeding story.
- **−** None; purely a clarity fix.

### Verified OK (this pass)

- **`RateLimitNotice` reset-on-prop** uses the render-time "adjust state on prop
  change" pattern (fixed earlier), not a `setState`-in-effect cascade.
- **`react-hooks/incompatible-library` suppressions** on `MembersTable` /
  `InvitationsTable` are legitimate — TanStack Table returns intentionally
  non-memoizable callbacks; not a bug.
- **`new Date().toISOString()` in `RecoveryCodesPanel`** is inside a
  download-builder invoked from a click handler, not render — correct.

---
