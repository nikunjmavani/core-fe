# E2E `data-testid` inventory

Living catalog of stable Playwright selectors. **When you add or rename a testid, update this file** (see `agent-os/skills/e2e-testids/SKILL.md`).

Convention: `page.getByTestId('…')` in `tests/e2e/`.

---

## Auth (`AuthLayout` + forms)

| Test ID                                                    | Element                           | File                                        |
| ---------------------------------------------------------- | --------------------------------- | ------------------------------------------- |
| `auth-layout`                                              | Auth shell                        | `shared/layouts/AuthLayout/AuthLayout.tsx`  |
| `auth-form-container`                                      | Form column                       | `shared/layouts/AuthLayout/AuthLayout.tsx`  |
| `auth-switch-link`                                         | Create account / Sign in (header) | `shared/layouts/AuthLayout/AuthLayout.tsx`  |
| `auth-mobile-logo`                                         | Mobile logo link                  | `shared/layouts/AuthLayout/AuthLayout.tsx`  |
| `login-form`                                               | Login form                        | `pages/login/forms/LoginForm/LoginForm.tsx` |
| `login-email`                                              | Email input                       | LoginForm                                   |
| `login-password`                                           | Password input                    | LoginForm                                   |
| `login-password-toggle`                                    | Show/hide password                | LoginForm                                   |
| `login-submit`                                             | Sign in button                    | LoginForm                                   |
| `login-error`                                              | API error                         | LoginForm                                   |
| _(mock dev login)_                                         | `demo@acme.test` / `Password1!`   | `core/auth/mock-credentials.ts`             |
| `login-email-error`                                        | Email validation                  | LoginForm                                   |
| `login-password-error`                                     | Password validation               | LoginForm                                   |
| `login-link-forgot-password`                               | Forgot password                   | LoginForm                                   |
| `login-link-sign-up`                                       | Sign up                           | LoginForm                                   |
| `login-google`                                             | Google sign-in                    | `PasswordlessOptions.tsx`                   |
| `login-passkey`                                            | Passkey                           | PasswordlessOptions                         |
| `login-magic-link`                                         | Magic link                        | PasswordlessOptions                         |
| `register-form`                                            | Register form                     | `RegisterForm.tsx`                          |
| `register-email` / `register-password` / `register-submit` | Fields                            | RegisterForm                                |
| `register-password-toggle`                                 | Show/hide                         | RegisterForm                                |
| `form-error`                                               | Register API error                | RegisterForm                                |
| `register-link-sign-in`                                    | Back to login                     | RegisterForm                                |
| `forgot-password-form`                                     | Forgot password                   | `ForgotPasswordForm.tsx`                    |
| `forgot-password-email` / `forgot-password-submit`         | Fields                            | ForgotPasswordForm                          |
| `reset-password-form`                                      | Reset password                    | `ResetPasswordForm.tsx`                     |
| `mfa-form` / `mfa-code` / `mfa-submit`                     | MFA                               | `MfaForm.tsx`                               |
| `verify-email-form`                                        | Verify email                      | `VerifyEmailForm.tsx`                       |

---

## App shell

| Test ID                         | Element                   | File                        |
| ------------------------------- | ------------------------- | --------------------------- |
| `app-shell`                     | Authenticated shell       | `AppShell.tsx`              |
| `sidebar`                       | Sidebar                   | AppShell                    |
| `nav-dashboard`                 | Nav → `/`                 | AppShell (sidebar + mobile) |
| `nav-organizations`             | Nav → `/organizations`    | AppShell                    |
| `nav-organization`              | Nav → `/organization`     | AppShell                    |
| `nav-settings`                  | Nav → `/settings`         | AppShell                    |
| `mobile-bottom-bar`             | Mobile nav bar            | AppShell                    |
| `mobile-nav-*`                  | Mobile nav items (legacy) | AppShell                    |
| `header`                        | Top bar                   | AppShell                    |
| `sidebar-toggle`                | Menu button               | AppShell                    |
| `search-trigger`                | Command palette           | AppShell                    |
| `user-menu-trigger`             | Avatar menu               | AppShell                    |
| `logout-button`                 | Log out                   | AppShell                    |
| `full-page-spinner`             | Bootstrap loading         | `FullPageSpinner.tsx`       |
| `organization-switcher-trigger` | Org switcher              | `OrganizationSwitcher.tsx`  |
| `organization-switcher-create`  | Create org from switcher  | OrganizationSwitcher        |

