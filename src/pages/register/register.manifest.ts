import type { PageManifest } from '@/lib/routes/page-manifest.ts';

/**
 * Register — leaf island (`/register`).
 * Public sign-up form that creates the account, sets the auth token, and lands the user
 * on `/` where the onboarding redirect takes over if no organization exists.
 */
export const manifest = {
  segment: 'register',
  path: '/register',
  title: 'Create account',
  testId: 'register-page',
  permission: null,
  kind: 'leaf',
  children: [],
} as const satisfies PageManifest;
