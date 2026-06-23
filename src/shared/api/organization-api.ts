import { z } from 'zod';

import { API_BASE_PATH } from '@/core/config/constants.ts';
import { config } from '@/core/config/env.ts';
import { apiClient } from '@/core/http/fetch-client.ts';
import { mockResponse } from '@/core/http/mock.ts';
import type { OrganizationPermission } from '@/core/rbac/policies.ts';
import { organizationPermissionSchema } from '@/core/types/permissions.ts';
import { isoDateString, publicId } from '@/core/types/wire.ts';
import type {
  ApiKey,
  ApiKeyWithSecret,
  Invitation,
  Member,
  MembershipStatus,
  OrgRole,
  Plan,
  RoleSummary,
  Subscription,
} from '@/shared/api/organization-contracts.ts';
import { fetchMeContext } from '@/shared/tenancy/me-context.ts';

/** Active-org scoped tenancy base (active org comes from the token, not the URL). */
const ORG_API = `${API_BASE_PATH}/tenancy/organization`;

import { MY_PERMISSIONS_FIXTURE } from './organization-fixtures.ts';
import { orgMockStore } from './organization-mock-store.ts';

const VALID_PERMISSIONS = new Set<string>(organizationPermissionSchema.options);

/** The signed-in user's permissions in the active organization. */
export async function getMyPermissions(): Promise<OrganizationPermission[]> {
  if (config.useMockApi) return mockResponse(MY_PERMISSIONS_FIXTURE, { delayMs: 0 });
  // Live: derive from the session context (GET /auth/me/context). Permission
  // codes are forward-compatible strings — keep only those the RBAC engine knows.
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

/** Accept an invitation by token; returns the organization that was joined. */
export function acceptInvitation(invitationId: string): Promise<AcceptedInvitation> {
  // REPLACE_WITH_API: POST /api/v1/tenancy/invitations/{invitationId}/accept
  if (invitationId === 'expired') {
    return mockResponse({} as AcceptedInvitation, {
      failWith: new Error('This invitation has expired or is invalid.'),
    });
  }
  return mockResponse({
    organizationId: 'org_acme',
    organizationName: 'Acme Inc.',
    organizationSlug: 'acme',
  });
}

/**
 * Organization domain API.
 *
 * Backed by the in-memory {@link orgMockStore} so create/update/delete operations
 * persist for the session. Each function is annotated with the real core-be
 * endpoint it will call once the backend MCP is wired — swap `mockResponse(...)`
 * and the store call for the corresponding `apiClient` call.
 */

// ── Members ──

// core-be membership wire (snake_case): role is a { id, name } object and the
// user is embedded — both mapped to the flat camelCase Member domain shape.
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
/** Map the org's role name to the FE's coarse OrgRole bucket (custom → member). */
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

/** List members of the active organization. */
export async function listMembers(): Promise<Member[]> {
  if (config.useMockApi) return mockResponse(orgMockStore.listMembers());
  const res = await apiClient.get<unknown>(`${ORG_API}/memberships`);
  return z.array(membershipWire).parse(res.data).map(toMember);
}

/**
 * Update a member's role. Live sends the immutable `role_id` (the Members panel
 * resolves it from the org's roles list); `role` drives the mock + optimistic UI.
 */
export async function updateMemberRole(input: {
  membershipId: string;
  role: OrgRole;
  roleId?: string;
}): Promise<Member> {
  if (config.useMockApi) {
    return mockResponse(orgMockStore.updateMemberRole(input.membershipId, input.role));
  }
  if (!input.roleId) throw new Error('A role id is required to change a member role.');
  const res = await apiClient.patch<unknown>(
    `${ORG_API}/memberships/${input.membershipId}`,
    { role_id: input.roleId },
  );
  return toMember(membershipWire.parse(res.data));
}

/** Suspend or reactivate a member. */
export async function updateMemberStatus(input: {
  membershipId: string;
  status: MembershipStatus;
}): Promise<Member> {
  if (config.useMockApi) {
    return mockResponse(
      orgMockStore.updateMemberStatus(input.membershipId, input.status),
    );
  }
  const res = await apiClient.patch<unknown>(
    `${ORG_API}/memberships/${input.membershipId}`,
    { status: input.status.toUpperCase() },
  );
  return toMember(membershipWire.parse(res.data));
}

/** Remove a member from the organization. */
export async function removeMember(membershipId: string): Promise<{ id: string }> {
  if (config.useMockApi) {
    orgMockStore.removeMember(membershipId);
    return mockResponse({ id: membershipId });
  }
  await apiClient.delete<unknown>(`${ORG_API}/memberships/${membershipId}`);
  return { id: membershipId };
}

// ── Invitations ──

/** List invitations for the active organization. */
export function listInvitations(): Promise<Invitation[]> {
  // REPLACE_WITH_API: GET /api/v1/tenancy/organizations/{orgId}/invitations
  return mockResponse(orgMockStore.listInvitations());
}

/** Create (send) a new invitation. */
export function createInvitation(input: {
  email: string;
  role: OrgRole;
}): Promise<Invitation> {
  // REPLACE_WITH_API: POST /api/v1/tenancy/organizations/{orgId}/invitations
  const now = Date.now();
  const invitation: Invitation = {
    id: `inv_${now}`,
    email: input.email,
    role: input.role,
    status: 'pending',
    invitedByName: 'You',
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + 7 * 24 * 3600 * 1000).toISOString(),
  };
  return mockResponse(orgMockStore.addInvitation(invitation));
}

