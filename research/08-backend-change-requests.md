# Core-FE → Core-BE Change Requests (code-level asks)

**For**: the `core-be` team
**From**: core-fe integration (see `research/07-backend-integration-plan.md` §7 / §11)
**Date**: 2026-06-20 · **Updated**: 2026-06-23
**Backend**: `v4.9.0-dev.0`

> ## ✅ STATUS: ALL RESOLVED (2026-06-23)
>
> `core-be` shipped the entire set in commit **`d6b34355`** ("membership management overhaul, billing seat model & API contract docs (REQ-1–7)") plus PR **#775** (`auth-otp-signup-flows`). **Merged to `dev` — not yet in `origin/main`** (the one residual dependency: it must reach the FE's target release line). Nothing below is an open blocker; the original asks are retained as history.
>
> | Item                         | Resolution (as built)                                                                                                                   |
> | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
> | CR-1 envelope/pagination     | ✅ `{data,meta}` universal; `meta.pagination` only on paginated lists (treat as optional)                                               |
> | CR-2 error codes             | ✅ via **`error.reason`** slug on 4xx (`code` stays coarse) — `seat_limit_reached`, `organization_slug_exists`, `invitation_expired`, … |
> | CR-3 idempotency             | ✅ Canonical `X-Idempotency-Key` (min 16), consistent across all writes                                                                 |
> | CR-4 me/context schema       | ✅ Emitted (⚠ `active_organization.capabilities` still omitted from the schema)                                                         |
> | CR-5 switch schema           | ✅ Emitted — `{ access_token, session_id }`                                                                                             |
> | CR-6 CAPTCHA                 | ✅ Header `X-Captcha-Token`; dev bypass `CAPTCHA_BYPASS_HEADER`                                                                         |
> | CR-7 OAuth callback          | ✅ Returns JSON `{ access_token, session_id }` + sets cookie (no redirect)                                                              |
> | CR-8 member identity         | ✅ Memberships embed `user{…}` + `role{…}` (+`invitation` on INVITED) by default                                                        |
> | CR-9 role change             | ✅ `PATCH /memberships/:id { role_id }`                                                                                                 |
> | CR-10 invite by email        | ✅ `POST /memberships { email, role_id }` provisions a pending user — **standalone invitation-create removed**                          |
> | CR-11 permission catalog     | ✅ 18 colon-format codes, stable                                                                                                        |
> | CR-12 registration           | ✅ By design — `POST /auth/signup` (+ OAuth + magic-link); invited users use the signup-**claim** path                                  |
> | CR-13 billing seats/features | ✅ Plan `features`+`limits.seats`, subscription `seats_total/used`, enforced (409 `seat_limit_reached`)                                 |
> | CR-14 theme                  | ✅ By design — boolean; FE owns `system`                                                                                                |
>
> **Only residual asks (minor, non-blocking):** (1) land `auth-otp-signup-flows` on `main`; (2) add a 201 response schema to `POST /auth/signup` (body mirrors login `{access_token, session_id?}`); (3) add `capabilities` to `active_organization`/`organizations[]` in the me/context spec schema (runtime sends it); (4) decide whether **PERSONAL orgs may have billing/subscriptions** — there is no `assertTeamOrganization` guard in the billing domain today (the FE will hide billing on personal orgs regardless).
>
> **Personal vs Team orgs (confirmed as-built):** every completed signup path (email+password, OAuth, magic-link, + claim) auto-provisions exactly one **PERSONAL** org (idempotent, one-per-owner; gated on `PERSONAL_ORGANIZATION_ENABLED`; unclaimed invitees have none until claim). PERSONAL = `type:'PERSONAL'`, `slug:null`, single-member, all `capabilities` false, immutable (members/roles/invite/transfer/delete → **422** `errors:personalOrganization*`). TEAM = via `POST /tenancy/organizations` (forces TEAM, caller=owner). A fresh signup's default active org is the personal org (so `me/context.active_organization` is **not null**); the personal org **is listed** in `organizations[]` / `GET /tenancy/organizations` (distinguish by `type==='PERSONAL'`). `POST /auth/switch-to-personal` switches to it. `GET /users/me` exposes `personal_organization_id` + `capabilities{personal_organizations, team_organizations}`.

The items below are the **original asks (2026-06-20), retained as history.** Each was a concrete contract: **Current** → **Requested** → **Why**.

---

## A. M1-blocking — confirmations the FE must pin before wiring

### CR-1 — Confirm the response envelope + pagination shape (freeze it)

```ts
// FE will pin every contract to this. Please confirm it is canonical for ALL endpoints.
type Envelope<T> = { data: T; meta: { request_id: string } };
type Paginated<T> = {
  data: T[];
  meta: {
    request_id: string;
    pagination: {
      per_page: number;
      next: string | null; // opaque cursor
      has_more: boolean;
      estimated_total?: number; // confirm: omitted for some lists (e.g. api-keys)?
    };
  };
};
// Q1: Is `meta.pagination` present on ALL list endpoints, or only some? (We saw it
//     stubbed on GET /billing/plans and ABSENT on GET /billing/subscriptions.)
// Q2: 204 responses carry no body — confirm (DELETEs, decline, logout).
```

