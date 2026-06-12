import type { PageManifest } from '@/lib/routes/page-manifest.ts';

/**
 * Organization shell — layout island (`/organization/$organizationId`).
 * Guard boundary for everything org-scoped: auth → membership/context sync →
 * status. Renders the shared AppShell (sidebar, header, Outlet).
 */
export const manifest = {
  segment: '$organizationId',
  path: '/organization/$organizationId',
  title: 'Organization',
  testId: 'app-shell',
  permission: null,
  kind: 'layout',
  children: ['dashboard', 'suspended'],
} as const satisfies PageManifest;
