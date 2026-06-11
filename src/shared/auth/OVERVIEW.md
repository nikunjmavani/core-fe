# `src/shared/auth/`

Auth runtime — token storage, refresh timer, idle timeout, login/logout service, and mocks. Used by the HTTP client, error handler, shared components, and pages alike, so it lives here (reachable by every layer) rather than in `core/`.

## Files

| File                            | What it does                                                                             |
| ------------------------------- | ---------------------------------------------------------------------------------------- |
| `token.ts` (+ .test)            | In-memory access-token holder (read by every Axios request)                              |
| `service.ts` (+ .test)          | `login()`, `logout()`, `silentRefresh()` — performs the API call + token + store updates |
| `refresh-timer.ts` (+ .test)    | Background timer that calls `silentRefresh()` shortly before token expiry                |
| `idle-timeout.ts` (+ .test)     | Auto-logout on inactivity                                                                |
| `mock-auth.ts` (+ .test)        | Dev/test mock implementations                                                            |
| `mock-credentials.ts` (+ .test) | Dev/test credential fixtures                                                             |
| `types.ts`                      | `AuthUser`, `AuthTokenResponse`, schemas — single source of truth for auth shapes        |

The current-session state itself (the `user` + `isAuthenticated`) lives in `src/shared/store/useAuthStore/`.

## Why not `core/`

`core/` is reserved for framework-agnostic _platform_ services that don't know about React or any specific app concern. Auth has app-specific knowledge (the API shape, the user shape, mock fixtures) and needs to be reachable by every layer:

- `core/http/fetch-client` — reads the token on every request (Axios interceptor)
- `core/errors/errorHandler` — calls `logout()` on 401
- `shared/components/SessionTimeoutDialog` — reads auth state, triggers logout
- `shared/components/PermissionGuard` — reads `isAuthenticated`
- Most pages — call `login()`, `logout()`, read user

If it lived in `pages/`, the HTTP client (which is in core) couldn't reach it. If it lived in `core/`, mock files and app-specific types would pollute the platform layer. `shared/auth/` is the right home.

## Why not `pages/auth/`

`pages/auth/` holds the _screens_ where users authenticate (login form, register form, MFA, etc.). `shared/auth/` holds the _mechanism_ they call. Same distinction as `pages/<page>/<page>.api.ts` (UI's fetchers) vs `core/http/fetch-client.ts` (the HTTP client itself).
