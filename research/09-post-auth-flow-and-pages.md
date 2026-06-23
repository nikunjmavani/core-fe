# Post-Auth Flow, Page Map & Access Control

**Project**: core-fe — multi-tenant admin dashboard
**Date**: 2026-06-23
**Depends on**: `research/07` (integration plan + §11 backend status), `research/08` (BE change requests — all resolved)
**Scope**: where users land after login/signup, the onboarding/org-creation decision, securing every authenticated page, and the full authenticated page map.
**Design system**: unchanged — neutral semantic tokens + shadcn/ui + configured brand/fonts. `ui-ux-pro-max` is advisory; we adopt its **interaction/flow/a11y patterns only** (skippable onboarding, empty states, step-progress, active-nav, deep-linking, focus rings), **not** its style/font suggestions.

---

## 0. Principles

1. **Never strand a user.** Every authenticated user (post-first-auth) has a personal org, so they always land on a real dashboard — no dead ends, no forced wizard.
2. **Secure by default.** Every authenticated route runs the full guard chain in `beforeLoad`; the backend re-checks everything (FE guards are UX + defense-in-depth).
3. **`/auth/me/context` is the spine.** Landing, onboarding, nav visibility, and gating all read from it — one source of truth (user, active org + status, `my_permissions`, `capabilities`, org list).
4. **Personal vs Team is a first-class axis.** Team-only surfaces (members, roles, invitations, billing) are hidden + guarded on personal orgs via `capabilities`, with the 422 `errors:personalOrganization*` as the server backstop.
5. **Onboarding is optional, not a gate.** Since the personal org already exists, onboarding becomes a skippable welcome that _offers_ team creation.

---

## 1. The post-auth flow (redesigned)

### 1.1 Current breakage (from code audit)

`shared/tenancy/organization-resolver.ts:18-27` does: `if (orgs.length === 0) → /onboarding; else last-used → dashboard, else → picker`. With personal-org auto-creation **every signup has ≥1 org**, so: onboarding is unreachable, and a single-org user is needlessly shown the picker. The resolver also re-fetches `listMyOrganizations()` + guesses from `localStorage` instead of using `me/context`.

### 1.2 Redesigned resolver (`/` route)

Drive entirely from `me/context` (already hydrated by research/07 PR-5):

```text
GET /auth/me/context  →
  ├─ honor a safe ?redirect= (validated) if present                → that path
  ├─ active_organization == null                                    → /onboarding  (team-only deploy or unclaimed invitee)
  ├─ first-run (see §2) AND only a personal org, no team            → /onboarding  (skippable)
  └─ otherwise                                                      → /organization/{active_organization.id}/dashboard
```

- **Single-org users skip the picker** (land on dashboard). The picker (`/organization`) becomes a _multi-org chooser + create-team_ surface, reachable from the switcher, not a forced stop.
- **Pending team invites** are surfaced on landing (badge + on the onboarding/dashboard) via `GET /tenancy/invitations/pending` → "You've been invited to Acme — Accept."

### 1.3 Flow diagram

```text
            ┌────────── /login ──────────┐         ┌──────── /register (signup) ────────┐
            │ password | OAuth | magiclink│        │ POST /auth/signup → personal org    │
            └──────────────┬─────────────┘         └──────────────┬──────────────────────┘
                 token (+session cookie)                  token (+ personal org)
                           └───────────────┬──────────────────────┘
                                           ▼
                                   navigate to  /
                                           ▼
                              resolveRootRedirect() reads me/context
              ┌────────────────────────────┼─────────────────────────────────┐
       active_org == null            first-run + personal-only          has active org
              ▼                             ▼                                  ▼
        /onboarding  ◀──(skippable)──▶  /onboarding (welcome)        /organization/{id}/dashboard
              │  "Create a team" or "Skip"      │                              ▲
              └────────► create TEAM org ───────┴──────────────────────────────┘
```

---

## 2. Onboarding model — "ask for org creation or not"

