import type { PageManifest } from '@/lib/routes/page-manifest.ts';

/**
 * Forgot password — leaf island (`/forgot-password`).
 * Public page where a user requests a password reset email.
 */
export const manifest = {
  segment: 'forgot-password',
  path: '/forgot-password',
  title: 'Forgot password',
  testId: 'forgot-password-page',
  permission: null,
  kind: 'leaf',
  children: [],
} as const satisfies PageManifest;
