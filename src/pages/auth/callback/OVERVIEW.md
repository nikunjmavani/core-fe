# `pages/auth/callback` — OAuth / magic-link callback

Route: `/auth/callback`. Redirect target for Google OAuth and magic-link sign-in.

## Files

| File                 | Responsibility                                                                                                                                                                                                              |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `callback.route.tsx` | Route marker — exports `Component` rendering `CallbackPage`.                                                                                                                                                                |
| `callback.page.ts`   | Page manifest — `kind: 'leaf'`, path `/auth/callback`, no permission required.                                                                                                                                              |
| `CallbackPage.tsx`   | Exchanges the callback (code / token) for a session. In mock mode it calls `performMockLogin` and redirects to the dashboard; on failure it routes back to `/login` with an error. Owns `data-testid="auth-callback-page"`. |

## Wiring to the backend

Replace the mock branch with the real token exchange against the auth service, then set the
in-memory access token and redirect to the originally requested route.
