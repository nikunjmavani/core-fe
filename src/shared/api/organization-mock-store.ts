import type {
  ApiKey,
  Invitation,
  Member,
  MembershipStatus,
  OrgRole,
  RoleSummary,
  Subscription,
} from '@/shared/api/organization-contracts.ts';

import {
  API_KEYS_FIXTURE,
  INVITATIONS_FIXTURE,
  MEMBERS_FIXTURE,
  ROLES_FIXTURE,
  SUBSCRIPTION_FIXTURE,
} from './organization-fixtures.ts';

/**
 * In-memory, mutable mock database for the organization domain.
 *
 * The mock API layer (`@/shared/api/organization-api.ts`) reads from and writes to this
 * store so that create/update/delete operations actually persist for the session
 * (TanStack Query invalidation then reflects the change). Seeded from the static
 * fixtures and reset between tests via {@link orgMockStore.reset}.
 *
 * This is demo-only state and disappears when the backend is wired — every mock
 * API function is tagged with its `REPLACE_WITH_API` endpoint.
 */
interface OrgState {
  members: Member[];
  invitations: Invitation[];
  roles: RoleSummary[];
  apiKeys: ApiKey[];
  subscription: Subscription;
}

function seed(): OrgState {
  return structuredClone({
    members: MEMBERS_FIXTURE,
    invitations: INVITATIONS_FIXTURE,
    roles: ROLES_FIXTURE,
    apiKeys: API_KEYS_FIXTURE,
    subscription: SUBSCRIPTION_FIXTURE,
  });
}

let state: OrgState = seed();

function notFound(entity: string, id: string): never {
  throw new Error(`${entity} ${id} not found`);
}

/** Recompute system-role member counts from the live members list. */
function withLiveCounts(roles: RoleSummary[], members: Member[]): RoleSummary[] {
  return roles.map((role) => {
    if (!role.isSystem) return role;
    const count = members.filter((m) => m.role === role.name.toLowerCase()).length;
    return { ...role, memberCount: count };
  });
}

export const orgMockStore = {
  /** Reset all state back to the seed fixtures (used by tests). */
  reset(): void {
    state = seed();
  },

  // ── Members ──
  listMembers(): Member[] {
    return state.members;
  },
  updateMemberRole(id: string, role: OrgRole): Member {
    const member = state.members.find((m) => m.id === id);
    if (!member) notFound('Member', id);
    member.role = role;
    return member;
  },
  updateMemberStatus(id: string, status: MembershipStatus): Member {
    const member = state.members.find((m) => m.id === id);
    if (!member) notFound('Member', id);
    member.status = status;
    return member;
  },
  removeMember(id: string): void {
    state.members = state.members.filter((m) => m.id !== id);
  },

  // ── Invitations ──
  listInvitations(): Invitation[] {
    return state.invitations;
  },
  addInvitation(invitation: Invitation): Invitation {
    state.invitations = [invitation, ...state.invitations];
    return invitation;
  },
  revokeInvitation(id: string): Invitation {
    const invitation = state.invitations.find((i) => i.id === id);
    if (!invitation) notFound('Invitation', id);
    invitation.status = 'revoked';
    return invitation;
  },
  resendInvitation(id: string): Invitation {
    const invitation = state.invitations.find((i) => i.id === id);
    if (!invitation) notFound('Invitation', id);
    invitation.status = 'pending';
    invitation.createdAt = new Date().toISOString();
    invitation.expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    return invitation;
  },

  // ── Roles ──
  listRoles(): RoleSummary[] {
    return withLiveCounts(state.roles, state.members);
  },
  addRole(role: RoleSummary): RoleSummary {
    state.roles = [...state.roles, role];
    return role;
  },
  updateRole(
    id: string,
    patch: Partial<Omit<RoleSummary, 'id' | 'isSystem'>>,
  ): RoleSummary {
    const role = state.roles.find((r) => r.id === id);
    if (!role) notFound('Role', id);
    Object.assign(role, patch);
    return role;
  },
  deleteRole(id: string): void {
    state.roles = state.roles.filter((r) => r.id !== id);
  },

  // ── API keys ──
  listApiKeys(): ApiKey[] {
    return state.apiKeys;
  },
  addApiKey(apiKey: ApiKey): ApiKey {
    state.apiKeys = [apiKey, ...state.apiKeys];
    return apiKey;
  },
  renameApiKey(id: string, name: string): ApiKey {
    const apiKey = state.apiKeys.find((k) => k.id === id);
    if (!apiKey) notFound('API key', id);
    apiKey.name = name;
    return apiKey;
  },
  removeApiKey(id: string): void {
    state.apiKeys = state.apiKeys.filter((k) => k.id !== id);
  },

  // ── Subscription ──
  getSubscription(): Subscription {
    return state.subscription;
  },
  updateSubscription(patch: Partial<Subscription>): Subscription {
    state.subscription = { ...state.subscription, ...patch };
    return state.subscription;
  },
};
