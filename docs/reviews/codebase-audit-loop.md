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
