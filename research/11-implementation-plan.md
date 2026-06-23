# 11 — Implementation Plan (item-wise, for review)

Status: **awaiting item-wise green-light** · Design: [10](./10-dual-url-tenancy-routing-and-auth-alignment.md)

Each item is **commit-sized**: one concern, with the files it touches and an
acceptance check. Nothing here is built yet — review per item; I implement only
green-lit items, in order, each as its own tested commit.

Legend: ⬜ proposed (awaiting green-light) · ✅ already shipped this session.

---

## Phase 0 — Already shipped (FYI; one to revise)

- ✅ **0.1 Email-verify banner** — `EmailVerificationBanner` + resend (`b2cf639`).
- ✅ **0.2 Live RBAC** — `getMyPermissions` derives from `me/context` (`85ce454`).
- ⚠️ **0.3 Magic-link via `/callback?token`** (`327a87c`) — **to be replaced** by
  item **1.1** (the real flow is code-entry, not a link). Flagged so we don't
  double-count it.

---

## Phase 1 — Auth-flow alignment (correctness vs the pinned contract)

- ⬜ **1.1 Magic-link = code-entry.** `magicLinkSend({email})` → 6-digit code by
  email; `magicLinkVerify({email, code})` → token. Replace the `/callback?token`
  branch with a **code-entry step** in the login UI (reuse the OTP input).
  _Files:_ `auth-api.ts`, `constants.ts`, `PasswordlessOptions.tsx`,
  `CallbackPage.tsx` (drop magic-link branch). _Accept:_ send→code→verify works
  in mock; integration: send 201 uniform.
