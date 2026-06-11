import type { PageManifest } from '@/lib/route-island/page-manifest.ts';

/**
 * Auth callback — leaf island (`/auth/callback`).
 * Redirect target for Google OAuth and magic-link sign-in; exchanges the
 * callback for a session and forwards the user to the dashboard.
 */
export const page = {
  segment: 'callback',
  path: '/auth/callback',
  testId: 'auth-callback-page',
  permission: null,
  kind: 'leaf',
  children: [],
} as const satisfies PageManifest;