---

## Dashboard (`/`)

| Test ID              | Element                                                  | File                |
| -------------------- | -------------------------------------------------------- | ------------------- |
| `dashboard-page`     | Page root (placeholder — REPLACE_WITH_MODULE after auth) | `DashboardPage.tsx` |
| `dashboard-greeting` | Placeholder heading                                      | `DashboardPage.tsx` |

> The widget test ids (stat cards, charts, activity, team) were removed with the
> dashboard module stub; re-add them here when the module is rebuilt.
> `members-table` / `invitations-table` / `widget-error-*` remain available from
> `shared/components/` for future modules.

---

## Onboarding, invite, org, settings

See grep in `src/` or sections above for: `onboarding-*`, `accept-invite-*`, `organization-*`, `settings-*`, `organizations-*`, `create-organization-*`.

### Accept invite

| Test ID                 | Element       |
| ----------------------- | ------------- |
| `accept-invite-page`    | Page root     |
| `accept-invite-loading` | Spinner state |
| `accept-invite-success` | Success state |
| `accept-invite-error`   | Error state   |
| `accept-invite-login`   | Go to sign in |

---

## System routes

| Test ID                | Route          |
| ---------------------- | -------------- |
| `not-found-page`       | 404            |
| `unauthorized-page`    | 403            |
| `route-error-boundary` | Error boundary |

---

## E2E specs (existing)

| Spec                                  | Test IDs used                                                                                      |
| ------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `tests/e2e/auth.e2e.test.ts`          | `login-form`, `login-email`, `login-password`, `login-submit`, `login-error`, `dashboard-page`     |
| `tests/e2e/dashboard.e2e.test.ts`     | `dashboard-page`, `dashboard-greeting`, `header`, `search-trigger`, `user-menu-trigger`, `sidebar` |
| `tests/e2e/settings.e2e.test.ts`      | `settings-modal`, `settings-section-security`, `settings-nav-organization-general`, `user-menu-*`  |
| `tests/e2e/navigation.e2e.test.ts`    | URLs + login redirect                                                                              |
| `tests/e2e/accessibility.e2e.test.ts` | login + dashboard pages                                                                            |
| `tests/e2e/visual.e2e.test.ts`        | Screenshots                                                                                        |

**Planned E2E (testids ready):** onboarding flow, org tabs, settings tabs, team URL `?team=`, passwordless buttons, accept-invite states.

## Organization routing (added 2026-06-11)

| Test ID                             | Element                                                       | Source                                                           |
| ----------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------- |
| `organization-page`                 | Organization picker page                                      | `pages/organization/OrganizationPickerPage.tsx`                  |
| `organization-picker-option-<slug>` | Picker card per organization                                  | `pages/organization/OrganizationPickerPage.tsx`                  |
| `organization-picker-create`        | Picker create-organization button                             | `pages/organization/OrganizationPickerPage.tsx`                  |
| `suspended-page`                    | Suspended-organization blocked state                          | `pages/organization/$organizationId/suspended/SuspendedPage.tsx` |
| `suspended-switch-organization`     | Switch-organization button                                    | `pages/organization/$organizationId/suspended/SuspendedPage.tsx` |
| `settings-modal`                    | Global settings modal (hash-driven)                           | `shared/components/SettingsModal/SettingsModal.tsx`              |
| `settings-nav-<scope>-<section>`    | Settings nav items (e.g. `settings-nav-organization-members`) | `shared/components/SettingsModal/SettingsNav.tsx`                |
| `settings-select-organization`      | "Select organization first" fallback                          | `shared/components/SettingsModal/SettingsModal.tsx`              |
