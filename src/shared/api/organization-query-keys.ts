/**
 * Query-key registry for the organization domain. Lives beside the fetchers in
 * `shared/api/` so every resource hook (`useMembers`, `useInvitations`, …)
 * shares one namespace without importing a sibling hook folder.
 */
/**
 * Shared TanStack Query hooks for the organization domain (members, invitations,
 * roles, API keys). Billing hooks live in `useSubscription/` but use `billingQueryKeys`.
 */
export const orgQueryKeys = {
  all: ['organization'] as const,
  members: () => [...orgQueryKeys.all, 'members'] as const,
  invitations: () => [...orgQueryKeys.all, 'invitations'] as const,
  roles: () => [...orgQueryKeys.all, 'roles'] as const,
  apiKeys: () => [...orgQueryKeys.all, 'api-keys'] as const,
};
