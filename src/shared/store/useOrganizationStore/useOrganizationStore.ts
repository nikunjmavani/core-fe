import { create } from 'zustand';

import type { OrganizationPermission } from '@/core/rbac/policies.ts';

const LAST_ORGANIZATION_KEY = 'core-last-organization';

export function getLastOrganizationFromStorage(): { id: string; slug: string } | null {
  try {
    const raw = localStorage.getItem(LAST_ORGANIZATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === 'object' &&
      'id' in parsed &&
      'slug' in parsed &&
      typeof (parsed as { id: string }).id === 'string' &&
      typeof (parsed as { slug: string }).slug === 'string'
    ) {
      return {
        id: (parsed as { id: string }).id,
        slug: (parsed as { slug: string }).slug,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function persistOrganizationToStorage(id: string, slug: string): void {
  try {
    localStorage.setItem(LAST_ORGANIZATION_KEY, JSON.stringify({ id, slug }));
  } catch {
    // ignore
  }
}

interface OrganizationStore {
  organizationId: string | null;
  organizationSlug: string | null;
  /** Org-scoped permission codes the user holds in the active organization. */
  permissions: OrganizationPermission[];

  setOrganization: (id: string, slug: string) => void;
  /** Replace the active org's permission set (from the membership response). */
  setPermissions: (permissions: OrganizationPermission[]) => void;
  clearOrganization: () => void;
}

/**
 * Derived cache of organization context (canonical value: the URL) (active organization + its
 * permissions).
 *
 * Accessible outside React via `useOrganizationStore.getState()` — used by the HTTP
 * RBAC
 * guards to resolve org-scoped permissions.
 */
export const useOrganizationStore = create<OrganizationStore>((set) => ({
  organizationId: null,
  organizationSlug: null,
  permissions: [],

  setOrganization: (organizationId, organizationSlug) =>
    set({ organizationId, organizationSlug }),
  setPermissions: (permissions) => set({ permissions }),
  clearOrganization: () =>
    set({ organizationId: null, organizationSlug: null, permissions: [] }),
}));
