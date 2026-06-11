import type { PageManifest } from '@/lib/route-island/page-manifest.ts';

import { dashboardSearchSchema } from './dashboard.search.ts';

/**
 * Dashboard route island manifest (`/`).
 * React boundary: `route.tsx` · UI: `DashboardPage.tsx`
 */
export const page = {
  segment: 'dashboard',
  path: '/',
  testId: 'dashboard-page',
  permission: null,
  kind: 'leaf',
  children: [],
} as const satisfies PageManifest;

export { dashboardSearchSchema as searchSchema };
