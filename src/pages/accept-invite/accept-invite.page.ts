import type { PageManifest } from '@/lib/routes/page-manifest.ts';

/**
 * Accept-invite — leaf island (`/accept-invite/$invitationId`).
 * Public entry point reached from an invitation email link. Accepts the
 * invite, auto-logs the user in, persists the joined organization, and redirects.
 */
export const page = {
  segment: 'accept-invite',
  path: '/accept-invite/$invitationId',
  testId: 'accept-invite-page',
  permission: null,
  kind: 'leaf',
  children: [],
} as const satisfies PageManifest;
