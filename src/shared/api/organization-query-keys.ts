/**
 * Query-key registry for the organization domain. Lives beside the fetchers in
 * `shared/api/` so every resource hook (`useMembers`, `useInvitations`, …)
 * shares one namespace without importing a sibling hook folder.
 */
/**
 * Shared TanStack Query hooks for the organization domain (members, invitations,
 * roles, API keys). Billing hooks live in `useSubscription/` but use `billingQueryKeys`.
 */
/**
 * Keys are scoped by the active organization id so two tenants can never share
 * a cache entry — switching orgs is structural isolation, not a manual cache
 * purge. `all` (the bare `['organization']` prefix) still matches every org for
 * broad invalidation. Pass `organizationId` from `useOrganizationStore`; a
 * `null` id (personal mode) is a distinct, valid scope.
 */
export const orgQueryKeys = {
  all: ['organization'] as const,
  org: (organizationId: string | null) => [...orgQueryKeys.all, organizationId] as const,
  members: (organizationId: string | null) =>
    [...orgQueryKeys.org(organizationId), 'members'] as const,
  invitations: (organizationId: string | null) =>
    [...orgQueryKeys.org(organizationId), 'invitations'] as const,
  roles: (organizationId: string | null) =>
    [...orgQueryKeys.org(organizationId), 'roles'] as const,
  apiKeys: (organizationId: string | null) =>
    [...orgQueryKeys.org(organizationId), 'api-keys'] as const,
};
