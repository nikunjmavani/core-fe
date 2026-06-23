# `pages/mfa` — TOTP verification step

Route: `/mfa`. Where users land after a successful primary login when MFA is enabled
on their account. When `authApi.login` sees `mfa_required`, it throws
`MfaRequiredError` carrying the short-lived `mfa_session_token`; `LoginForm` catches
it and routes here with that token in router location state (as `mfaToken`). This
page posts the token plus a 6-digit TOTP code to `POST /auth/mfa/login` (public) to
obtain a real access token, then redirects to `/`.

## Files

| File              | Responsibility                                                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `mfa.route.tsx`   | Route marker — exports `Component` rendering `MfaPage` inside `AuthLayout`.                                                                            |
| `mfa.manifest.ts` | Page manifest — `kind: 'leaf'`, path `/mfa`, no permission required.                                                                                   |
| `MfaPage.tsx`     | Thin wrapper that mounts `MfaForm` and exposes `data-testid="mfa-page"`.                                                                               |
| `forms/MfaForm/`  | Code input form, calls `authApi.mfaVerify` (→ `POST /auth/mfa/login`), sets the access token, fetches the user, schedules refresh, and navigates home. |

## State

No page-local Zustand store. The `mfaToken` is read from `useLocation().state`
(set by `LoginForm` on the MFA challenge response). Auth state writes go through
`useAuthStore` and the shared token helpers in `@/shared/auth/`.
