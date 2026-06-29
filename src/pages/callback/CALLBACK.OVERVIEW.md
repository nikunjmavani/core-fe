# `pages/callback` — OAuth callback

Route: `/callback`. Provider-agnostic redirect target for OAuth and future
third-party sign-in — the backend brokers each provider's flow and lands every
one on this single URL, so adding a provider never touches this page. Outside the `auth-shell` route: it renders a bare spinner, not the
split-screen auth chrome.

## Files

| File                   | Responsibility                                                                                                                                                                |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `callback.route.tsx`   | Route marker — exports `Component` rendering `CallbackPage`.                                                                                                                  |
| `callback.manifest.ts` | Page manifest — `kind: 'leaf'`, path `/callback`, no permission required.                                                                                                     |
| `CallbackPage.tsx`     | Runs `silentRefresh()` after OAuth redirect, then navigates via the post-auth resolver. On failure routes back to `/login` with an error. Owns `data-testid="callback-page"`. |

## Wiring to the backend

Replace the placeholder branch with the real token exchange against the auth service, then set the
in-memory access token and redirect to the originally requested route. Register
`https://<app-origin>/callback` as the redirect URI when configuring the live backend.
