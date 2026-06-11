# `pages/forgot-password` — Password reset request

Route: `/forgot-password`. Public page where an unauthenticated user enters their email
to receive a password reset link.

## Files

| File                          | Responsibility                                                                                                         |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `forgot-password.route.tsx`   | Route marker — exports `Component` rendering `ForgotPasswordPage`.                                                     |
| `forgot-password.manifest.ts` | Page manifest (path, testId, RBAC, kind).                                                                              |
| `ForgotPasswordPage.tsx`      | Thin wrapper that composes `AuthLayout` + `ForgotPasswordForm`.                                                        |
| `forms/ForgotPasswordForm/`   | Folder-per-unit form: collects the email, calls `authApi.forgotPassword`, and renders a confirmation state on success. |

## State

No page-local store. The form owns submit/success state via `useState` and uses
react-hook-form + Zod (`forgotPasswordSchema` in `shared/api/auth-contracts.ts`).
Network call lives in `shared/api/auth-api.ts`.
