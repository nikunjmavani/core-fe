# `pages/login` — Unified auth entry

Route: `/login`. **Single public entry for both sign-in and sign-up.** Users never pick
“login vs register”; the backend treats send uniformly and auto-signs up on first OTP verify
for unknown email.

**Email OTP** is open by default below OAuth and passkey. Alternate methods: Google, GitHub, passkey.

New passwordless users → `/onboarding` → app.

**Docs:** [unified-auth-flows.md](../../../docs/reference/unified-auth-flows.md) ·
[unified-auth-otp-requirement.md](../../../docs/getting-started/requirements/unified-auth-otp-requirement.md)

## Files

| File                     | Responsibility                                            |
| ------------------------ | --------------------------------------------------------- |
| `login.route.tsx`        | Route marker — exports `Component` rendering `LoginPage`. |
| `LoginPage.tsx`          | Thin wrapper around shared `<AuthForm />`.                |
| `shared/forms/AuthForm/` | Unified auth UI — default email OTP + provider buttons.   |

## Flow

1. **Email (default):** email → Continue → 6-digit code → verify → onboarding (new) or app (returning)
   - On the **verify** step, OAuth/passkey and the full welcome copy are hidden — focused “Check your email” + code entry only.
2. **OAuth / passkey:** `/callback` → `silentRefresh()` → post-auth resolver (onboarding or dashboard)

## Login + signup rules (product)

| Step         | FE                         | BE                                                            |
| ------------ | -------------------------- | ------------------------------------------------------------- |
| Send OTP     | Same UI for everyone       | `201` + uniform body — no “account exists” leak               |
| Verify OTP   | Same code UI               | Known user → session; unknown → auto-create account + session |
| After verify | New signup → `/onboarding` | Personal org provisioned on first verify (BE)                 |

## Test IDs

- `auth-form`, `auth-email-panel`, `auth-email-verify-panel`
- `auth-email`, `auth-email-submit`, `auth-email-code`, `auth-email-verify`
- `auth-email-resend`, `auth-email-change`
- `auth-continue-google`, `auth-continue-github`, `auth-continue-passkey`
