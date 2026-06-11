# E2E `data-testid` inventory

Living catalog of stable Playwright selectors. **When you add or rename a testid, update this file** (see `agent-os/skills/e2e-testids/SKILL.md`).

Convention: `page.getByTestId('…')` in `tests/e2e/`.

---

## Auth (`AuthLayout` + forms)

| Test ID                                                    | Element                           | File                                       |
| ---------------------------------------------------------- | --------------------------------- | ------------------------------------------ |
| `auth-layout`                                              | Auth shell                        | `shared/layouts/AuthLayout/AuthLayout.tsx` |
| `auth-form-container`                                      | Form column                       | `shared/layouts/AuthLayout/AuthLayout.tsx` |
| `auth-switch-link`                                         | Create account / Sign in (header) | `shared/layouts/AuthLayout/AuthLayout.tsx` |
| `auth-mobile-logo`                                         | Mobile logo link                  | `shared/layouts/AuthLayout/AuthLayout.tsx` |
| `login-form`                                               | Login form                        | `pages/auth/login/forms/LoginForm.tsx`     |
| `login-email`                                              | Email input                       | LoginForm                                  |
| `login-password`                                           | Password input                    | LoginForm                                  |
| `login-password-toggle`                                    | Show/hide password                | LoginForm                                  |
| `login-submit`                                             | Sign in button                    | LoginForm                                  |
| `login-error`                                              | API error                         | LoginForm                                  |
| _(mock dev login)_                                         | `demo@acme.test` / `Password1!`   | `core/auth/mock-credentials.ts`            |
| `login-email-error`                                        | Email validation                  | LoginForm                                  |
| `login-password-error`                                     | Password validation               | LoginForm                                  |
| `login-link-forgot-password`                               | Forgot password                   | LoginForm                                  |
| `login-link-sign-up`                                       | Sign up                           | LoginForm                                  |
| `login-google`                                             | Google sign-in                    | `PasswordlessOptions.tsx`                  |
| `login-passkey`                                            | Passkey                           | PasswordlessOptions                        |
| `login-magic-link`                                         | Magic link                        | PasswordlessOptions                        |
| `register-form`                                            | Register form                     | `RegisterForm.tsx`                         |
| `register-email` / `register-password` / `register-submit` | Fields                            | RegisterForm                               |
| `register-password-toggle`                                 | Show/hide                         | RegisterForm                               |
| `form-error`                                               | Register API error                | RegisterForm                               |
| `register-link-sign-in`                                    | Back to login                     | RegisterForm                               |
| `forgot-password-form`                                     | Forgot password                   | `ForgotPasswordForm.tsx`                   |
| `forgot-password-email` / `forgot-password-submit`         | Fields                            | ForgotPasswordForm                         |
| `reset-password-form`                                      | Reset password                    | `ResetPasswordForm.tsx`                    |
| `mfa-form` / `mfa-code` / `mfa-submit`                     | MFA                               | `MfaForm.tsx`                              |
| `verify-email-form`                                        | Verify email                      | `VerifyEmailForm.tsx`                      |

---

## App shell

| Test ID                | Element                   | File                               |
| ---------------------- | ------------------------- | ---------------------------------- |
| `dashboard-layout`     | Authenticated shell       | `DashboardLayout.tsx`              |
| `sidebar`              | Sidebar                   | DashboardLayout                    |
| `nav-dashboard`        | Nav → `/`                 | DashboardLayout (sidebar + mobile) |
| `nav-organizations`    | Nav → `/organizations`    | DashboardLayout                    |
| `nav-organization`     | Nav → `/organization`     | DashboardLayout                    |
| `nav-settings`         | Nav → `/settings`         | DashboardLayout                    |
| `mobile-bottom-bar`    | Mobile nav bar            | DashboardLayout                    |
| `mobile-nav-*`         | Mobile nav items (legacy) | DashboardLayout                    |
| `header`               | Top bar                   | DashboardLayout                    |
| `sidebar-toggle`       | Menu button               | DashboardLayout                    |
| `search-trigger`       | Command palette           | DashboardLayout                    |
| `user-menu-trigger`    | Avatar menu               | DashboardLayout                    |
| `logout-button`        | Log out                   | DashboardLayout                    |
| `full-page-spinner`    | Bootstrap loading         | `FullPageSpinner.tsx`              |
| `org-switcher-trigger` | Org switcher              | `OrgSwitcher.tsx`                  |
| `org-switcher-create`  | Create org from switcher  | OrgSwitcher                        |

---

## Dashboard (`/`)

| Test ID                                      | Element            | File                           |
| -------------------------------------------- | ------------------ | ------------------------------ |
| `dashboard-page`                             | Page root          | `DashboardPage.tsx`            |
| `dashboard-greeting`                         | Greeting heading   | DashboardPage                  |
| `dashboard-refresh`                          | Refresh button     | DashboardPage                  |
| `dashboard-download-report`                  | Download CTA       | DashboardPage                  |
| `dashboard-date-range`                       | Date range button  | DashboardPage                  |
| `dashboard-analytics-card`                   | Analytics card     | DashboardPage                  |
| `dashboard-chart-tab-growth`                 | Chart tab          | DashboardPage + `AnimatedTabs` |
| `dashboard-chart-tab-revenue`                | Chart tab          | DashboardPage                  |
| `dashboard-chart-tab-signups`                | Chart tab          | DashboardPage                  |
| `dashboard-charts`                           | Chart area         | `DashboardCharts.tsx`          |
| `dashboard-quick-actions`                    | Quick actions grid | DashboardPage                  |
| `dashboard-quick-action-invite-user`         | Quick action       | DashboardPage                  |
| `dashboard-quick-action-new-organization`    | Quick action       | DashboardPage                  |
| `dashboard-quick-action-view-reports`        | Quick action       | DashboardPage                  |
| `dashboard-quick-action-schedule`            | Quick action       | DashboardPage                  |
| `dashboard-stat-cards`                       | Stat grid          | `StatCards.tsx`                |
| `stat-card-users` / `stat-card-orgs` / …     | Individual stat    | StatCards (`stat-card-${id}`)  |
| `activity-live`                              | Live badge         | DashboardPage                  |
| `activity-feed` / `activity-feed-loading`    | Feed               | `ActivityFeed.tsx`             |
| `activity-heatmap` / `activity-heatmap-grid` | Heatmap            | `ActivityHeatmap.tsx`          |
| `monthly-targets` / `targets-gauge`          | Goals              | `MonthlyTargets.tsx`           |
| `team-section`                               | Team card          | `TeamSection.tsx`              |
| `team-tab-members` / `team-tab-invitations`  | Team tabs          | TeamSection                    |
| `members-table` / `invitations-table`        | Tables             | `shared/components/`           |
| `widget-error-*`                             | Widget boundaries  | `WidgetErrorBoundary`          |

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

| Spec                              | Test IDs used                                                                                                     |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `tests/e2e/auth.spec.ts`          | `login-form`, `login-email`, `login-password`, `login-submit`, `login-error`, `dashboard-page`                    |
| `tests/e2e/dashboard.spec.ts`     | `dashboard-page`, `dashboard-greeting`, `stat-card-*`, `header`, `search-trigger`, `user-menu-trigger`, `sidebar` |
| `tests/e2e/navigation.spec.ts`    | URLs + login redirect                                                                                             |
| `tests/e2e/accessibility.spec.ts` | login + dashboard pages                                                                                           |
| `tests/e2e/visual.spec.ts`        | Screenshots                                                                                                       |

**Planned E2E (testids ready):** onboarding flow, org tabs, settings tabs, team URL `?team=`, passwordless buttons, accept-invite states.