- ⬜ **1.2 OAuth start returns `{url}`.** `GET /auth/oauth/:provider` → `{url}` →
  `window.location.assign(url)` (don't navigate the start route directly).
  _Files:_ `auth-api.ts` (`oauthStartUrl(provider)`), `PasswordlessOptions.tsx`.
  _Accept:_ provider button fetches `{url}` then redirects; mock unchanged.
- ⬜ **1.3 OAuth return path.** Provider → BE callback (cookie) → FE `/callback` →
  `POST /auth/refresh` → `me/context`. _Files:_ `CallbackPage.tsx`. _Accept:_
  `/callback` (no token) runs refresh→context→resolve in live mode.
- ⬜ **1.4 `mfa/login` field fix.** Body `{ mfa_session_token, totp_code }` (+
  optional `recovery_code`); add a "use a recovery code" toggle on `/mfa`.
  _Files:_ `auth-api.ts` (`mfaVerify`), `auth-contracts.ts`, `MfaForm.tsx`.
  _Accept:_ unit asserts `totp_code` is sent.
- ⬜ **1.5 `me/context` is the canonical post-auth call.** All of login / signup /
  mfa / magic-link / oauth converge on `useMeContext` → resolver. _Files:_ login
  & register forms, `MfaForm`, resolver. _Accept:_ each path lands via the resolver.

## Phase 2 — `me/context` as the org source of truth

- ⬜ **2.1 Switch service.** `switchToOrganization(id)` / `switchToPersonal()` →
  re-mint token (store it) + apply the **inline delta** to the `me/context`
  query cache (active org, permissions, global role; flip `is_active`). _Files:_
  new `shared/tenancy/switch.ts`, `useMeContext` cache update. _Accept:_ unit:
  delta merged, no extra `/me/context`.
- ⬜ **2.2 Org store derives from `me/context`.** `organizationId/slug/type/status/
capabilities/permissions` sourced from context (mock keeps mock context).
  _Files:_ `useOrganizationStore`, guard `ensure*`. _Accept:_ store reflects ctx.
- ⬜ **2.3 Retire URL-as-source.** Guards read active org from token/context, URL
  only validates + triggers switch-on-nav. _Files:_ `organization-context.ts`,
  guards. _Accept:_ guard tests updated green.

## Phase 3 — Dual-URL routing & shared layouts

- ⬜ **3.0 Shared layouts.** Establish `shared/layouts/{ProtectedLayout,
PublicLayout, AuthLayout}`. **ProtectedLayout** = the authenticated app shell
  (sidebar with the single **Dashboard** tab + org switcher + header +
  `<Outlet/>`); wraps **both** the personal and team protected spaces.
  **PublicLayout** = minimal centered chrome (callback, unauthorized, 404,
  onboarding, accept-invite). **AuthLayout** = the existing auth split-screen.
  _Files:_ `shared/layouts/ProtectedLayout/` (from today's `AppShell`), new
  `shared/layouts/PublicLayout/`, `routeTree.tsx`. _Accept:_ three layouts route
  their groups; structure validator green.
- ⬜ **3.1 Root resolver.** `/` → onboarding | `/dashboard` (personal) |
  `/organization/$slug/dashboard` (team). _Files:_ `organization-resolver.ts`,
  `routeTree.tsx`. _Accept:_ resolver unit covers all 3 branches.
- ⬜ **3.2 Promote `DashboardPage` to shared** — the **one Dashboard tab → one
  page** (OD-1), rendered in `ProtectedLayout`'s `<Outlet/>` for both spaces.
  _Files:_ move to `shared/components/app/Dashboard/` (+ test). _Accept:_ both
  spaces render it.
- ⬜ **3.3 Personal `_app` space.** Pathless route **under `ProtectedLayout`** +
  root `/dashboard`. _Files:_ `pages/_app/...`, `routeTree.tsx`. _Accept:_
  personal user lands on `/dashboard`, no org segment.
- ⬜ **3.4 Team space → slug param.** `/organization/$organizationSlug` **under
  `ProtectedLayout`**; rename `$organizationId` → `$organizationSlug`; slug→id via
  `me/context`; **switch-on-nav** guard. _Files:_ rename
  `pages/organization/$organizationId/` → `$organizationSlug/`, guards,
  `routeTree.tsx`. _Accept:_ `/organization/acme/dashboard` works + deep-link 404
  for non-member.
- ⬜ **3.5 Update e2e + docs for new URLs.** `*.e2e/*.integration` specs, mock
  fixtures (slug URLs), `docs/reference/routes-and-ui.md`. _Accept:_ suites green.

## Phase 4 — Org switcher

- ⬜ **4.1 Switcher rebuild.** `OrganizationSwitcher`: Personal (top) + Teams +
  "Create team"; uses 2.1 + navigates to the right URL space; capability-aware.
  _Files:_ `OrganizationSwitcher/`. _Accept:_ switch personal↔team repaints +
  changes URL space; unit green.

## Phase 5 — API mock + live parity (every fn gets a live branch + wire/mapper)

One item per domain; each: `*Wire` schema + `to*` mapper + `if(useMockApi)` mock
mirroring the wire. _Accept (each):_ live + mock both return the domain shape;
integration spec hits the real endpoint.

- ⬜ **5.1 Memberships** (`GET/POST/PATCH/DELETE …/memberships`) — member `role`
  is `{id,name}`; invite = add-by-email; embed `user`.
- ⬜ **5.2 Roles** (`GET/POST/PATCH/DELETE …/roles` + permissions catalog).
- ⬜ **5.3 Billing** (`GET /billing/plans`, `…/subscriptions`, mutations).
- ⬜ **5.4 API keys** (`…/api-keys` + rotate).
- ⬜ **5.5 Webhooks** (`/notify/webhooks` + test) & **notification-policies**.
- ⬜ **5.6 Notification prefs** (`/users/me/notification-preferences`).
- ⬜ **5.7 Sessions** (`/auth/me/sessions` list + revoke).
- ⬜ **5.8 MFA enroll + passkeys** (`/auth/me/mfa*`, `…/webauthn/*`).
- ⬜ **5.9 Org general/settings/logo** (`PATCH /tenancy/organization`, settings, logo).

## Phase 6 — Settings panels (consume Phase 5)

- ⬜ **6.1 Members panel** (table + invite-by-email + role change + remove; cap-gated).
- ⬜ **6.2 Roles panel** (list + create custom + permissions).
- ⬜ **6.3 Billing panel** (personal: plans/upgrade; team: subscription mgmt).
- ⬜ **6.4 Integrations panel** (API keys + webhooks).
- ⬜ **6.5 Account panels** (Security MFA/passkeys, Sessions, Notifications, General).

## Phase 7 — Responsive Pass 3 + polish + capstone

- ⬜ **7.1 Responsive Pass 3** — picker, onboarding wizard, CommandPalette
  (≤320px), accept-invite; extend `responsive.e2e`.
- ⬜ **7.2 Premium polish** — apply `high-end-visual-design` / `impeccable` /
  `motion-framer` to dashboard + auth + settings (within tokens/shadcn).
- ⬜ **7.3 e2e capstone** — `app.integration` covers all entry flows; onboarding
  job-title persisted.
- ⬜ **7.4 Docs/memory ripple** — CLAUDE.md, `routing-and-tenancy.md`,
  `route-island` (dual-mount), update [[pages-url-mirror-design]] +
  [[core-fe-be-integration-plan]].

---

## Sequencing & dependencies

`1 → 2 → 3 → 4` is the critical path (routing depends on the org/me-context
model). **Phase 5** can run in parallel with 3–4 (pure data layer). **Phase 6**
depends on 5. **Phase 7** is last. Estimated ~30 commit-sized items.

## Open decisions (need your call before the dependent item)

- **OD-1 (blocks 3.2):** `DashboardPage` → promote to `shared/` (recommended) vs.
  import from the team island.
- **OD-2 (blocks 1.3):** confirm OAuth return = cookie→`/auth/refresh` (vs. token
  in URL) against core-be `frontend-auth-flows.md`.
- **OD-3 (blocks 3.4):** on team rename (slug change) — 301 old→new, or accept a
  broken old link? (recommend: resolve via `by-slug`, no redirect for v1).