/** Revoke a pending invitation. */
export function revokeInvitation(invitationId: string): Promise<Invitation> {
  // REPLACE_WITH_API: DELETE /api/v1/tenancy/organizations/{orgId}/invitations/{invitationId}
  return mockResponse(orgMockStore.revokeInvitation(invitationId));
}

/** Resend (refresh the expiry of) an invitation. */
export function resendInvitation(invitationId: string): Promise<Invitation> {
  // REPLACE_WITH_API: POST /api/v1/tenancy/organizations/{orgId}/invitations/{invitationId}/resend
  return mockResponse(orgMockStore.resendInvitation(invitationId));
}

// ── Roles ──

// core-be role wire (snake_case). `permissions` / `member_count` may be absent
// on the list shape — tolerate and default them.
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

/** List roles defined in the active organization. */
export async function listRoles(): Promise<RoleSummary[]> {
  if (config.useMockApi) return mockResponse(orgMockStore.listRoles());
  const res = await apiClient.get<unknown>(`${ORG_API}/roles`);
  return z.array(roleWire).parse(res.data).map(toRoleSummary);
}

/** Create a custom role. */
export async function createRole(input: {
  name: string;
  description: string;
  permissions: string[];
}): Promise<RoleSummary> {
  if (config.useMockApi) {
    const role: RoleSummary = {
      id: `role_${Date.now()}`,
      name: input.name,
      description: input.description,
      permissions: input.permissions,
      memberCount: 0,
      isSystem: false,
    };
    return mockResponse(orgMockStore.addRole(role));
  }
  const res = await apiClient.post<unknown>(`${ORG_API}/roles`, input);
  return toRoleSummary(roleWire.parse(res.data));
}

/** Update a custom role. */
export async function updateRole(input: {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}): Promise<RoleSummary> {
  if (config.useMockApi) {
    return mockResponse(
      orgMockStore.updateRole(input.id, {
        name: input.name,
        description: input.description,
        permissions: input.permissions,
      }),
    );
  }
  const res = await apiClient.patch<unknown>(`${ORG_API}/roles/${input.id}`, {
    name: input.name,
    description: input.description,
    permissions: input.permissions,
  });
  return toRoleSummary(roleWire.parse(res.data));
}

/** Delete a custom role. */
export async function deleteRole(roleId: string): Promise<{ id: string }> {
  if (config.useMockApi) {
    orgMockStore.deleteRole(roleId);
    return mockResponse({ id: roleId });
  }
  await apiClient.delete<unknown>(`${ORG_API}/roles/${roleId}`);
  return { id: roleId };
}

// ── API keys ──

