# `pages/mfa` — TOTP verification step

Route: `/mfa`. Where users land after a successful primary login when MFA is enabled
on their account. The login response delivers a short-lived `mfaToken` via router
location state; this page exchanges that token plus a 6-digit TOTP code for a real
access token and then redirects to `/`.

## Files

| File              | Responsibility                                                                                                              |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `mfa.route.tsx`   | Route marker — exports `Component` rendering `MfaPage` inside `AuthLayout`.                                                 |
| `mfa.manifest.ts` | Page manifest — `kind: 'leaf'`, path `/mfa`, no permission required.                                                        |
| `MfaPage.tsx`     | Thin wrapper that mounts `MfaForm` and exposes `data-testid="mfa-page"`.                                                    |
| `forms/MfaForm/`  | Code input form, calls `authApi.mfaVerify`, sets the access token, fetches the user, schedules refresh, and navigates home. |

## State

No page-local Zustand store. The `mfaToken` is read from `useLocation().state`
(set by `LoginForm` on the MFA challenge response). Auth state writes go through
`useAuthStore` and the shared token helpers in `@/shared/auth/`.
