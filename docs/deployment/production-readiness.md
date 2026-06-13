# Production readiness — go / no-go

**Status (2026-06-13): NOT production-ready.** One structural blocker dominates:
the app runs in **mock mode** — there is no real backend wired. Everything else
is either ready or a short, tracked list below.

This is the single source of truth for "can we ship?". It complements the
step-by-step [pre-launch checklist](deployment-and-pre-launch.md#pre-launch-checklist)
and the [path-to-production gate](path-to-production.md).

## What's already production-grade

The frontend **shell** is solid and does not block launch:

- Reactive auth layer (in-memory token, single-flight refresh + Web Locks,
  refresh-rotation safety, cross-tab logout, idle + absolute session caps).
- Security: CSP (header + meta + Trusted Types report-only), CSRF header,
  redirect safety, password breach/strength checks, telemetry URL scrubbing,
  reset/verify token containment. See [security-model.md](../reference/security-model.md).
- Quality gates: biome, eslint, tsc, knip, tsdoc budget, token validator,
  structure validator, **SonarQube clean**, ~560 unit tests + coverage ratchet,
  e2e (Chromium), patch-coverage, contract-drift, SBOM, gitleaks/semgrep/CodeQL.
- Accessibility: skip links, route announcer, form-error association, focus via
  Radix. Per-route error boundaries, offline support, new-deployment reload.
- Cookie consent gating for analytics (this wave).

## Blockers — work to do before launch

### A. Backend & infrastructure (owned by your team — not fixable in this repo)

- [ ] **Wire the real API.** Replace every `REPLACE_WITH_API` stub (~28, across
      `shared/api`, `shared/tenancy`, `shared/auth`, `app/guards`, the settings
      panels, profile, callback) with calls to deployed **core-be** endpoints.
      `pnpm contracts:drift` currently checks a _committed_ route catalog, not a
      live API — re-verify against the running backend.
- [ ] **Deploy core-be** and confirm the contract the frontend assumes: HttpOnly
      refresh cookie (`SameSite=Lax`+), refresh-session rotation with
      reuse-detection, `X-Requested-With` rejection, CORS for the frontend origin.
- [ ] **Set production env / secrets** — `VITE_API_BASE_URL` (HTTPS),
      `VITE_SENTRY_DSN`, `VITE_POSTHOG_KEY`/`HOST`, `VITE_CSP_REPORT_URI`,
      `VITE_PRIVACY_POLICY_URL`, and `config.js` runtime injection per
      environment. Confirm `VITE_USE_MOCK_API` is **unset/false** (prod builds
      already reject `=true`).
- [ ] **Create the git remote + push.** All work is local; pushing activates the
      dormant CI/CD, CodeQL, Dependabot, and branch-protection rulesets
      (`pnpm gh:rulesets:sync`).
- [ ] **DNS / TLS / host.** Netlify config exists (`netlify.toml`, `_headers`);
      nothing is deployed yet. Confirm HTTPS, the security headers land, and
      multi-tenant subdomains (if used) resolve.
- [ ] **SRI for `config.js`** — the deploy entrypoint must hash the generated
      file and inject `integrity` (see security-model.md accepted-risk #3).

### B. Verify against a real environment (impossible in mock mode)

- [ ] Staging smoke (the deploy workflow hook has never run live).
- [ ] Lighthouse budgets and k6 load against real endpoints (currently mock-only).
- [ ] Cross-browser E2E — the suite is Chromium-only; validate Safari/Firefox.
- [ ] Real-failure observability: confirm Sentry receives errors (and PII stays
      scrubbed) and PostHog events flow **only after consent**.

### C. Legal / compliance / product (mostly your call)

- [ ] **Privacy policy + terms** content and links (set `VITE_PRIVACY_POLICY_URL`;
      the consent banner links it when present).
- [ ] Confirm the consent model fits your jurisdiction (opt-in is implemented;
      some orgs use legitimate-interest for first-party analytics).
- [ ] **Dashboard is a placeholder** — ship real product surface before launch.

### D. In-repo gaps closed in this readiness wave

- [x] **Cookie consent** — PostHog no longer sets cookies / captures until the
      user accepts (`ConsentBanner` + `useConsentStore`; `main.tsx` gates it).
- [x] **robots.txt** — now `Disallow: /` (auth-gated admin app; no public index).
- [x] This document.

## Go / no-go

**No-go** until **Section A** is complete and **Section B** has been run green
against a real backend. Sections C/D are launch-quality items; C is your
product/legal call.

When A + B are green, run the [path-to-production gate](path-to-production.md):
runbook → pre-launch checklist → release.
