import { z } from 'zod';

import { API_BASE_PATH } from '@/core/config/constants.ts';
import { apiClient } from '@/core/http/fetch-client.ts';
import type { OrganizationPermission } from '@/core/rbac/policies.ts';
import { organizationPermissionSchema } from '@/core/types/permissions.ts';
import { isoDateString, publicId } from '@/core/types/wire.ts';
import type {
  ApiKey,
  ApiKeyWithSecret,
  Invitation,
  InvitationStatus,
  Member,
  MembershipStatus,
  OrgRole,
  RoleSummary,
} from '@/shared/api/organization-contracts.ts';
import { AppError } from '@/shared/errors/AppError.ts';
import { FRONTEND_ERROR_CODES } from '@/shared/errors/frontend-error-codes.ts';
import { fetchMeContext } from '@/shared/tenancy/me-context.ts';

/** Active-org scoped tenancy base (active org comes from the token, not the URL). */
const ORG_API = `${API_BASE_PATH}/tenancy/organization`;
const INVITATIONS_API = `${API_BASE_PATH}/tenancy/invitations`;

const VALID_PERMISSIONS = new Set<string>(organizationPermissionSchema.options);

export async function getMyPermissions(): Promise<OrganizationPermission[]> {
  const ctx = await fetchMeContext();
  return ctx.myPermissions.filter((p): p is OrganizationPermission =>
    VALID_PERMISSIONS.has(p),
  );
}

export interface AcceptedInvitation {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
}

const acceptedInvitationWire = z.object({
  organization_id: publicId('org'),
  organization_name: z.string().optional(),
  organization_slug: z.string().nullable().optional(),
});

export async function acceptInvitation(
  invitationId: string,
  token: string,
): Promise<AcceptedInvitation> {
  const res = await apiClient.post<unknown>(
    `${INVITATIONS_API}/${encodeURIComponent(invitationId)}/accept`,
    { token },
    { skip401: true },
  );
  const wire = acceptedInvitationWire.parse(res.data);
  return {
    organizationId: wire.organization_id,
    organizationName: wire.organization_name ?? '',
    organizationSlug: wire.organization_slug ?? '',
  };
}

// ── Members ──

