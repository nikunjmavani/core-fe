import type { PageManifest } from '@/lib/routes/page-manifest.ts';

/**
 * Suspended — leaf island (`/organization/$organizationId/suspended`).
 * Blocked state for suspended / lapsed organizations; target of
 * `requireActiveOrganization`.
 */
export const page = {
  segment: 'suspended',
  path: '/organization/$organizationId/suspended',
  testId: 'suspended-page',
  permission: null,
  kind: 'leaf',
  children: [],
} as const satisfies PageManifest;
