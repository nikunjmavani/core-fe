# `pages/reset-password` — Reset password from email link

Route: `/reset-password`. Where a user lands after clicking the password-reset link
delivered via email. The token is read from the `?token=` query parameter.

## Files

| File                       | Responsibility                                                                                                                             |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `reset-password.route.tsx` | Route marker — exports `Component` rendering `ResetPasswordPage`.                                                                          |
| `reset-password.page.ts`   | Manifest: path, testId, RBAC (public), kind=leaf.                                                                                          |
| `ResetPasswordPage.tsx`    | Thin wrapper that mounts `AuthLayout` with the `ResetPasswordForm`.                                                                        |
| `forms/ResetPasswordForm/` | The form unit: reads `token` from the URL, validates with Zod, calls `authApi.resetPassword`, then shows the success / invalid-link state. |

## State

No page-local state. The form owns its own state via `react-hook-form` + Zod
(`resetPasswordSchema` in `shared/api/auth-contracts.ts`). The token comes from the URL
search params and is included in the submit payload.
