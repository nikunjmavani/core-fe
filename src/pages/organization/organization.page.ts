import type { PageManifest } from '@/lib/routes/page-manifest.ts';

/**
 * Organization picker — list island (`/organization`).
 * Lists the signed-in user's organizations; selecting one enters
 * `/organization/$organizationId/dashboard`. The `/` resolver redirects here
 * when no last-used organization is known.
 */
export const page = {
  segment: 'organization',
  path: '/organization',
  testId: 'organization-page',
  permission: null,
  kind: 'layout',
  children: ['$organizationId'],
} as const satisfies PageManifest;
