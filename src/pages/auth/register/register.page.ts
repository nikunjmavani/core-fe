import type { PageManifest } from '@/lib/route-island/page-manifest.ts';

/**
 * Register — leaf island (`/register`).
 * Public sign-up form that creates the account, sets the auth token, and lands the user
 * on `/` where the onboarding redirect takes over if no organization exists.
 */
export const page = {
  segment: 'register',
  path: '/register',
  testId: 'register-page',
  permission: null,
  kind: 'leaf',
  children: [],
} as const satisfies PageManifest;