**Decision: personal-first landing + a skippable welcome that _offers_ team creation (not a blocking wizard).**

Rationale: the personal org makes the app usable solo immediately; teams are an explicit, optional escalation (and personal orgs are single-member, so "invite teammates" requires a team). UX rule (`ui-ux-pro-max` Onboarding/User-Freedom): tutorials must be skippable with Skip + Back.

**`/onboarding` becomes a lightweight welcome (not the 6-step org-creating wizard):**

1. **Welcome** — who you are (optional profile: first/last name → `PATCH /users/me`).
2. **Choose path** — _"Working with a team?"_
   - **"Create a team"** → name (+ optional slug) → `POST /tenancy/organizations` (TEAM) → optional invite-by-email step (`POST /memberships {email, role_id}`) → land on the **team** dashboard.
   - **"Just me for now" / "Skip"** → land on the **personal** dashboard.
3. Mark first-run complete (see below). Show a step indicator (`Step 2 of 3`) + Skip/Back; empty states everywhere.

**Changes to the existing wizard** (`useOnboardingStore` + `OnboardingPage`):

- It must **not** auto-create an org on finish (personal already exists) — only create a **TEAM** org when the user explicitly chooses that path; reuse `createdOrganizationId` for idempotency.
- Add `existingPersonalOrgId` to the store so "Skip" lands on the personal org.
- Pre-fill org name from `lib/onboarding-defaults.ts` (email-domain heuristic) only on the create-team path.

