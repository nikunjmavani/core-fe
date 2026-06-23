export const AUTH_ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  MFA: '/mfa',
  VERIFY_EMAIL: '/verify-email',
  UNAUTHORIZED: '/unauthorized',
} as const;

/** Base path for API; prepended to all API requests. In dev, Vite proxies /api to backend. */
export const API_BASE_PATH = '/api/v1';

/**
 * Backend endpoint paths, relative to `API_BASE_PATH`. Kept in lock step with
 * core-be's committed route catalog (`../core-be/docs/routes.txt`) — verified
 * by `pnpm contracts:drift` (scripts/ci/check-api-contract-drift.mjs).
 */
export const API_ENDPOINTS = {
  AUTH: {
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
    LOGIN: '/auth/login',
    // No email/password registration route exists in core-be yet — tracked in
    // scripts/ci/contract-drift-allowlist.json until the backend ships it.
    REGISTER: '/auth/register',
    /** Current user profile lives in the users domain, not auth. */
    ME: '/users/me',
    FORGOT_PASSWORD: '/auth/password/forgot',
    RESET_PASSWORD: '/auth/password/reset',
    VERIFY_EMAIL: '/auth/email/verify',
    /** Complete the login second factor: POST { mfa_session_token, code } → token. */
    MFA_LOGIN: '/auth/mfa/login',
    /** Redirect user here to start Google OAuth; backend redirects to Google then callback. */
    GOOGLE: '/auth/oauth/google',
    /** GET → which social providers are configured (e.g. ["google","github"]). */
    OAUTH_PROVIDERS: '/auth/oauth/providers',
    /** Passwordless: POST { email } sends a sign-in code; verify exchanges it for a token. */
    MAGIC_LINK_SEND: '/auth/magic-link/send',
    MAGIC_LINK_VERIFY: '/auth/magic-link/verify',
    /** Re-send the email-verification message (authenticated). */
    RESEND_VERIFICATION: '/auth/email/resend-verification',
  },
} as const;

export const HTTP = {
  TIMEOUT: 30_000,
  REFRESH_TIMEOUT: 5_000,
  MAX_RETRIES: 3,
  STALE_TIME: 1000 * 60 * 5, // 5 minutes
} as const;

/** Session-lifetime limits (absolute cap + watchdog cadence). */
export const SESSION = {
  /**
   * Absolute session lifetime, independent of activity. A session kept warm by
   * the proactive refresh would otherwise never expire client-side; after this
   * the user is forced to re-authenticate. UX/defense-in-depth — the backend's
   * refresh-session age remains the source of truth.
   */
  MAX_AGE_MS: 12 * 60 * 60 * 1000, // 12 hours
  /** How often the watchdog re-checks the absolute cap. */
  LIFETIME_CHECK_INTERVAL_MS: 60_000,
} as const;

// No HEADER entry: the backend scopes organization context from the URL path
// (/api/v1/tenancy/organizations/:id/…) — there is no X-Organization-ID header.
export const ORGANIZATION = {
  LOCALHOST_FALLBACK: 'default',
} as const;
