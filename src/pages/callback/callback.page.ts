import type { PageManifest } from '@/lib/routes/page-manifest.ts';

/**
 * Callback — leaf island (`/callback`).
 * Provider-agnostic redirect target for OAuth and magic-link sign-in (the
 * backend brokers every third party onto this one URL); exchanges the
 * callback for a session and forwards the user to the dashboard.
 */
export const page = {
  segment: 'callback',
  path: '/callback',
  testId: 'callback-page',
  permission: null,
  kind: 'leaf',
  children: [],
} as const satisfies PageManifest;
