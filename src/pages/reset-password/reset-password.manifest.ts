import type { PageManifest } from '@/lib/routes/page-manifest.ts';

/**
 * Reset password — leaf island (`/reset-password`).
 * Public page reached from the password-reset email link; reads the `token`
 * query param and updates the user's password.
 */
export const manifest = {
  segment: 'reset-password',
  path: '/reset-password',
  testId: 'reset-password-page',
  permission: null,
  kind: 'leaf',
  children: [],
} as const satisfies PageManifest;
