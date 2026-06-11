import type { PageManifest } from '@/lib/routes/page-manifest.ts';

/**
 * Dashboard route island manifest (`/organization/$organizationId/dashboard`).
 * React boundary: `route.tsx` · UI: `DashboardPage.tsx` (placeholder —
 * REPLACE_WITH_MODULE after auth is finalized).
 */
export const manifest = {
  segment: 'dashboard',
  path: '/organization/$organizationId/dashboard',
  testId: 'dashboard-page',
  permission: null,
  kind: 'leaf',
  children: [],
} as const satisfies PageManifest;
