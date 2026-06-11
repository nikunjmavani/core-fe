import type { OrgPermission } from '@/core/rbac/policies.ts';
import type {
  ApiKey,
  Invitation,
  Member,
  RoleSummary,
  Subscription,
} from '@/shared/api/organization-contracts.ts';

/**
 * Permissions the mock signed-in user holds in the active org. Owner-level so
 * every management surface is reachable in the demo. The real backend returns
 * these from the membership response.
 */
export const MY_PERMISSIONS_FIXTURE: OrgPermission[] = [
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

/**
 * Static fixtures backing the mock organization API. Replaced by live backend
 * data once `@/shared/api/organization-api.ts` is wired (search `REPLACE_WITH_API`).
 */

export const MEMBERS_FIXTURE: Member[] = [
  {
    id: 'm_1',
    userId: 'u_1',
    name: 'Ada Lovelace',
    email: 'ada@acme.test',
    role: 'owner',
    status: 'active',
    joinedAt: '2025-01-12T09:00:00.000Z',
    lastActiveAt: '2026-05-29T14:22:00.000Z',
  },
  {
    id: 'm_2',
    userId: 'u_2',
    name: 'Alan Turing',
    email: 'alan@acme.test',
    role: 'admin',
    status: 'active',
    joinedAt: '2025-02-03T10:30:00.000Z',
    lastActiveAt: '2026-05-30T06:10:00.000Z',
  },
  {
    id: 'm_3',
    userId: 'u_3',
    name: 'Grace Hopper',
    email: 'grace@acme.test',
    role: 'member',
    status: 'active',
    joinedAt: '2025-03-21T08:15:00.000Z',
    lastActiveAt: '2026-05-28T19:45:00.000Z',
  },
  {
    id: 'm_4',
    userId: 'u_4',
    name: 'Katherine Johnson',
    email: 'katherine@acme.test',
    role: 'member',
    status: 'active',
    joinedAt: '2025-04-02T12:00:00.000Z',
  },
  {
    id: 'm_5',
    userId: 'u_5',
    name: 'Margaret Hamilton',
    email: 'margaret@acme.test',
    role: 'viewer',
    status: 'suspended',
    joinedAt: '2025-05-19T16:40:00.000Z',
  },
  {
    id: 'm_6',
    userId: 'u_6',
    name: 'Barbara Liskov',
    email: 'barbara@acme.test',
    role: 'member',
    status: 'active',
    joinedAt: '2025-06-30T11:05:00.000Z',
    lastActiveAt: '2026-05-25T09:00:00.000Z',
  },
];

export const INVITATIONS_FIXTURE: Invitation[] = [
  {
    id: 'inv_1',
    email: 'linus@acme.test',
    role: 'member',
    status: 'pending',
    invitedByName: 'Alan Turing',
    createdAt: '2026-05-26T10:00:00.000Z',
    expiresAt: '2026-06-02T10:00:00.000Z',
  },
  {
    id: 'inv_2',
    email: 'dennis@acme.test',
    role: 'admin',
    status: 'pending',
    invitedByName: 'Ada Lovelace',
    createdAt: '2026-05-28T15:30:00.000Z',
    expiresAt: '2026-06-04T15:30:00.000Z',
  },
  {
    id: 'inv_3',
    email: 'ken@acme.test',
    role: 'viewer',
    status: 'expired',
    invitedByName: 'Alan Turing',
    createdAt: '2026-04-01T09:00:00.000Z',
    expiresAt: '2026-04-08T09:00:00.000Z',
  },
];

export const ROLES_FIXTURE: RoleSummary[] = [
  {
    id: 'role_owner',
    name: 'Owner',
    description: 'Full access to the organization, billing, and deletion.',
    permissions: ['organization:update', 'organization:delete', 'membership:manage'],
    memberCount: 1,
    isSystem: true,
  },
  {
    id: 'role_admin',
    name: 'Admin',
    description: 'Manage members, invitations, roles, and API keys.',
    permissions: [
      'membership:manage',
      'invitation:manage',
      'role:manage',
      'api-key:manage',
    ],
    memberCount: 1,
    isSystem: true,
  },
  {
    id: 'role_member',
    name: 'Member',
    description: 'Standard access to organization resources.',
    permissions: ['organization:read', 'membership:read'],
    memberCount: 3,
    isSystem: true,
  },
  {
    id: 'role_viewer',
    name: 'Viewer',
    description: 'Read-only access.',
    permissions: ['organization:read'],
    memberCount: 1,
    isSystem: true,
  },
];

export const API_KEYS_FIXTURE: ApiKey[] = [
  {
    id: 'key_1',
    name: 'Production server',
    prefix: 'core_live_8f2a',
    createdAt: '2025-09-01T12:00:00.000Z',
    lastUsedAt: '2026-05-30T05:00:00.000Z',
  },
  {
    id: 'key_2',
    name: 'CI pipeline',
    prefix: 'core_live_1b7c',
    createdAt: '2026-01-15T09:30:00.000Z',
    lastUsedAt: '2026-05-29T22:10:00.000Z',
    expiresAt: '2026-12-31T23:59:59.000Z',
  },
];

export const SUBSCRIPTION_FIXTURE: Subscription = {
  plan: 'pro',
  status: 'active',
  seats: 10,
  seatsUsed: 6,
  renewsAt: '2026-06-30T00:00:00.000Z',
  amountCents: 9900,
  currency: 'USD',
};
