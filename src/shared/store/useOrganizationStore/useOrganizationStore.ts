import { create } from 'zustand';

import type { OrganizationPermission } from '@/core/rbac/policies.ts';
import type { DeploymentFlags } from '@/shared/tenancy/deployment-mode.ts';
import { DEFAULT_DEPLOYMENT_FLAGS } from '@/shared/tenancy/deployment-mode.ts';
import type {
  OrganizationSummary,
  OrganizationType,
} from '@/shared/tenancy/me-context.ts';

/** Map the me/context org status (uppercase) to the store's lowercase enum. */
function toStoreStatus(org: OrganizationSummary | null): 'active' | 'suspended' | null {
  if (!org) return null;
  return org.status === 'ACTIVE' ? 'active' : 'suspended';
}

interface OrganizationStore {
  organizationId: string | null;
  organizationSlug: string | null;
  /** Organization status from the membership response. */
  organizationStatus: 'active' | 'suspended' | null;
  /** Active organization type (PERSONAL vs TEAM) — gates team-only UI. */
  organizationType: OrganizationType | null;
  /** Org-scoped permission codes the user holds in the active organization. */
  permissions: OrganizationPermission[];
  /** Deployment-wide personal/team toggles (from me/context). */
  deploymentFlags: DeploymentFlags;
  personalOrganizationId: string | null;

  setOrganization: (id: string, slug: string, status?: 'active' | 'suspended') => void;
  /** Derive the full active-org context from me/context (the canonical source). */
  setActiveOrganization: (
    org: OrganizationSummary | null,
    permissions: OrganizationPermission[],
  ) => void;
  setDeploymentContext: (
    flags: DeploymentFlags,
    personalOrganizationId: string | null,
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
  permissions: [],
  deploymentFlags: DEFAULT_DEPLOYMENT_FLAGS,
  personalOrganizationId: null,

  setActiveOrganization: (org, permissions) =>
    set({
      organizationId: org?.id ?? null,
      organizationSlug: org?.slug ?? null,
      organizationStatus: toStoreStatus(org),
      organizationType: org?.type ?? null,
      permissions,
    }),

  setDeploymentContext: (deploymentFlags, personalOrganizationId) =>
    set({ deploymentFlags, personalOrganizationId }),

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
      permissions: [],
      deploymentFlags: DEFAULT_DEPLOYMENT_FLAGS,
      personalOrganizationId: null,
    }),
}));
