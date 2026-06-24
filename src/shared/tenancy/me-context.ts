import { z } from 'zod';

import { API_BASE_PATH } from '@/core/config/constants.ts';
import { config } from '@/core/config/env.ts';
import { apiClient } from '@/core/http/fetch-client.ts';
import { mockResponse } from '@/core/http/mock.ts';
import { isoDateString, publicId } from '@/core/types/wire.ts';

// ── Wire schemas (snake_case — mirror the core-be serializers) ──────────────
const orgCapabilitiesWire = z.object({
  can_invite_members: z.boolean(),
  can_manage_members: z.boolean(),
  can_manage_roles: z.boolean(),
  can_transfer_ownership: z.boolean(),
  can_delete: z.boolean(),
  // Added in core-be #788; tolerate older servers that omit it (default false
  // → billing is hidden, matching a backend that can't gate billing yet).
  can_manage_billing: z.boolean().optional().default(false),
});

export const organizationWire = z.object({
  id: publicId('org'),
  name: z.string(),
  slug: z.string().nullable(),
  type: z.enum(['PERSONAL', 'TEAM']),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'ARCHIVED']),
  logo_url: z.string().nullable(),
  brand_color: z.string().nullable().optional(),
  capabilities: orgCapabilitiesWire,
  created_at: isoDateString,
  updated_at: isoDateString,
});

const userWire = z.object({
  id: publicId('usr'),
  email: z.string(),
  is_email_verified: z.boolean(),
  is_mfa_enabled: z.boolean(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  avatar_url: z.string().nullable(),
  status: z.enum(['ACTIVE', 'LOCKED', 'SUSPENDED']),
  created_at: isoDateString,
  updated_at: isoDateString,
});

/** Wire shape of the `GET /auth/me/context` response `data` (snake_case). */
export const meContextWire = z.object({
  user: userWire,
  active_organization: organizationWire.nullable(),
  // Permission codes are kept as plain strings — forward-compatible with new
  // codes the FE enum may not yet know (RBAC matches by string membership).
  my_permissions: z.array(z.string()),
  global_role: z.enum(['super_admin', 'admin', 'user']).nullable(),
  organizations: z.array(organizationWire.extend({ is_active: z.boolean() })),
});
export type MeContextWire = z.infer<typeof meContextWire>;

// ── Camel-cased domain types (what the app consumes) ────────────────────────
export interface OrgCapabilities {
  canInviteMembers: boolean;
  canManageMembers: boolean;
  canManageRoles: boolean;
  canTransferOwnership: boolean;
  canDelete: boolean;
  canManageBilling: boolean;
}
export type OrganizationType = 'PERSONAL' | 'TEAM';
export type OrganizationStatusValue = 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';
export type GlobalRole = 'super_admin' | 'admin' | 'user';

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string | null;
  type: OrganizationType;
  status: OrganizationStatusValue;
  logoUrl: string | null;
  /** Optional per-org accent (hex/oklch) → `--color-brand` (FE-57); absent until the backend sends it. */
  brandColor?: string | null;
  capabilities: OrgCapabilities;
  createdAt: string;
  updatedAt: string;
}
export interface MeUser {
  id: string;
  email: string;
  isEmailVerified: boolean;
  isMfaEnabled: boolean;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  status: 'ACTIVE' | 'LOCKED' | 'SUSPENDED';
  createdAt: string;
  updatedAt: string;
}
export interface MeContext {
  user: MeUser;
  activeOrganization: OrganizationSummary | null;
  myPermissions: string[];
  globalRole: GlobalRole | null;
  organizations: Array<OrganizationSummary & { isActive: boolean }>;
}

function toCapabilities(w: z.infer<typeof orgCapabilitiesWire>): OrgCapabilities {
  return {
    canInviteMembers: w.can_invite_members,
    canManageMembers: w.can_manage_members,
    canManageRoles: w.can_manage_roles,
    canTransferOwnership: w.can_transfer_ownership,
    canDelete: w.can_delete,
    canManageBilling: w.can_manage_billing,
  };
}
export function toOrganization(w: z.infer<typeof organizationWire>): OrganizationSummary {
  return {
    id: w.id,
    name: w.name,
    slug: w.slug,
    type: w.type,
    status: w.status,
    logoUrl: w.logo_url,
    brandColor: w.brand_color ?? null,
    capabilities: toCapabilities(w.capabilities),
    createdAt: w.created_at,
    updatedAt: w.updated_at,
  };
}

