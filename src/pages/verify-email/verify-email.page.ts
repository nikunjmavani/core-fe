import type { PageManifest } from '@/lib/routes/page-manifest.ts';

/**
 * Verify email — leaf island (`/verify-email`).
 * Public page reached from the email-verification link; reads the `token`
 * query param and confirms the user's email address.
 */
export const page = {
  segment: 'verify-email',
  path: '/verify-email',
  testId: 'verify-email-page',
  permission: null,
  kind: 'leaf',
  children: [],
} as const satisfies PageManifest;
