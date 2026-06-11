import { create } from 'zustand';

import type { OrgPermission } from '@/core/rbac/policies.ts';

const LAST_TENANT_KEY = 'core-last-tenant';

export function getLastTenantFromStorage(): { id: string; slug: string } | null {
  try {
    const raw = localStorage.getItem(LAST_TENANT_KEY);
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

export function persistTenantToStorage(id: string, slug: string): void {
  try {
    localStorage.setItem(LAST_TENANT_KEY, JSON.stringify({ id, slug }));
  } catch {
    // ignore
  }
}

interface TenantStore {
  tenantId: string | null;
  tenantSlug: string | null;
  /** Org-scoped permission codes the user holds in the active organization. */
  permissions: OrgPermission[];

  setTenant: (id: string, slug: string) => void;
  /** Replace the active org's permission set (from the membership response). */
  setPermissions: (permissions: OrgPermission[]) => void;
  clearTenant: () => void;
}

/**
 * Single source of truth for tenant context (active organization + its
 * permissions).
 *
 * Accessible outside React via `useTenantStore.getState()` — used by the HTTP
 * request interceptor to inject `X-Tenant-ID` on every request, and by RBAC
 * guards to resolve org-scoped permissions.
 */
export const useTenantStore = create<TenantStore>((set) => ({
  tenantId: null,
  tenantSlug: null,
  permissions: [],

  setTenant: (tenantId, tenantSlug) => set({ tenantId, tenantSlug }),
  setPermissions: (permissions) => set({ permissions }),
  clearTenant: () => set({ tenantId: null, tenantSlug: null, permissions: [] }),
}));