/** Map the validated wire payload to the camel-cased {@link MeContext}. */
export function toMeContext(wire: MeContextWire): MeContext {
  return {
    user: {
      id: wire.user.id,
      email: wire.user.email,
      isEmailVerified: wire.user.is_email_verified,
      isMfaEnabled: wire.user.is_mfa_enabled,
      firstName: wire.user.first_name,
      lastName: wire.user.last_name,
      avatarUrl: wire.user.avatar_url,
      status: wire.user.status,
      createdAt: wire.user.created_at,
      updatedAt: wire.user.updated_at,
    },
    activeOrganization: wire.active_organization
      ? toOrganization(wire.active_organization)
      : null,
    myPermissions: wire.my_permissions,
    globalRole: wire.global_role,
    organizations: wire.organizations.map((o) => ({
      ...toOrganization(o),
      isActive: o.is_active,
    })),
  };
}

// ── Mock context (dev only — live builds reject mock mode) ──────────────────
const MOCK_PERMISSIONS = [
  'organization:read',
  'organization:update',
  'organization:delete',
  'membership:read',
  'membership:manage',
  'invitation:manage',
  'role:read',
  'role:manage',
  'api-key:read',
  'api-key:manage',
  'notification-policy:read',
  'notification-policy:manage',
  'subscription:read',
  'subscription:manage',
  'webhook:read',
  'webhook:manage',
  'audit-log:read',
];
const TEAM_CAPS: OrgCapabilities = {
  canInviteMembers: true,
  canManageMembers: true,
  canManageRoles: true,
  canTransferOwnership: true,
  canDelete: true,
  canManageBilling: true,
};
const PERSONAL_CAPS: OrgCapabilities = {
  canInviteMembers: false,
  canManageMembers: false,
  canManageRoles: false,
  canTransferOwnership: false,
  canDelete: false,
  canManageBilling: false,
};
const MOCK_TEAM_ORG: OrganizationSummary = {
  id: 'org_acme',
  name: 'Acme Inc.',
  slug: 'acme',
  type: 'TEAM',
  status: 'ACTIVE',
  logoUrl: null,
  capabilities: TEAM_CAPS,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};
const MOCK_PERSONAL_ORG: OrganizationSummary = {
  id: 'org_personal',
  name: 'Personal',
  slug: null,
  type: 'PERSONAL',
  status: 'ACTIVE',
  logoUrl: null,
  capabilities: PERSONAL_CAPS,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};
const MOCK_ME_CONTEXT: MeContext = {
  user: {
    id: 'usr_demo',
    email: 'you@acme.test',
    isEmailVerified: true,
    isMfaEnabled: false,
    firstName: 'You',
    lastName: null,
    avatarUrl: null,
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  activeOrganization: MOCK_TEAM_ORG,
  myPermissions: MOCK_PERMISSIONS,
  globalRole: null,
  organizations: [
    { ...MOCK_TEAM_ORG, isActive: true },
    { ...MOCK_PERSONAL_ORG, isActive: false },
  ],
};

/** React Query key for the caller's session context (`GET /auth/me/context`). */
export const meContextQueryKey = ['auth', 'me-context'] as const;

/**
 * The single authoritative read of the caller's session context: user, active
 * organization (+ status + capabilities), resolved permissions, global role, and
 * the org-switcher list. Powers boot hydration, the post-auth resolver, RBAC,
 * and nav visibility. Re-fetch on cold boot; after an org switch the switch
 * endpoint already returns the active-org delta (no extra call needed).
 */
export async function fetchMeContext(): Promise<MeContext> {
  // REPLACE_WITH_API: GET /api/v1/auth/me/context
  if (config.useMockApi) return mockResponse(MOCK_ME_CONTEXT);
  const res = await apiClient.get<unknown>(`${API_BASE_PATH}/auth/me/context`);
  return toMeContext(meContextWire.parse(res.data));
}
