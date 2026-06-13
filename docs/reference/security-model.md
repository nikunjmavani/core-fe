# Frontend security model

What the frontend defends against, how, and which risks are **deliberately
accepted** (so they aren't re-litigated in every review). The backend re-checks
everything — frontend controls are defense-in-depth and UX, never the only gate.

## Threats covered

| Threat                           | Control                                                                                                                                                                                                                                                                                                                                                    | Where                                                                                                                                                                                                                                                     |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Token theft via XSS              | Access token in a **module-closure in memory** — never `localStorage`/`sessionStorage`; refresh token is an HttpOnly cookie the JS never reads                                                                                                                                                                                                             | [`shared/auth/token.ts`](../../src/shared/auth/token.ts); test: `tests/security/token-storage.security.test.ts`                                                                                                                                           |
| Script injection (XSS)           | CSP `script-src 'self'` — no `unsafe-inline`/`unsafe-eval`; no `dangerouslySetInnerHTML` in app code; `assetsInlineLimit: 0` (no inlined data URIs)                                                                                                                                                                                                        | header CSP + `index.html` meta; test: `tests/security/static-security-config.security.test.ts`                                                                                                                                                            |
| CSRF on auth endpoints           | `X-Requested-With: XMLHttpRequest` custom header (can't be set cross-origin without a CORS preflight the backend rejects) + `credentials: 'include'`                                                                                                                                                                                                       | [`shared/auth/service.ts`](../../src/shared/auth/service.ts), [`shared/api/auth-api.ts`](../../src/shared/api/auth-api.ts)                                                                                                                                |
| Clickjacking                     | `X-Frame-Options: DENY` + `Content-Security-Policy: frame-ancestors 'none'` (header-delivered — meta CSP ignores it)                                                                                                                                                                                                                                       | [`public/_headers`](../../public/_headers)                                                                                                                                                                                                                |
| Open redirect (post-login)       | `isSafeRedirectPath` rejects absolute URLs, protocol-relative `//`, scheme smuggling, and backslash normalization                                                                                                                                                                                                                                          | [`pages/login/forms/LoginForm/redirect-safety.ts`](../../src/pages/login/forms/LoginForm/redirect-safety.ts); test: `tests/security/redirect-safety.security.test.ts`                                                                                     |
| Stolen-session reuse across tabs | Cross-tab logout broadcast: a dead session (admin-suspend, logout-all, expiry) in one tab clears the in-memory token in **every** open tab                                                                                                                                                                                                                 | [`shared/auth/auth-channel.ts`](../../src/shared/auth/auth-channel.ts)                                                                                                                                                                                    |
| Replay / double-submit           | 401 → **one** refresh + **one** replay (a second 401 = dead session → logout, never a loop); writes carry an `Idempotency-Key` minted once per logical request                                                                                                                                                                                             | [`core/http/fetch-client.ts`](../../src/core/http/fetch-client.ts)                                                                                                                                                                                        |
| Refresh-rotation race            | `refreshAccessToken()` is the **only** `/auth/refresh` caller: a module single-flight collapses concurrent callers (proactive timer + 401s) and a `navigator.locks` Web Lock (`core-auth:refresh`) serializes tabs — parallel refreshes would trip the backend's rotation reuse-detection and kill the session                                             | [`shared/auth/service.ts`](../../src/shared/auth/service.ts)                                                                                                                                                                                              |
| Reset/verify token exposure      | `useConsumedSearchToken` reads `?token=` once and scrubs it from the address bar (`history.replaceState`) — it never lingers in history or copy-pasted links; telemetry scrubs `token` params from every outgoing Sentry/PostHog event for the window before that effect runs                                                                              | [`shared/hooks/useConsumedSearchToken/`](../../src/shared/hooks/useConsumedSearchToken/useConsumedSearchToken.ts), [`lib/telemetry-scrub.ts`](../../src/lib/telemetry-scrub.ts)                                                                           |
| Weak / breached credentials      | Register + reset password gate on a **Have I Been Pwned** k-anonymity check (only a SHA-1 prefix leaves the browser; confirmed breach blocks submit) and show a 0–4 strength meter that penalizes common, identity-derived, and trivially-patterned passwords. Advisory to the user, hard gate on a confirmed breach; the backend enforces the real policy | [`lib/password-breach.ts`](../../src/lib/password-breach.ts), [`lib/password-strength.ts`](../../src/lib/password-strength.ts), [`shared/components/PasswordStrengthMeter/`](../../src/shared/components/PasswordStrengthMeter/PasswordStrengthMeter.tsx) |
| Stale long-lived session         | Absolute session-lifetime cap (`SESSION.MAX_AGE_MS`, 12 h) on top of the idle timeout: a session kept warm by the proactive refresh is force-logged-out once it exceeds the cap, measured from **interactive** auth (not boot refreshes). UX/defense-in-depth — the backend's refresh-session age is the source of truth                                   | [`shared/auth/session-lifetime.ts`](../../src/shared/auth/session-lifetime.ts)                                                                                                                                                                            |
| Leaked internals in error UI     | `sanitizeServerMessage` drops messages that look like SQL, stack traces, or file paths; Sentry receives only `user.id`, never PII                                                                                                                                                                                                                          | [`shared/errors/errorHandler.ts`](../../src/shared/errors/errorHandler.ts)                                                                                                                                                                                |
| Stale PII after logout           | `queryClient.clear()` wipes the TanStack Query cache on every logout path                                                                                                                                                                                                                                                                                  | `shared/auth/service.ts`                                                                                                                                                                                                                                  |
| Reverse tabnabbing               | No `target="_blank"` without `rel`; no `window.opener` exposure                                                                                                                                                                                                                                                                                            | (grep-verified absent)                                                                                                                                                                                                                                    |
| Supply chain                     | `pnpm audit` (all + prod), dependency-review, SBOM, gitleaks, semgrep, CodeQL                                                                                                                                                                                                                                                                              | CI lanes — see [tools-and-usage.md](tools-and-usage.md)                                                                                                                                                                                                   |

### Third-party telemetry (token / PII containment)

Sentry and PostHog run in the same JS context as the in-memory token, so their
capture settings are part of the threat model — verified:

- **Sentry replay** — `maskAllText: true` + `blockAllMedia: true`; inputs are
  masked by default and **network request headers/bodies are not captured**
  (no `networkDetailAllowUrls`), so the `Authorization: Bearer` header never
  reaches Sentry. `beforeSend` filters `ui.input` breadcrumbs and — together
  with `beforeSendTransaction` — scrubs `token` query params from event and
  breadcrumb URLs (`lib/telemetry-scrub.ts`); only `user.id` is identified.
  ([`app/observability/sentry.ts`](../../src/app/observability/sentry.ts))
- **PostHog** — `autocapture: false` and `disable_session_recording: true`:
  passive DOM/network capture is off in code, so a server-side dashboard toggle
  cannot silently start recording the authenticated admin surface. Only
  explicitly-coded events are sent; `before_send` scrubs `token` params from
  `$current_url`-style properties, and `posthog.reset()` runs when the session
  ends so successive users on a shared device never chain into one anonymous
  profile. ([`app/analytics/posthog.ts`](../../src/app/analytics/posthog.ts))
- **Service worker** — precaches only static build assets + fonts; **no runtime
  caching of `/api`** or auth responses, so a shared device cannot serve one
  user's data to another from the SW cache. ([`src/sw.ts`](../../src/sw.ts))

### Content-Security-Policy delivery

The CSP ships **two ways**, both built from one source
([`lib/csp-api-origin.ts` → `buildContentSecurityPolicy`](../../src/lib/csp-api-origin.ts)):

- **Header** (`dist/_headers`, generated at build by `plugins/csp-api-origin.ts`)
  — authoritative: applies before the document parses and carries reporting
  directives. The committed `public/_headers` holds a minimal
  `frame-ancestors 'none'` line that the build upgrades to the full policy with
  the per-environment API origin injected into `connect-src`.
- **Meta** (`index.html`) — a parse-time fallback for hosts that drop the header.

Set `VITE_CSP_REPORT_URI` (e.g. a Sentry CSP ingest URL) to turn on
`report-uri`/`report-to` + a `Reporting-Endpoints` header, so production CSP
violations — including blocked XSS attempts — are collected instead of silent.

**Trusted Types (staged rollout).** The build also emits a
`Content-Security-Policy-Report-Only` header carrying
`require-trusted-types-for 'script'`
([`buildTrustedTypesReportOnlyPolicy`](../../src/lib/csp-api-origin.ts)). This is
a structural DOM-XSS defense — it flags any script sink (`innerHTML`, `eval`, …)
that receives a plain string instead of a Trusted Type — shipped **report-only**
because React 19 is Trusted-Types-aware but Sentry/PostHog may use sinks. Once
the violation stream (collected via `VITE_CSP_REPORT_URI`) is clean, promote
`require-trusted-types-for 'script'` into the enforcing policy. Report-only is
header-only — `http-equiv` can't carry it — so there is no meta fallback.

## Accepted risks (intentional — do not "fix" without re-reading this)

1. **`style-src 'unsafe-inline'`.** Required by Tailwind v4's generated styles
   and Radix's inline positioning. Severity is low: with `script-src 'self'`
   locked, this permits CSS injection (UI redress, attribute-selector
   exfiltration) but **not** script execution. Removing it needs per-render
   nonces and fights the component stack. Accepted; revisit only if the styling
   approach changes.
2. **OAuth `state`/PKCE is not validated in the frontend.** By design the
   **backend is the OAuth broker** — it performs the provider dance and delivers
   the session via the HttpOnly refresh cookie, so the frontend never sees the
   authorization code or `state`. `/callback` only triggers a silent refresh.
   The CSRF protection for the OAuth flow is the backend's; there is nothing for
   the frontend to validate. (Confirm this contract holds if the flow changes.)
3. **`config.js` runtime config injection.** `<script src="/config.js">` loads
   the API base URL written by the deploy. It is same-origin (covered by
   `script-src 'self'`), served over HTTPS with immutable caching. The residual
   risk is a deploy-pipeline / host compromise — infrastructure trust, outside
   the frontend code's control.

   **Subresource Integrity (SRI) is deliberately not added in app code here.**
   `config.js` is generated at deploy time by the Docker entrypoint, so its hash
   is unknown at build — SRI on it belongs to that entrypoint: compute
   `sha384` of the generated file and inject `integrity="sha384-…"` into the
   `index.html` script tag it writes (the same step that writes `config.js`).
   For the in-repo static scripts (`theme-init.js`), build-time SRI was
   evaluated and **declined**: they are same-origin and already constrained by
   `script-src 'self'`, while `integrity` would break the app if any host-side
   byte transform (minify, re-encode) touched them — net-negative for a
   negligible gain. Revisit if these scripts ever move to a third-party origin.

4. **Login is not synced across tabs** (only logout is). A fresh tab obtains its
   own token via the boot silent-refresh; tokens never leave their tab's memory.
   Propagating login would tempt cross-tab token sharing for no security gain.

## Backend's half (confirm, don't implement here)

- The refresh cookie must be `SameSite=Lax` (or stricter) and the backend must
  reject auth requests missing `X-Requested-With` — together with the frontend's
  custom header, that closes CSRF on `/auth/refresh`.
- Rate-limiting / brute-force protection on `/auth/login` (the frontend adds a
  client-side cooldown for UX, not as the control).
- Per-request authorization: every frontend guard is UX; the backend re-checks
  membership, status, and permission on every org-scoped endpoint.