### CR-2 — Error envelope shape + code vocabulary (needed to map → `HttpError`)

```jsonc
// We must map errors to a typed HttpError(status, code, message, fieldErrors).
// Please confirm the EXACT error body:
{
  "error": {
    "code": "errors:insufficientOrganizationPermissions", // confirm: top-level key name + i18n code format
    "message": "Human readable",
    "details": [{ "field": "slug", "message": "..." }], // confirm: 422 field-error shape
  },
  "meta": { "request_id": "..." },
}
// Q: Is the wrapper key `error` (singular)? Where do 422 field errors live?
//    Share the canonical list of `code` values the FE should branch on.
```

### CR-3 — Idempotency-Key header name + scope (we found a mismatch)

```http
# FE sends today (core/http/fetch-client.ts) on every POST/PUT/PATCH/DELETE:
Idempotency-Key: 3f9c2a7e-9b1d-4f6a-8c2e-1a2b3c4d5e6f      # crypto.randomUUID(), 36 chars

# But billing routes appear to require:
X-Idempotency-Key: <min 16 chars>                          # subscription.routes.ts

# Q1: Which is canonical — `Idempotency-Key` or `X-Idempotency-Key`?
# Q2: Which endpoints REQUIRE it (we saw: org/role/invitation/api-key/subscription creates)?
# Q3: Min length? (our UUID is 36, fine either way — just need the header name.)
```

### CR-4 — Emit + freeze `GET /auth/me/context` response schema (OpenAPI gap)

```ts
// The OpenAPI spec emits NO response body for this endpoint; we hand-derived the
// shape from serializers. Please add it to the spec and confirm it is exact —
// this single endpoint is our auth+org+permissions+status spine.
// GET /api/v1/auth/me/context  →  data:
interface MeContext {
  user: {
    id: string; // usr_<21>
    email: string;
    is_email_verified: boolean;
    is_mfa_enabled: boolean;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null; // presigned, short-lived
    status: 'ACTIVE' | 'LOCKED' | 'SUSPENDED';
    created_at: string; // ISO-8601
    updated_at: string;
  };
  active_organization: Organization | null; // null when no org in scope → FE shows picker
  my_permissions: string[]; // the 18-code vocabulary (see CR-11)
  global_role: 'super_admin' | 'admin' | 'user' | null;
  organizations: Array<Organization & { is_active: boolean }>;
}
```

### CR-5 — Emit `POST /auth/switch-to-organization` schema + confirm token semantics

```http
POST /api/v1/auth/switch-to-organization
Authorization: Bearer <current access token>
Content-Type: application/json

{ "organization_id": "org_abcdefghijklmnopqrstu" }     # ^org_[a-z0-9]{21}$

# → 201
{ "data": { "access_token": "<NEW JWT scoped to org>" }, "meta": { "request_id": "..." } }
```

```text
Confirm:
  1. Switch ALWAYS re-mints the access token (FE must swap its in-memory token).
  2. The OLD token keeps the OLD `org` claim until expiry (~15 min) — i.e. there is
     no server-side invalidation of the prior token on switch. (Drives our multi-tab caveat.)
  3. 403 is returned for a non-member org (FE maps → 404 to avoid leaking existence).
  4. `switch-to-personal` takes no body and returns the same `{ access_token }`.
Also please add the response schema to OpenAPI (currently omitted).
```

### CR-6 — CAPTCHA: token location + dev bypass / test keys

```http
POST /api/v1/auth/login            # Turnstile captchaPreHandler runs here + on /auth/mfa/login
Content-Type: application/json

{ "email": "...", "password": "...", "captcha_token": "<turnstile-token>" }   # confirm field name/location
```

```text
Q1: Where does the Turnstile token go — body field `captcha_token`? a header?
Q2: Please provide a dev/test bypass (e.g. CAPTCHA_DISABLED=true in dev, or
    Cloudflare test keys) so Playwright E2E and k6 load can authenticate.
```

### CR-7 — Confirm the OAuth callback token-exchange contract

```http
GET /api/v1/auth/oauth/{provider}/callback?code=...&state=...

# Which does the BE do?
#  (a) Set HttpOnly `session_id` cookie + 302 → SPA, FE then calls /auth/refresh to get an access token.
#  (b) Return JSON { data: { access_token, session_id }, meta } for the FE to store.
```

```text
Our /callback page is currently stubbed. We assume (a) (cookie + silent refresh) to
match the password-login model — please confirm so we can finish the real flow.
```

### CR-11 — Confirm the permission catalog is stable (18 codes)

```ts
// FE will pin organizationPermissionSchema to EXACTLY these (from GET /tenancy/permissions).
// Please confirm this is the canonical, stable set (and tell us before it changes).
type OrganizationPermission =
  | 'organization:read'
  | 'organization:update'
  | 'organization:delete'
  | 'membership:read'
  | 'membership:manage'
  | 'invitation:manage'
  | 'role:read'
  | 'role:manage'
  | 'api-key:read'
  | 'api-key:manage'
  | 'notification-policy:read'
  | 'notification-policy:manage'
  | 'subscription:read'
  | 'subscription:manage'
  | 'webhook:read'
  | 'webhook:manage'
  | 'audit-log:read'; // 18 total
```

