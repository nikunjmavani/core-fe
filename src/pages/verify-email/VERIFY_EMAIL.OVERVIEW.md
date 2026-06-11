# `pages/verify-email` — Email verification

Route: `/verify-email`. Public page reached from the verification link delivered via
email. The token is read from the `?token=` query parameter and verified automatically
on mount; on success the session is bootstrapped (access token + user in the auth store).

## Files

| File                       | Responsibility                                                                                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `verify-email.route.tsx`   | Route marker — exports `Component` rendering `VerifyEmailPage` and an RBAC `loader`.                                                                                |
| `verify-email.manifest.ts` | Page manifest (path, testId, RBAC, kind).                                                                                                                           |
| `VerifyEmailPage.tsx`      | Thin wrapper that composes `AuthLayout` + `VerifyEmailForm`.                                                                                                        |
| `forms/VerifyEmailForm/`   | Folder-per-unit form: reads `token` from the URL, calls `authApi.verifyEmail`, stores the session, and renders the invalid-link / loading / success / error states. |

## State

No page-local store. The form owns its status via `useState`; the verified session is
written to the global `useAuthStore` (`setAccessToken` + `setUser` + refresh timer).
Network calls live in `shared/api/auth-api.ts`.

## Test IDs

- `verify-email-page` — page container (`VerifyEmailPage`).
- `verify-email-form` — form container in every state (`VerifyEmailForm`).
