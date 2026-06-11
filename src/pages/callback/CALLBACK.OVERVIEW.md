# `pages/callback` — OAuth / magic-link callback

Route: `/callback`. Provider-agnostic redirect target for all third-party sign-in
(Google OAuth, magic link, future providers) — the backend brokers each provider's
flow and lands every one on this single URL, so adding a provider never touches
this page. Outside the `auth-shell` route: it renders a bare spinner, not the
split-screen auth chrome.

## Files

| File                 | Responsibility                                                                                                                                                                                                         |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `callback.route.tsx` | Route marker — exports `Component` rendering `CallbackPage`.                                                                                                                                                           |
| `callback.page.ts`   | Page manifest — `kind: 'leaf'`, path `/callback`, no permission required.                                                                                                                                              |
| `CallbackPage.tsx`   | Exchanges the callback (code / token) for a session. In mock mode it calls `performMockLogin` and redirects to the dashboard; on failure it routes back to `/login` with an error. Owns `data-testid="callback-page"`. |

## Wiring to the backend

Replace the mock branch with the real token exchange against the auth service, then set the
in-memory access token and redirect to the originally requested route. Register
`https://<app-origin>/callback` as the redirect URI when configuring the live backend.
