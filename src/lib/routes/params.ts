import { z } from 'zod';

import type { OrganizationPublicId } from '@/core/types/branded.ts';
import { OrganizationPublicId as brandOrganizationId } from '@/core/types/branded.ts';

/**
 * Route-param validation (docs/reference/routing-and-tenancy.md §8).
 *
 * Params arrive as raw strings; every loader validates them here **before any
 * fetch** — a malformed param is a 404, decided locally. Parsers return `null`
 * on invalid input; the guard layer owns throwing `notFound()`.
 */

/** Public organization ID as it appears in URLs: `org_` + random suffix. */
export const organizationIdParamSchema = z
  .string()
  .regex(/^org_[A-Za-z0-9]{1,32}$/, 'invalid organization id');

/** Parse a raw `$organizationId` param; `null` when malformed. */
export function parseOrganizationIdParam(raw: string): OrganizationPublicId | null {
  const result = organizationIdParamSchema.safeParse(raw);
  return result.success ? brandOrganizationId(result.data) : null;
}
