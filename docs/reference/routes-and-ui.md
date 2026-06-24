# Routes & UI — What’s Live and What We Use

Reference for **which frontend routes are live** (and which backend APIs they use) and **how the UI is built** (component library and primitives).

**E2E selectors:** stable `data-testid` values per route are listed in [e2e-testids-inventory.md](./e2e-testids-inventory.md). When adding UI, follow `agent-os/skills/e2e-testids/SKILL.md` and update that inventory.

---

## Live frontend routes

All routes are defined in `src/app/routes/routeTree.tsx` and are lazy-loaded. Below: path, purpose, and backend APIs used.

| Path                                        | Purpose                                                                                                                                      | Backend APIs used                                                                                  |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **Public (no auth)**                        |                                                                                                                                              |                                                                                                    |
| `/login`                                    | Login form (email/password, magic link, Google OAuth, passkey)                                                                               | `POST /auth/login`, `GET /auth/me`, `GET /auth/google` (redirect), magic-link + WebAuthn endpoints |
| `/register`                                 | Registration                                                                                                                                 | `POST /auth/register`, `GET /auth/me`                                                              |
| `/forgot-password`                          | Request password reset                                                                                                                       | `POST /auth/forgot-password`                                                                       |
| `/reset-password`                           | Reset password (token from email)                                                                                                            | `POST /auth/reset-password`                                                                        |
| `/verify-email`                             | Verify email (token from email)                                                                                                              | `POST /auth/verify-email`, `GET /auth/me`                                                          |
| `/mfa`                                      | MFA (TOTP) verification                                                                                                                      | `POST /auth/mfa/verify`, `GET /auth/me`                                                            |
| `/callback`                                 | OAuth / magic-link callback (token exchange + redirect)                                                                                      | token exchange against auth service                                                                |
| `/accept-invite/$invitationId`              | Accept membership invite → auto-login                                                                                                        | `POST /api/v1/invitations/{id}/accept`, `GET /auth/me`                                             |
| `/unauthorized`                             | 403-style page                                                                                                                               | —                                                                                                  |
| **Protected (auth required)**               |                                                                                                                                              |                                                                                                    |
| `/`                                         | Resolver — no UI: active org from `me/context` → PERSONAL `/dashboard`, TEAM `/organization/$organizationSlug/dashboard`, else `/onboarding` | `GET /auth/me/context`                                                                             |
| `/dashboard`                                | Personal-org dashboard (root URL, no org param) — shared `<Dashboard/>`; active org from the session                                         | `GET /auth/me/context`                                                                             |
| `/onboarding`                               | Post-signup wizard (profile → org → invite → done) → new org's dashboard                                                                     | `POST /api/v1/organizations`, invitation endpoints                                                 |
| `/organization`                             | Organization picker (select or create)                                                                                                       | `GET /api/v1/organizations`                                                                        |
| `/organization/$organizationSlug`           | Org-scoped shell — guard chain (auth → membership → status) syncs context from the URL; renders AppShell                                     | memberships + permissions                                                                          |
| `/organization/$organizationSlug/dashboard` | Team-org dashboard — shared `<Dashboard/>`: overview + capability-gated quick actions                                                        | `GET /auth/me/context`                                                                             |
| `/organization/$organizationSlug/suspended` | Blocked state for suspended / lapsed organizations                                                                                           | —                                                                                                  |
| **Settings (hash modal — not routes)**      |                                                                                                                                              |                                                                                                    |
| `#settings/account/…`                       | `profile` · `account` · `security` · `notifications` · `appearance` · `sessions` — global `SettingsModal` over any page                      | profile, MFA, passkey, session endpoints                                                           |
| `#settings/organization/…`                  | `general` · `members` · `roles` · `branches` · `billing` · `integrations` — needs organization context + section permission                  | org endpoints per section                                                                          |
| **System**                                  |                                                                                                                                              |                                                                                                    |
| `/*` (no match)                             | 404                                                                                                                                          | —                                                                                                  |

> **Mock mode:** enabled in **development only** (default on). **Production and staging always use the live API** — `VITE_USE_MOCK_API=true` fails the build. In dev, mock login accepts only `demo@acme.test` / `Password1!` (see `shared/auth/mock-credentials.ts`); other credentials show `login-error`. Org/auth fixtures: `shared/api/organization-fixtures.ts`, `shared/auth/mock-auth.ts`. Tag: `REPLACE_WITH_API`.

**Auth and tenancy (used by multiple routes):**

