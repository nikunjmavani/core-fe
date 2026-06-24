import { z } from 'zod';

/**
 * Organization domain contracts (Zod schemas + inferred types).
 *
 * These mirror the core-be response shapes for memberships, invitations, roles,
 * and API keys so the UI does not change when the mock API layer is swapped for
 * live `apiClient` calls. See `@/shared/api/organization-api.ts`.
 */

/** Role a member holds within an organization. */
export const orgRoleSchema = z.enum(['owner', 'admin', 'member', 'viewer']);
export type OrgRole = z.infer<typeof orgRoleSchema>;

export const membershipStatusSchema = z.enum(['active', 'invited', 'suspended']);
export type MembershipStatus = z.infer<typeof membershipStatusSchema>;

export const memberSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  email: z.email(),
  role: orgRoleSchema,
  status: membershipStatusSchema,
  avatarUrl: z.url().optional(),
  joinedAt: z.string(),
  lastActiveAt: z.string().optional(),
});
export type Member = z.infer<typeof memberSchema>;

export const invitationStatusSchema = z.enum([
  'pending',
  'accepted',
  'expired',
  'revoked',
]);
export type InvitationStatus = z.infer<typeof invitationStatusSchema>;

export const invitationSchema = z.object({
  id: z.string(),
  email: z.email(),
  role: orgRoleSchema,
  status: invitationStatusSchema,
  invitedByName: z.string(),
  createdAt: z.string(),
  expiresAt: z.string(),
});
export type Invitation = z.infer<typeof invitationSchema>;

export const roleSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  permissions: z.array(z.string()),
  memberCount: z.number().int().nonnegative(),
  isSystem: z.boolean(),
});
export type RoleSummary = z.infer<typeof roleSummarySchema>;

export const apiKeySchema = z.object({
  id: z.string(),
  name: z.string(),
  prefix: z.string(),
  createdAt: z.string(),
  lastUsedAt: z.string().optional(),
  expiresAt: z.string().optional(),
});
export type ApiKey = z.infer<typeof apiKeySchema>;

/**
 * API key returned immediately after creation. The full `secret` is shown to the
 * user exactly once and is never retrievable again (mirrors the backend contract).
 */
export const apiKeyWithSecretSchema = apiKeySchema.extend({ secret: z.string() });
export type ApiKeyWithSecret = z.infer<typeof apiKeyWithSecretSchema>;

/** Form input for creating a new API key. */
export const createApiKeyInputSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(60),
  expiresInDays: z.enum(['30', '90', '365', 'never']),
});
export type CreateApiKeyInput = z.infer<typeof createApiKeyInputSchema>;

export const planSchema = z.enum(['free', 'starter', 'pro']);
export type Plan = z.infer<typeof planSchema>;

export const subscriptionSchema = z.object({
  plan: planSchema,
  status: z.enum(['active', 'trialing', 'past_due', 'canceled']),
  seats: z.number().int().positive(),
  seatsUsed: z.number().int().nonnegative(),
  renewsAt: z.string(),
  amountCents: z.number().int().nonnegative(),
  currency: z.string(),
});
export type Subscription = z.infer<typeof subscriptionSchema>;

/** Assignable (non-system) permissions a custom role may grant. */
export const ASSIGNABLE_ROLE_PERMISSIONS = [
  'organization:read',
  'organization:update',
  'membership:read',
  'membership:manage',
  'invitation:manage',
  'role:read',
  'role:manage',
  'api-key:read',
  'api-key:manage',
  'subscription:read',
  'subscription:manage',
] as const;

/** Form input for creating or editing a custom role. */
export const roleInputSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(40),
  description: z.string().min(2, 'Add a short description').max(160),
  permissions: z.array(z.string()).min(1, 'Select at least one permission'),
});
export type RoleInput = z.infer<typeof roleInputSchema>;
