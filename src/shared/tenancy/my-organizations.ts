import { z } from 'zod';

import { API_BASE_PATH } from '@/core/config/constants.ts';
import { config } from '@/core/config/env.ts';
import { apiClient } from '@/core/http/fetch-client.ts';
import { mockResponse } from '@/core/http/mock.ts';

export const organizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
});

export type Organization = z.infer<typeof organizationSchema>;

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(1, 'Organization name is required').max(100),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{0,50}$/, 'Lowercase letters, numbers, and hyphens only')
    .optional(),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

const BASE = API_BASE_PATH;

/** Organizations the signed-in user belongs to (mock fixture while unwired). */
const MY_ORGANIZATIONS_FIXTURE: Organization[] = [
  { id: 'org_acme', name: 'Acme Inc.', slug: 'acme' },
  { id: 'org_globex', name: 'Globex', slug: 'globex' },
];

export async function listMyOrganizations(): Promise<Organization[]> {
  // REPLACE_WITH_API: GET /api/v1/tenancy/organizations
  if (config.useMockApi) return mockResponse(MY_ORGANIZATIONS_FIXTURE);
  const res = await apiClient.get<unknown>(`${BASE}/tenancy/organizations`);
  const data = res.data;
  if (!Array.isArray(data)) return [];
  return data.map((o) => organizationSchema.parse(o));
}

/** Derive a URL-safe slug from an organization name (lowercase, hyphenated). */
export function deriveOrganizationSlug(name: string): string {
  return name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .join('-');
}

/** Create a new organization owned by the signed-in user. */
export async function createOrganization(
  input: CreateOrganizationInput,
): Promise<Organization> {
  // REPLACE_WITH_API: POST /api/v1/tenancy/organizations
  const payload = createOrganizationSchema.parse(input);
  const requestedSlug = payload.slug?.trim();
  const derivedSlug = requestedSlug?.length
    ? requestedSlug
    : deriveOrganizationSlug(payload.name);
  const slug = derivedSlug.length ? derivedSlug : 'org';
  if (config.useMockApi) {
    const org: Organization = { id: `org_${Date.now()}`, name: payload.name, slug };
    // Session-persistent like orgMockStore: the new org shows up in listMyOrganizations().
    MY_ORGANIZATIONS_FIXTURE.push(org);
    return mockResponse(org);
  }
  const res = await apiClient.post<unknown>(`${BASE}/tenancy/organizations`, {
    name: payload.name,
    slug,
  });
  return organizationSchema.parse(res.data);
}