function randomHex(length: number): string {
  const chars = '0123456789abcdef';
  let out = '';
  for (let i = 0; i < length; i += 1) {
    // eslint-disable-next-line sonarjs/pseudo-random -- mock API key generation, not security-sensitive
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

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

/** List API keys for the active organization. */
export async function listApiKeys(): Promise<ApiKey[]> {
  if (config.useMockApi) return mockResponse(orgMockStore.listApiKeys());
  const res = await apiClient.get<unknown>(`${ORG_API}/api-keys`);
  return z.array(apiKeyWire).parse(res.data).map(toApiKey);
}

/** Create an API key. Returns the full secret exactly once. */
export async function createApiKey(input: {
  name: string;
  expiresInDays: '30' | '90' | '365' | 'never';
}): Promise<ApiKeyWithSecret> {
  if (config.useMockApi) {
    const now = Date.now();
    const prefix = `core_live_${randomHex(4)}`;
    const expiresAt =
      input.expiresInDays === 'never'
        ? undefined
        : new Date(now + Number(input.expiresInDays) * 24 * 3600 * 1000).toISOString();
    const apiKey: ApiKey = {
      id: `key_${now}`,
      name: input.name,
      prefix,
      createdAt: new Date(now).toISOString(),
      expiresAt,
    };
    orgMockStore.addApiKey(apiKey);
    return mockResponse({ ...apiKey, secret: `${prefix}_${randomHex(32)}` });
  }
  const res = await apiClient.post<unknown>(`${ORG_API}/api-keys`, {
    name: input.name,
    expires_in_days: input.expiresInDays,
  });
  const wire = apiKeyWire.extend({ secret: z.string() }).parse(res.data);
  return { ...toApiKey(wire), secret: wire.secret };
}

/** Rename an API key. */
export async function renameApiKey(input: { id: string; name: string }): Promise<ApiKey> {
  if (config.useMockApi) {
    return mockResponse(orgMockStore.renameApiKey(input.id, input.name));
  }
  const res = await apiClient.patch<unknown>(`${ORG_API}/api-keys/${input.id}`, {
    name: input.name,
  });
  return toApiKey(apiKeyWire.parse(res.data));
}

/** Revoke (delete) an API key. */
export async function revokeApiKey(keyId: string): Promise<{ id: string }> {
  if (config.useMockApi) {
    orgMockStore.removeApiKey(keyId);
    return mockResponse({ id: keyId });
  }
  await apiClient.delete<unknown>(`${ORG_API}/api-keys/${keyId}`);
  return { id: keyId };
}

// ── Subscription ──

const PLAN_PRICING: Record<Plan, { amountCents: number; seats: number }> = {
  free: { amountCents: 0, seats: 3 },
  pro: { amountCents: 9900, seats: 10 },
  enterprise: { amountCents: 49900, seats: 50 },
};

const subscriptionWire = z.object({
  plan: z.enum(['free', 'pro', 'enterprise']),
  status: z.enum(['active', 'trialing', 'past_due', 'canceled']),
  seats: z.number().int().nonnegative(),
  seats_used: z.number().int().nonnegative(),
  renews_at: isoDateString,
  amount_cents: z.number().int().nonnegative(),
  currency: z.string(),
});
type SubscriptionWire = z.infer<typeof subscriptionWire>;

function toSubscription(w: SubscriptionWire): Subscription {
  return {
    plan: w.plan,
    status: w.status,
    seats: w.seats,
    seatsUsed: w.seats_used,
    renewsAt: w.renews_at,
    amountCents: w.amount_cents,
    currency: w.currency,
  };
}

/** Get the active organization's subscription. */
export async function getSubscription(): Promise<Subscription> {
  if (config.useMockApi) return mockResponse(orgMockStore.getSubscription());
  const res = await apiClient.get<unknown>(`${ORG_API}/subscription`);
  return toSubscription(subscriptionWire.parse(res.data));
}

/** Change the subscription plan (updates price + seat allotment). */
export async function updateSubscriptionPlan(plan: Plan): Promise<Subscription> {
  if (config.useMockApi) {
    // eslint-disable-next-line security/detect-object-injection -- plan is a constrained enum
    const pricing = PLAN_PRICING[plan];
    const current = orgMockStore.getSubscription();
    return mockResponse(
      orgMockStore.updateSubscription({
        plan,
        amountCents: pricing.amountCents,
        seats: pricing.seats,
        seatsUsed: Math.min(current.seatsUsed, pricing.seats),
      }),
    );
  }
  const res = await apiClient.patch<unknown>(`${ORG_API}/subscription`, { plan });
  return toSubscription(subscriptionWire.parse(res.data));
}