- Token refresh: `POST /auth/refresh` (cookie), `GET /auth/me`.
- Logout: `POST /auth/logout`.
- Tenancy: the **active org comes from `GET /auth/me/context`** (the JWT `org` claim). It drives the `/` resolver (dual-URL: PERSONAL → root `/dashboard`, TEAM → `/organization/$organizationSlug/dashboard`) and the organization switcher. For the **team space**, the `$organizationSlug` in the URL still drives the membership/status guard + switch-on-navigation; the **personal space** (`/dashboard`) has no org param and reads the active org from the session. See `docs/reference/routing-and-tenancy.md`.

To ensure **all backend routes exposed via MCP are live** in the frontend: use the backend MCP (core-be-api) to list routes, then add a frontend route and page for any backend resource that doesn’t have a path above.

---

## Frontend design: component library

The app uses **shadcn/ui** as the selected component library. Allowed sources are listed in `agent-os/rules/ui-sources.mdc` (e.g. ui.shadcn.com, shadcn.io, and other shadcn-style sources).

- **Primitives:** Implemented in `src/shared/components/ui/` and built on **Radix UI** (radix-ui monorepo). No other UI library is used for core components.
- **Styling:** Tailwind CSS v4, `cn()` from `@/lib/utils.ts`, and design tokens in `src/index.css` (`@theme`). Dark mode via `.dark` class.
- **Patterns:** `cva` for variant-based APIs; `data-slot` on components; ARIA and accessibility per shadcn/Radix.

### UI primitives in use

| Component    | Path                                     | Used for                                             |
| ------------ | ---------------------------------------- | ---------------------------------------------------- |
| Button       | `shared/components/ui/button.tsx`        | Actions, submit, Google sign-in, nav                 |
| Input        | `shared/components/ui/input.tsx`         | Text fields, search                                  |
| Label        | `shared/components/ui/label.tsx`         | Form labels                                          |
| Card         | `shared/components/ui/card.tsx`          | Dashboard cards, content blocks                      |
| Dialog       | `shared/components/ui/dialog.tsx`        | Modals, SessionTimeoutDialog                         |
| AlertDialog  | `shared/components/ui/alert-dialog.tsx`  | Confirmations                                        |
| DropdownMenu | `shared/components/ui/dropdown-menu.tsx` | User menu, actions                                   |
| Tooltip      | `shared/components/ui/tooltip.tsx`       | Hints                                                |
| Checkbox     | `shared/components/ui/checkbox.tsx`      | Settings, tables                                     |
| Separator    | `shared/components/ui/separator.tsx`     | Visual separation                                    |
| Badge        | `shared/components/ui/badge.tsx`         | Status, counts                                       |
| Avatar       | `shared/components/ui/avatar.tsx`        | User avatar                                          |
| Table        | `shared/components/ui/table.tsx`         | DataTable (with TanStack Table)                      |
| Tabs         | `shared/components/ui/tabs.tsx`          | Settings + org management tabs, dashboard team panel |
| Select       | `shared/components/ui/select.tsx`        | Role filters, pickers                                |
| Switch       | `shared/components/ui/switch.tsx`        | MFA / preference toggles                             |
| Skeleton     | `shared/components/ui/skeleton.tsx`      | Loading placeholders (QueryBoundary)                 |
| Popover      | `shared/components/ui/popover.tsx`       | Org switcher, light menus                            |
| Chart        | `shared/components/ui/chart.tsx`         | Recharts wrapper (replaces @nivo)                    |
| Progress     | `shared/components/ui/progress.tsx`      | Profile completeness meter                           |
| Textarea     | `shared/components/ui/textarea.tsx`      | Bio / multi-line inputs (forwards ref for RHF)       |

Other shared pieces: **FormError**, **FormField** (forms), **FullPageSpinner**, **RetryError**, **QueryBoundary** (query loading/error wrapper), **DataTable** (and pagination/toolbar/column header), **MembersTable**, **InvitationsTable**, **InviteMemberDialog**, **CreateOrganizationDialog**, **OrganizationSwitcher**, **OrganizationBadges**, **SettingsModal** (global, hash-driven), **CommandPalette** (cmdk), **PermissionGuard**. Layouts: **AuthLayout** (mounted by the pathless `auth-shell` route), **AppShell** (mounted by the `$organizationSlug` island); the root shell lives in `app/routes/routeTree.tsx`.

All of the above follow the selected component library (shadcn) and design system; no custom or third-party UI libraries are used for core UI.
