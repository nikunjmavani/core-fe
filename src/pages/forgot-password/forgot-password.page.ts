import type { PageManifest } from '@/lib/routes/page-manifest.ts';

/**
 * Forgot password — leaf island (`/forgot-password`).
 * Public page where a user requests a password reset email.
 */
export const page = {
  segment: 'forgot-password',
  path: '/forgot-password',
  testId: 'forgot-password-page',
  permission: null,
  kind: 'leaf',
  children: [],
} as const satisfies PageManifest;
