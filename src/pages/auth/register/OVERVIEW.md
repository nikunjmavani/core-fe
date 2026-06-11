# `pages/auth/register` — New account sign-up

Route: `/register`. Public sign-up page that creates a user via the auth API, stores the
returned access token, fetches the current user profile, and routes the new user to `/`
where the onboarding redirect picks them up if they have no organization yet.

## Files

| File                  | Responsibility                                                                                                                                                                    |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `register.route.tsx`  | Route marker — exports `Component` rendering `RegisterPage` inside the shared `AuthLayout`.                                                                                       |
| `register.page.ts`    | Page manifest (`kind: 'leaf'`, `path: '/register'`, `testId: 'register-page'`, no permission).                                                                                    |
| `RegisterPage.tsx`    | Thin wrapper that mounts `<RegisterForm />` and exposes the page-level `data-testid`.                                                                                             |
| `forms/RegisterForm/` | Email/password form with show-password toggle, Zod validation, and submit-time API error surfacing. On success it sets the access token, schedules refresh, and navigates to `/`. |

## Contracts & API

Schemas (`registerSchema`, `RegisterInput`) live one level up in `pages/auth/auth.contracts.ts`
and are shared with `login` / `forgot-password`. The fetcher lives in `pages/auth/auth.api.ts`
(`authApi.register`, `authApi.me`).

## State

No page-local store. Form state is owned by `react-hook-form`; the resulting user lands in
the global `useAuthStore` and the access token in the in-memory token module
(`shared/auth/token.ts`). Token refresh is scheduled via `shared/auth/refresh-timer.ts`.
