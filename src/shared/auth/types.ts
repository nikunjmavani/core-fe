import { z } from 'zod';

/**
 * Global (platform-wide) role, as defined by core-be.
 *
 * - `super_admin` / `admin`: platform staff (admin console — out of scope for the
 *   non-admin tenant app, but modelled for completeness).
 * - `user`: a normal end user; organization-level capabilities are governed by
 *   org-scoped permission codes (see {@link OrgPermission} in `@/core/rbac/policies.ts`),
 *   not by this global role.
 */
export const roleSchema = z.enum(['super_admin', 'admin', 'user']);
export type Role = z.infer<typeof roleSchema>;

/**
 * The authenticated user as surfaced to the client.
 *
 * `tenantId` is optional: the active organization is tracked separately in the
 * tenant store ({@link useTenantStore}) since a user may belong to several orgs.
 */
export const authUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: roleSchema,
  tenantId: z.string().optional(),
  name: z.string().optional(),
  avatarUrl: z.string().optional(),
});

export type AuthUser = z.infer<typeof authUserSchema>;

export const authTokenResponseSchema = z.object({
  accessToken: z.string().min(1),
});

export type AuthTokenResponse = z.infer<typeof authTokenResponseSchema>;
