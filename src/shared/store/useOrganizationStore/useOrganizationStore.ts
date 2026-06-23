import { create } from 'zustand';

import type { OrganizationPermission } from '@/core/rbac/policies.ts';
import type {
  OrganizationSummary,
  OrganizationType,
  OrgCapabilities,
} from '@/shared/tenancy/me-context.ts';

/** Map the me/context org status (uppercase) to the store's lowercase enum. */
function toStoreStatus(org: OrganizationSummary | null): 'active' | 'suspended' | null {
  if (!org) return null;
  return org.status === 'ACTIVE' ? 'active' : 'suspended';
}

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
  /** Organization status from the membership response. */
  organizationStatus: 'active' | 'suspended' | null;
  /** Active organization type (PERSONAL vs TEAM) — drives capability gating. */
  organizationType: OrganizationType | null;
  /** Active organization capabilities (team-only feature gates). */
  capabilities: OrgCapabilities | null;
  /** Org-scoped permission codes the user holds in the active organization. */
  permissions: OrganizationPermission[];

  setOrganization: (id: string, slug: string, status?: 'active' | 'suspended') => void;
  /** Derive the full active-org context from me/context (the canonical source). */
  setActiveOrganization: (
    org: OrganizationSummary | null,
    permissions: OrganizationPermission[],
  ) => void;
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
  organizationStatus: null,
  organizationType: null,
  capabilities: null,
  permissions: [],

  setActiveOrganization: (org, permissions) =>
    set({
      organizationId: org?.id ?? null,
      organizationSlug: org?.slug ?? null,
      organizationStatus: toStoreStatus(org),
      organizationType: org?.type ?? null,
      capabilities: org?.capabilities ?? null,
      permissions,
    }),

  setOrganization: (organizationId, organizationSlug, organizationStatus) =>
    set({
      organizationId,
      organizationSlug,
      organizationStatus: organizationStatus ?? null,
    }),
  setPermissions: (permissions) => set({ permissions }),
  clearOrganization: () =>
    set({
      organizationId: null,
      organizationSlug: null,
      organizationStatus: null,
      organizationType: null,
      capabilities: null,
      permissions: [],
    }),
}));
