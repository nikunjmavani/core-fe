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

---
