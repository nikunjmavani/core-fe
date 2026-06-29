import { z } from 'zod';

import { API_BASE_PATH } from '@/core/config/constants.ts';
import { apiClient } from '@/core/http/fetch-client.ts';

export const organizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  status: z.enum(['active', 'suspended']).optional().default('active'),
  logoUrl: z.string().nullable().optional().default(null),
});

export type Organization = z.infer<typeof organizationSchema>;
export type OrganizationStatus = z.infer<typeof organizationSchema>['status'];

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(1, 'Organization name is required').max(100),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{0,50}$/, 'Lowercase letters, numbers, and hyphens only')
    .optional(),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

export const updateOrganizationSchema = z.object({
  name: z.string().trim().min(1, 'Organization name is required').max(100).optional(),
  logoUrl: z.string().nullable().optional(),
});
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;

const BASE = API_BASE_PATH;

/** Derive a URL-safe slug from an organization name (lowercase, hyphenated). */
export function deriveOrganizationSlug(name: string): string {
  return name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .join('-');
}

function mapOrganizationWire(raw: unknown): Organization {
  const o = raw as {
    id: string;
    name: string;
    slug: string | null;
    status?: string;
    logo_url?: string | null;
  };
  return organizationSchema.parse({
    id: o.id,
    name: o.name,
    slug: o.slug ?? '',
    status: (o.status ?? 'ACTIVE').toUpperCase() === 'ACTIVE' ? 'active' : 'suspended',
    logoUrl: o.logo_url ?? null,
  });
}

export async function listMyOrganizations(): Promise<Organization[]> {
  const res = await apiClient.get<unknown>(`${BASE}/tenancy/organizations`);
  const data = res.data;
  if (!Array.isArray(data)) return [];
  return data.map(mapOrganizationWire);
}

export async function createOrganization(
  input: CreateOrganizationInput,
): Promise<Organization> {
  const payload = createOrganizationSchema.parse(input);
  const requestedSlug = payload.slug?.trim();
  const derivedSlug = requestedSlug?.length
    ? requestedSlug
    : deriveOrganizationSlug(payload.name);
  const slug = derivedSlug.length ? derivedSlug : 'org';
  const res = await apiClient.post<unknown>(`${BASE}/tenancy/organizations`, {
    name: payload.name,
    slug,
  });
  return mapOrganizationWire(res.data);
}

export async function updateOrganization(
  _organizationId: string,
  input: UpdateOrganizationInput,
): Promise<Organization> {
  const payload = updateOrganizationSchema.parse(input);
  const res = await apiClient.patch<unknown>(`${BASE}/tenancy/organization`, {
    ...(payload.name !== undefined ? { name: payload.name } : {}),
  });
  return mapOrganizationWire(res.data);
}
