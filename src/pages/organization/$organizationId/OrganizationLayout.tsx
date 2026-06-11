import { Component as AppShell } from '@/shared/layouts/AppShell/index.ts';

/**
 * Org-scoped shell — thin island wrapper around the shared AppShell
 * (sidebar, header, command palette, `<Outlet />`). Exists so the
 * `$organizationId` island satisfies the 4-file contract while the visual
 * shell stays reusable in `shared/layouts/`.
 */
export function OrganizationLayout() {
  return <AppShell />;
}
