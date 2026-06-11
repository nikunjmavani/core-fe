import { mockResponse } from '@/core/http/mock.ts';
import type { OrganizationPermission } from '@/core/rbac/policies.ts';
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

import { MY_PERMISSIONS_FIXTURE } from './organization-fixtures.ts';
import { orgMockStore } from './organization-mock-store.ts';

/** The signed-in user's permissions in the active organization. */
export function getMyPermissions(): Promise<OrganizationPermission[]> {
  // REPLACE_WITH_API: GET /api/v1/tenancy/organizations/{orgId}/memberships/me
  return mockResponse(MY_PERMISSIONS_FIXTURE, { delayMs: 0 });
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

/** List members of the active organization. */
export function listMembers(): Promise<Member[]> {
  // REPLACE_WITH_API: GET /api/v1/tenancy/organizations/{orgId}/memberships
  return mockResponse(orgMockStore.listMembers());
}

/** Update a member's role. */
export function updateMemberRole(input: {
  membershipId: string;
  role: OrgRole;
}): Promise<Member> {
  // REPLACE_WITH_API: PATCH /api/v1/tenancy/organizations/{orgId}/memberships/{membershipId}
  return mockResponse(orgMockStore.updateMemberRole(input.membershipId, input.role));
}

/** Suspend or reactivate a member. */
export function updateMemberStatus(input: {
  membershipId: string;
  status: MembershipStatus;
}): Promise<Member> {
  // REPLACE_WITH_API: PATCH /api/v1/tenancy/organizations/{orgId}/memberships/{membershipId}
  return mockResponse(orgMockStore.updateMemberStatus(input.membershipId, input.status));
}

/** Remove a member from the organization. */
export function removeMember(membershipId: string): Promise<{ id: string }> {
  // REPLACE_WITH_API: DELETE /api/v1/tenancy/organizations/{orgId}/memberships/{membershipId}
  orgMockStore.removeMember(membershipId);
  return mockResponse({ id: membershipId });
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

/** List roles defined in the active organization. */
export function listRoles(): Promise<RoleSummary[]> {
  // REPLACE_WITH_API: GET /api/v1/tenancy/organizations/{orgId}/roles
  return mockResponse(orgMockStore.listRoles());
}

/** Create a custom role. */
export function createRole(input: {
  name: string;
  description: string;
  permissions: string[];
}): Promise<RoleSummary> {
  // REPLACE_WITH_API: POST /api/v1/tenancy/organizations/{orgId}/roles
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

/** Update a custom role. */
export function updateRole(input: {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}): Promise<RoleSummary> {
  // REPLACE_WITH_API: PATCH /api/v1/tenancy/organizations/{orgId}/roles/{roleId}
  return mockResponse(
    orgMockStore.updateRole(input.id, {
      name: input.name,
      description: input.description,
      permissions: input.permissions,
    }),
  );
}

/** Delete a custom role. */
export function deleteRole(roleId: string): Promise<{ id: string }> {
  // REPLACE_WITH_API: DELETE /api/v1/tenancy/organizations/{orgId}/roles/{roleId}
  orgMockStore.deleteRole(roleId);
  return mockResponse({ id: roleId });
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

/** List API keys for the active organization. */
export function listApiKeys(): Promise<ApiKey[]> {
  // REPLACE_WITH_API: GET /api/v1/tenancy/organizations/{orgId}/api-keys
  return mockResponse(orgMockStore.listApiKeys());
}

/** Create an API key. Returns the full secret exactly once. */
export function createApiKey(input: {
  name: string;
  expiresInDays: '30' | '90' | '365' | 'never';
}): Promise<ApiKeyWithSecret> {
  // REPLACE_WITH_API: POST /api/v1/tenancy/organizations/{orgId}/api-keys
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

/** Rename an API key. */
export function renameApiKey(input: { id: string; name: string }): Promise<ApiKey> {
  // REPLACE_WITH_API: PATCH /api/v1/tenancy/organizations/{orgId}/api-keys/{keyId}
  return mockResponse(orgMockStore.renameApiKey(input.id, input.name));
}

/** Revoke (delete) an API key. */
export function revokeApiKey(keyId: string): Promise<{ id: string }> {
  // REPLACE_WITH_API: DELETE /api/v1/tenancy/organizations/{orgId}/api-keys/{keyId}
  orgMockStore.removeApiKey(keyId);
  return mockResponse({ id: keyId });
}

// ── Subscription ──

const PLAN_PRICING: Record<Plan, { amountCents: number; seats: number }> = {
  free: { amountCents: 0, seats: 3 },
  pro: { amountCents: 9900, seats: 10 },
  enterprise: { amountCents: 49900, seats: 50 },
};

/** Get the active organization's subscription. */
export function getSubscription(): Promise<Subscription> {
  // REPLACE_WITH_API: GET /api/v1/tenancy/organizations/{orgId}/subscription
  return mockResponse(orgMockStore.getSubscription());
}

/** Change the subscription plan (updates price + seat allotment). */
export function updateSubscriptionPlan(plan: Plan): Promise<Subscription> {
  // REPLACE_WITH_API: PATCH /api/v1/tenancy/organizations/{orgId}/subscription
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
