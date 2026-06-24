import type { PageManifest } from '@/lib/routes/page-manifest.ts';

/**
 * Organization shell — layout island (`/organization/$organizationSlug`).
 * Guard boundary for everything org-scoped: auth → membership/context sync →
 * status. Renders the shared AppShell (sidebar, header, Outlet).
 */
export const manifest = {
  segment: '$organizationSlug',
  path: '/organization/$organizationSlug',
  title: 'Organization',
  testId: 'app-shell',
  permission: null,
  kind: 'layout',
  children: ['dashboard', 'suspended'],
} as const satisfies PageManifest;