---

## B. Feature gaps — needed for M2/M3 (real backend changes, not just confirmations)

### CR-8 — Member-list enrichment (highest UX impact)

```ts
// Current — GET /tenancy/organization/memberships → data[] gives IDs only:
interface Membership {
  id: string;
  user_id: string;
  organization_id: string;
  role_id: string;
  status: 'INVITED' | 'ACTIVE' | 'SUSPENDED';
  joined_at: string | null;
  created_at: string;
  updated_at: string;
}
// Problem: we cannot render a members table (name/email/avatar/role-name) without
// an N+1 fan-out, and there is no member-scoped user-lookup endpoint.

// Requested — ONE of:
// (a) embed summaries on the membership:
interface MembershipEnriched extends Membership {
  user: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  };
  role: { id: string; name: string };
}
// (b) opt-in expansion:  GET /tenancy/organization/memberships?expand=user,role
// (c) a batch lookup:    POST /tenancy/organization/members/lookup { ids: string[] } → user+role summaries
```

### CR-9 — Member role assignment

```http
# Current: PATCH /tenancy/organization/memberships/{id} accepts ONLY { status }.
# There is no way to change a member's role. Requested — either:

PATCH /api/v1/tenancy/organization/memberships/{membership_id}
{ "role_id": "rol_abcdefghijklmnopqrstu" }            # extend existing PATCH

# or a dedicated endpoint:
PUT /api/v1/tenancy/organization/memberships/{membership_id}/role
{ "role_id": "rol_abcdefghijklmnopqrstu" }
```

```text
Q: How is a member's role set/changed today? If unsupported, please add one of the above.
```

### CR-10 — Invite by email (new-user invite path)

```http
# Current two-step requires a membership_id first:
POST /api/v1/tenancy/organization/invitations
{ "membership_id": "mem_abcdefghijklmnopqrstu", "expires_in_days": 7 }

# Requested single-step (standard "invite teammate by email" UX):
POST /api/v1/tenancy/organization/invitations
{ "email": "new.person@example.com", "role_id": "rol_abcdefghijklmnopqrstu", "expires_in_days": 7 }
# → 201 { "data": { "invitation": { ... } }, "meta": { ... } }
```

```text
Key Q: How do we invite an email that has NO account/membership yet? The current flow
seems to assume a membership already exists. Please document the new-user invite path,
or add email+role_id creation.
```

### CR-12 — Registration model

```http
# FE has a /register screen, but there is NO POST /auth/register in core-be. Either:
POST /api/v1/auth/register
{ "email": "...", "password": "...", "first_name": "...", "last_name": "..." }
# → same discriminated result as login: { access_token, session_id } | { mfa_required, mfa_session_token }

# OR confirm signup is invite / OAuth / magic-link only → FE removes /register.
```

### CR-13 — Billing: seats + plan features

```ts
// FE billing UI shows seats (used/total) and plan features; backend exposes neither.
// Plan today: { id, name, description, price_monthly, price_yearly, currency, is_active, created_at, updated_at }
// Subscription today: { id, status, billing_cycle, current_period_start/end, trial_end,
//                       cancel_at_period_end, canceled_at, provider, plan_id, ... }  // no seats/amount

// Requested (optional — else FE drops the seats UI):
interface PlanExtras {
  features?: string[];
  limits?: { seats?: number; [k: string]: number | undefined };
}
interface SubscriptionExtras {
  seats_total?: number;
  seats_used?: number;
}
```

```text
Q: Where do seat counts and plan features come from? If nowhere, we will remove the
seats column and feature list from the billing surface.
```

### CR-14 — (Optional) Theme as an enum

```ts
// Settings today: { is_dark_mode_enabled: boolean }. FE supports light | dark | system.
// Optional: expose `theme: 'light' | 'dark' | 'system'`. Otherwise FE keeps 'system'
// as a client-only preference and maps to the boolean on save.
```

---

## Priority summary

| Tier          | Items                                           | Nature                                                                 |
| ------------- | ----------------------------------------------- | ---------------------------------------------------------------------- |
| **Blocks M1** | CR-1, CR-2, CR-3, CR-4, CR-5, CR-6, CR-7, CR-11 | Confirmations / OpenAPI schema emits / 1 header fix / CAPTCHA dev keys |
| **Blocks M2** | CR-8, CR-9, CR-10                               | Real endpoint/field additions (members, invites)                       |
| **Blocks M3** | CR-13                                           | Billing fields (or FE drops seats)                                     |
| **Optional**  | CR-12, CR-14                                    | Registration model; theme enum                                         |

FE can start **PR-1→PR-3** (envelope/helpers/id-regex) with zero backend input. The M1-blocking confirmations (A) are needed before PR-5 onward.
