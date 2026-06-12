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
    MFA_VERIFY: '/auth/mfa/verify',
    /** Redirect user here to start Google OAuth; backend redirects to Google then callback. */
    GOOGLE: '/auth/oauth/google',
  },
} as const;

export const HTTP = {
  TIMEOUT: 30_000,
  REFRESH_TIMEOUT: 5_000,
  MAX_RETRIES: 3,
  STALE_TIME: 1000 * 60 * 5, // 5 minutes
} as const;

export const ORGANIZATION = {
  HEADER: 'X-Organization-ID',
  LOCALHOST_FALLBACK: 'default',
} as const;
