import type { PageManifest } from '@/lib/routes/page-manifest.ts';

/**
 * Dashboard route island manifest (`/organization/$organizationSlug/dashboard`).
 * React boundary: `route.tsx` · UI: `DashboardPage.tsx` (placeholder —
 * REPLACE_WITH_MODULE after auth is finalized).
 */
export const manifest = {
  segment: 'dashboard',
  path: '/organization/$organizationSlug/dashboard',
  title: 'Dashboard',
  testId: 'dashboard-page',
  permission: 'organization:read',
  /** Reference L6b module key — disabled via `VITE_DISABLED_MODULES=billing`. */
  module: 'billing',
  kind: 'leaf',
  children: [],
} as const satisfies PageManifest;
