/**
 * Query-key registry for the organization domain. Lives beside the fetchers in
 * `shared/api/` so every resource hook (`useMembers`, `useInvitations`, …)
 * shares one namespace without importing a sibling hook folder.
 */
/**
 * Shared TanStack Query hooks for the organization domain (members, invitations,
 * roles, API keys, subscription). Used by both the dashboard and the org
 * management settings. Server state only — never mirrored into Zustand.
 */
export const orgQueryKeys = {
  all: ['organization'] as const,
  members: () => [...orgQueryKeys.all, 'members'] as const,
  invitations: () => [...orgQueryKeys.all, 'invitations'] as const,
  roles: () => [...orgQueryKeys.all, 'roles'] as const,
  apiKeys: () => [...orgQueryKeys.all, 'api-keys'] as const,
  subscription: () => [...orgQueryKeys.all, 'subscription'] as const,
};
