# `pages/login` — Sign-in page

Route: `/login`. Public, unauthenticated entry point where users sign in with
email + password or one of the passwordless options (Google OAuth, passkey, magic link).
Successful sign-in redirects to either the `?redirect=` target (if a safe internal path)
or the dashboard (`/`).

## Files

| File                         | Responsibility                                                                                                                              |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `login.route.tsx`            | Route marker — exports `Component` rendering `LoginPage` inside the shared `AuthLayout`, plus a `loader` enforcing the manifest permission. |
| `login.manifest.ts`          | Page manifest (`path`, `testId`, `permission`, `kind`).                                                                                     |
| `LoginPage.tsx`              | Thin top-level UI wrapper around `<LoginForm />`. Owns `data-testid="login-page"`.                                                          |
| `forms/LoginForm/`           | Email + password form with client-side validation, cooldown after repeated failures, and post-login navigation.                             |
| `forms/PasswordlessOptions/` | Google OAuth + passkey + magic-link buttons shown above the form.                                                                           |
| `hooks/useCooldownClock/`    | Interval-driven `now` clock that ticks while a cooldown is active (used by the submit button countdown).                                    |

## Test IDs

- `login-page` — outer page container
- `login-form` — the email/password form root
- `login-email`, `login-password`, `login-password-toggle`, `login-submit`
- `login-email-error`, `login-password-error`, `login-error`
- `login-google`, `login-passkey`, `login-magic-link`
- `login-link-forgot-password`, `login-link-sign-up`

## Related

- Shared auth contracts: `shared/api/auth-contracts.ts`
- Shared auth API calls: `shared/api/auth-api.ts`
- Auth layout: `src/shared/layouts/AuthLayout/AuthLayout.tsx`
