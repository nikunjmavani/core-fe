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

export const API_ENDPOINTS = {
  AUTH: {
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    ME: '/auth/me',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    VERIFY_EMAIL: '/auth/verify-email',
    MFA_VERIFY: '/auth/mfa/verify',
    /** Redirect user here to start Google OAuth; backend redirects to Google then callback. */
    GOOGLE: '/auth/google',
  },
} as const;

export const HTTP = {
  TIMEOUT: 30_000,
  REFRESH_TIMEOUT: 5_000,
  MAX_RETRIES: 3,
  STALE_TIME: 1000 * 60 * 5, // 5 minutes
} as const;

export const TENANT = {
  HEADER: 'X-Tenant-ID',
  LOCALHOST_FALLBACK: 'default',
} as const;
