import { z } from 'zod';

/**
 * Typed search params for the dashboard index route (`/`).
 *
 * Synced to the team members/invitations data table for deep-linkable views.
 */
export const dashboardSearchSchema = z.object({
  /** Active team tab on the dashboard. */
  team: z.enum(['members', 'invitations']).optional(),
  /** Global table search query. */
  q: z.string().max(120).optional(),
  /** Role facet filter (`all` or a specific org role). */
  role: z.enum(['all', 'owner', 'admin', 'member', 'viewer']).optional(),
  /** 1-based page index for pagination. */
  page: z.coerce.number().int().min(1).optional(),
  /** Page size for pagination. */
  size: z.coerce.number().int().min(5).max(50).optional(),
  /** Sort descriptor `columnId:asc|desc`. */
  sort: z
    .string()
    .regex(/^[a-zA-Z]+:(asc|desc)$/)
    .optional(),
});

export type DashboardSearch = z.infer<typeof dashboardSearchSchema>;
