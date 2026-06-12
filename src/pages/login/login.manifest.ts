import type { PageManifest } from '@/lib/routes/page-manifest.ts';

/**
 * Login — leaf island (`/login`).
 * Public sign-in entry point: email + password plus passwordless options.
 */
export const manifest = {
  segment: 'login',
  path: '/login',
  title: 'Sign in',
  testId: 'login-page',
  permission: null,
  kind: 'leaf',
  children: [],
} as const satisfies PageManifest;