const membershipUserWire = z.object({
  id: publicId('usr'),
  email: z.string(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  avatar_url: z.string().nullable(),
});
const membershipWire = z.object({
  id: z.string(),
  user_id: publicId('usr'),
  role_id: publicId('rol'),
  status: z.enum(['ACTIVE', 'INVITED', 'SUSPENDED']),
  joined_at: isoDateString.nullable(),
  last_active_at: isoDateString.nullable().optional(),
  user: membershipUserWire,
  role: z.object({ id: publicId('rol'), name: z.string() }),
});
type MembershipWire = z.infer<typeof membershipWire>;

function toMembershipStatus(status: MembershipWire['status']): MembershipStatus {
  if (status === 'ACTIVE') return 'active';
  if (status === 'SUSPENDED') return 'suspended';
  return 'invited';
}

function toOrgRole(name: string): OrgRole {
  const n = name.toLowerCase();
  if (n === 'owner' || n === 'admin' || n === 'viewer') return n;
  return 'member';
}

function toMember(w: MembershipWire): Member {
  const fullName = [w.user.first_name, w.user.last_name].filter(Boolean).join(' ');
  return {
    id: w.id,
    userId: w.user_id,
    name: fullName.length > 0 ? fullName : w.user.email,
    email: w.user.email,
    role: toOrgRole(w.role.name),
    status: toMembershipStatus(w.status),
    avatarUrl: w.user.avatar_url ?? undefined,
    joinedAt: w.joined_at ?? '',
    lastActiveAt: w.last_active_at ?? undefined,
  };
}

export async function listMembers(): Promise<Member[]> {
  const res = await apiClient.get<unknown>(`${ORG_API}/memberships`);
  return z.array(membershipWire).parse(res.data).map(toMember);
}

export async function updateMemberRole(input: {
  membershipId: string;
  role: OrgRole;
  roleId?: string;
}): Promise<Member> {
  if (!input.roleId) {
    throw new AppError(
      FRONTEND_ERROR_CODES.MEMBER_ROLE_REQUIRED,
      400,
      FRONTEND_ERROR_CODES.MEMBER_ROLE_REQUIRED,
    );
  }
  const res = await apiClient.patch<unknown>(
    `${ORG_API}/memberships/${input.membershipId}`,
    { role_id: input.roleId },
  );
  return toMember(membershipWire.parse(res.data));
}

export async function updateMemberStatus(input: {
  membershipId: string;
  status: MembershipStatus;
}): Promise<Member> {
  const res = await apiClient.patch<unknown>(
    `${ORG_API}/memberships/${input.membershipId}`,
    { status: input.status.toUpperCase() },
  );
  return toMember(membershipWire.parse(res.data));
}

export async function removeMember(membershipId: string): Promise<{ id: string }> {
  await apiClient.delete<unknown>(`${ORG_API}/memberships/${membershipId}`);
  return { id: membershipId };
}

// ── Invitations ──

const invitationWire = z.object({
  id: z.string(),
  email: z.string(),
  role: z.union([z.object({ name: z.string() }), z.string()]),
  status: z.enum(['PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED']),
  invited_by: z.object({ name: z.string() }).optional(),
  invited_by_name: z.string().optional(),
  created_at: isoDateString,
  expires_at: isoDateString,
});

function toInvitationStatus(
  status: z.infer<typeof invitationWire>['status'],
): InvitationStatus {
  if (status === 'ACCEPTED') return 'accepted';
  if (status === 'EXPIRED') return 'expired';
  if (status === 'REVOKED') return 'revoked';
  return 'pending';
}

function toInvitation(w: z.infer<typeof invitationWire>): Invitation {
  const roleName = typeof w.role === 'string' ? w.role : w.role.name;
  return {
    id: w.id,
    email: w.email,
    role: toOrgRole(roleName),
    status: toInvitationStatus(w.status),
    invitedByName: w.invited_by?.name ?? w.invited_by_name ?? '',
    createdAt: w.created_at,
    expiresAt: w.expires_at,
  };
}

export async function listInvitations(): Promise<Invitation[]> {
  const res = await apiClient.get<unknown>(`${ORG_API}/invitations`);
  return z.array(invitationWire).parse(res.data).map(toInvitation);
}

export async function createInvitation(input: {
  email: string;
  role: OrgRole;
}): Promise<Invitation> {
  const res = await apiClient.post<unknown>(`${ORG_API}/invitations`, {
    email: input.email,
    role: input.role,
  });
  return toInvitation(invitationWire.parse(res.data));
}

export async function revokeInvitation(invitationId: string): Promise<Invitation> {
  const res = await apiClient.delete<unknown>(`${ORG_API}/invitations/${invitationId}`);
  return toInvitation(invitationWire.parse(res.data));
}

export async function resendInvitation(invitationId: string): Promise<Invitation> {
  const res = await apiClient.post<unknown>(
    `${ORG_API}/invitations/${invitationId}/resend`,
    {},
  );
  return toInvitation(invitationWire.parse(res.data));
}

// ── Roles ──

const roleWire = z.object({
  id: publicId('rol'),
  name: z.string(),
  description: z.string().nullable().optional(),
  is_system: z.boolean(),
  permissions: z.array(z.string()).optional(),
  member_count: z.number().int().nonnegative().optional(),
});
type RoleWire = z.infer<typeof roleWire>;

function toRoleSummary(w: RoleWire): RoleSummary {
  return {
    id: w.id,
    name: w.name,
    description: w.description ?? '',
    permissions: w.permissions ?? [],
    memberCount: w.member_count ?? 0,
    isSystem: w.is_system,
  };
}

export async function listRoles(): Promise<RoleSummary[]> {
  const res = await apiClient.get<unknown>(`${ORG_API}/roles`);
  return z.array(roleWire).parse(res.data).map(toRoleSummary);
}

export async function createRole(input: {
  name: string;
  description: string;
  permissions: string[];
}): Promise<RoleSummary> {
  const res = await apiClient.post<unknown>(`${ORG_API}/roles`, input);
  return toRoleSummary(roleWire.parse(res.data));
}

export async function updateRole(input: {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}): Promise<RoleSummary> {
  const res = await apiClient.patch<unknown>(`${ORG_API}/roles/${input.id}`, {
    name: input.name,
    description: input.description,
    permissions: input.permissions,
  });
  return toRoleSummary(roleWire.parse(res.data));
}

export async function deleteRole(roleId: string): Promise<{ id: string }> {
  await apiClient.delete<unknown>(`${ORG_API}/roles/${roleId}`);
  return { id: roleId };
}

// ── API keys ──

const apiKeyWire = z.object({
  id: z.string(),
  name: z.string(),
  prefix: z.string(),
  created_at: isoDateString,
  last_used_at: isoDateString.nullable().optional(),
  expires_at: isoDateString.nullable().optional(),
});
type ApiKeyWire = z.infer<typeof apiKeyWire>;

function toApiKey(w: ApiKeyWire): ApiKey {
  return {
    id: w.id,
    name: w.name,
    prefix: w.prefix,
    createdAt: w.created_at,
    lastUsedAt: w.last_used_at ?? undefined,
    expiresAt: w.expires_at ?? undefined,
  };
}

export async function listApiKeys(): Promise<ApiKey[]> {
  const res = await apiClient.get<unknown>(`${ORG_API}/api-keys`);
  return z.array(apiKeyWire).parse(res.data).map(toApiKey);
}

export async function createApiKey(input: {
  name: string;
  expiresInDays: '30' | '90' | '365' | 'never';
}): Promise<ApiKeyWithSecret> {
  const res = await apiClient.post<unknown>(`${ORG_API}/api-keys`, {
    name: input.name,
    expires_in_days: input.expiresInDays,
  });
  const wire = apiKeyWire.extend({ secret: z.string() }).parse(res.data);
  return { ...toApiKey(wire), secret: wire.secret };
}

export async function renameApiKey(input: { id: string; name: string }): Promise<ApiKey> {
  const res = await apiClient.patch<unknown>(`${ORG_API}/api-keys/${input.id}`, {
    name: input.name,
  });
  return toApiKey(apiKeyWire.parse(res.data));
}

export async function revokeApiKey(keyId: string): Promise<{ id: string }> {
  await apiClient.delete<unknown>(`${ORG_API}/api-keys/${keyId}`);
  return { id: keyId };
}