**First-run tracking** (so onboarding doesn't re-trigger): the backend has **no `onboarding_completed` flag** (onboarding is FE-driven). Use the existing `useOnboardingStore.completed` (localStorage) as the signal; accept that it's per-device. _(Optional BE ask: a durable `onboarding_completed` on the user — logged as a nice-to-have, not a blocker.)_ Alternative trigger that needs no flag: only offer onboarding when the user has **exactly one org and it is personal** (i.e., never created/joined a team) — dismissible thereafter.

---

## 3. Access control — "all pages very secured"

### 3.1 The canonical guard chain (every org-scoped route, in `beforeLoad`, `preload` early-returns)

```text
1. requireAuth()                         not authenticated      → /login?redirect=<path>
2. requireOrganizationContext(orgId)     switch-to-org + me/context;  non-member → notFound() (404, no leak)
3. requireActiveOrganization()           status != ACTIVE       → /organization/{id}/suspended
4. requireManifestPermission(manifest)   missing permission     → /unauthorized
5. requireCapability(manifest)           team-only on personal  → /unauthorized (or hidden upstream)
```

Layers 1–3 exist today; **4 (RBAC) and 5 (capability) are the new enforcement** (research/07 PR-8 / R1–R3). Every page's `manifest` declares `permission` (one of the 18 codes) and an optional `requiresTeam: true`.

### 3.2 "Every page secured" checklist (applies to all authenticated routes)

- [ ] Nests under the org shell (`/organization/$organizationId/`) **or** carries its own `requireAuth` (e.g. `/onboarding`, `/organization` picker).
- [ ] `manifest.permission` set + enforced via `requireManifestPermission` (not just declared).
- [ ] Team-only pages carry `requiresTeam` + capability gate; hidden from nav on personal orgs.
- [ ] Direct-URL probe: non-member org → 404; missing permission → /unauthorized; suspended → /suspended.
- [ ] `?redirect=` validated with `isSafeRedirectPath` at the router boundary (closes audit HV-1).
- [ ] No data fetch before guards pass (loaders run after `beforeLoad`).
- [ ] Settings-modal sections gated by the same permission/capability.
- [ ] Email-verification: **access allowed pre-verify** (BE allows login pre-verify) with a persistent "Verify your email" banner; **sensitive actions** (accept invite — BE-enforced; optionally billing) require verified email. _(Open decision §6.)_
- [ ] Idle-timeout + 12h session cap + cross-tab logout remain active (already implemented).

### 3.3 Token/switch safety (from research/07 F3)

Entering an org route does switch-to-organization → swaps the in-memory token → re-fetches me/context. Rapid switches must not race; multi-tab caveat documented. Token stays memory-only.

---

## 4. The full authenticated page map

Legend — **P** = personal-org applicable, **T** = team-org only.

### 4.1 Guest / auth (AuthLayout, `redirectIfAuthenticated`)

| Route                                 | Purpose                              | Notes (post-overhaul)                                                |
| ------------------------------------- | ------------------------------------ | -------------------------------------------------------------------- |
| `/login`                              | password / OAuth / magic-link entry  | login may return `mfa_required` → `/mfa`; OAuth → `/callback`        |
| `/register`                           | **signup**                           | `POST /auth/signup` → token + auto personal org; then `/`            |
| `/forgot-password`, `/reset-password` | password reset                       | unchanged                                                            |
| `/verify-email`                       | **email OTP**                        | now `{ email, code(6-digit) }`, not a token-link                     |
| `/mfa`                                | MFA challenge                        | `POST /auth/mfa/login {mfa_session_token, totp_code\|recovery_code}` |
| `/magic-link` _(new, optional)_       | OTP code entry after magic-link send | or fold into `/login`                                                |

### 4.2 Transitional / public-ish

| Route                          | Guard                          | Purpose                                                                        |
| ------------------------------ | ------------------------------ | ------------------------------------------------------------------------------ |
| `/callback`                    | none                           | OAuth/magic-link return → reads JSON `{access_token, session_id}` → `/`        |
| `/accept-invite/$invitationId` | `requireAuth` + verified email | `POST /invitations/:id/accept {token}` (token from `?token=`) → team dashboard |
| `/unauthorized`                | none                           | RBAC denial surface                                                            |
| `/onboarding`                  | `requireAuth`                  | skippable welcome + optional team creation (§2)                                |
| `/organization` (picker)       | `requireAuth`                  | multi-org chooser + create-team; skipped for single-org                        |

### 4.3 Org-scoped (under `/organization/$organizationId/`, AppShell, full guard chain)

| Route (segment) | `permission`        |  P/T  |       Status        | Notes                                                                                   |
| --------------- | ------------------- | :---: | :-----------------: | --------------------------------------------------------------------------------------- |
| `dashboard`     | `organization:read` |  P+T  | placeholder → build | landing surface; personal shows "create a team" empty-state                             |
| `members`       | `membership:read`   | **T** |         new         | embedded `user`+`role`; invite-by-email; status/role mutations need `membership:manage` |
| `roles`         | `role:read`         | **T** |         new         | role CRUD + `PUT roles/:id/permissions {permission_codes}`; system roles read-only      |
| `api-keys`      | `api-key:read`      |  P+T  |         new         | create/rotate show `raw_key` once; scopes ⊆ caller perms                                |
| `billing`       | `subscription:read` | **T** |         new         | plans + subscription (seats/features); **hidden on personal** (residual BE ask)         |
| `audit-logs`    | `audit-log:read`    |   T   |        later        | activity feed                                                                           |
| `webhooks`      | `webhook:read`      |   T   |        later        | notify domain                                                                           |
| `suspended`     | `null`              |  P+T  |       exists        | status target; outside the active-status gate                                           |

**Settings** stays a **global hash modal** (`#settings/<scope>/<section>`), not routes — keep the established pattern. Account scope (profile, security, sessions, appearance, notifications) = always available; Organization scope (general, members, roles, billing, …) = gated by the same permission + capability rules; team-only sections hidden on personal orgs.

### 4.4 Route-island work per new page

Each new page = the mandatory 4 files (`<page>.route.tsx`, `<page>.manifest.ts`, `<Page>Page.tsx`, `<PAGE>.OVERVIEW.md`) + colocated tests + registration in `routeTree.tsx` and `docs/reference/routes-and-ui.md` (per CLAUDE.md route-island spec). Manifests gain `permission` + optional `requiresTeam`.

---

## 5. Navigation & shell UX (personal vs team)

- **Sidebar nav** (`AppShell` `NAV_ITEMS` + `useVisibleNavItems`): currently one hardcoded item with no filtering. Make it **derive visibility from `my_permissions` + active-org `capabilities`** — hide members/roles/billing on personal orgs and when the permission is absent. Active item highlighted (`nav-state-active`); icon **and** label (`nav-label-icon`).
- **Org switcher**: group **Personal** vs **Team**; personal entry has no slug + "Personal" label; "Create organization" (= team) CTA; switching triggers the guard-chain switch + token swap.
- **Empty states** (UX `empty-states`): personal dashboard → "Working with a team? Create an organization." Members on a fresh team → "Invite your first teammate." Each with a single primary CTA.
- **Breadcrumbs** for 3+ level depth (`breadcrumb-web`); **deep-linking** preserved (URL already canonical); **skip-link** + heading hierarchy already present.
- **Verify-email banner** (persistent, dismissible per session) when `user.is_email_verified === false`.
- **a11y/interaction baseline** (apply repo-wide): visible focus rings, 44px touch targets, loading skeletons >300ms, submit feedback (loading→success/error), disabled-state clarity, `prefers-reduced-motion`, 4.5:1 contrast — all already supported by the shadcn token system; enforce per page.

---

## 6. Open decisions (please confirm in review)

1. **Onboarding landing style** — (a) **personal-first + skippable welcome offering team creation** _(recommended)_; (b) a short post-signup interstitial that explicitly asks "personal vs create team" before any dashboard; (c) keep a fuller multi-step wizard (skippable, reuses personal org). Affects §2 + the `/onboarding` island.
2. **Email-verification gating** — (a) **allow access pre-verify + banner, gate only sensitive actions** _(recommended; matches BE)_; (b) hard-gate the whole app until verified.
3. **Personal-org billing** — hide billing on personal orgs _(recommended, pending the BE decision in research/07 §11 residual #5)_ vs show it.
4. **First-run flag** — FE-only `localStorage` _(recommended, pragmatic)_ vs request a durable `onboarding_completed` on the user from BE.

---

## 7. Implementation slices (extends research/07 §10)

These layer onto the integration PRs; **no new backend work** (all BE capabilities exist).

- **PA — Resolver + landing (after PR-5 me/context).** Rewrite `resolveRootRedirect` to read me/context; single-org skips picker; honor safe `?redirect=`; surface pending invites. Tests: null active-org→onboarding, has-active→dashboard, single-org no picker, redirect honored/validated.
- **PB — Secure-all-pages (with PR-8 RBAC).** Add `requireManifestPermission` + `requireCapability` to the org-shell child `beforeLoad`; `requiresTeam` in manifests; nav filtering by permission+capability. Tests: per-route permission/capability gate, direct-URL probes, personal hides team-only.
- **PC — Onboarding rework.** `/onboarding` → skippable welcome; no auto-org-create; create-team path; `existingPersonalOrgId`; first-run flag. Tests: skip→personal dashboard, create-team→team dashboard, no duplicate org, re-entry guarded.
- **PD — Org page islands (M2/M3 of research/07, now with rich BE contracts).** Scaffold members → roles → api-keys → billing islands per route-island spec, each gated, each personal/team-aware. Tests per domain track (research/07 D3–D7).
- **PE — Shell/nav + empty states + verify-email banner.** Personal/team switcher grouping, nav visibility, empty states, banner. Tests: nav filtering, switcher grouping, banner visibility.

Sequencing: PA + PB land in **M1** (they harden the slice we already build); PC right after; PD/PE across **M2–M3**.

---

## 8. Net

- Fixes the resolver breakage (personal-org reality) and removes single-org picker friction.
- Makes **every** authenticated page enforce auth → org-context → active-status → **permission → capability**, with the backend as the re-check.
- Turns onboarding into a skippable, personal-first welcome that _offers_ (doesn't force) team creation, and lands users on a real dashboard immediately.
- Gives a complete, gated, personal/team-aware page map to build against — no backend blockers.
