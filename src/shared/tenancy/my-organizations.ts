import { z } from 'zod';

import { API_BASE_PATH } from '@/core/config/constants.ts';
import { config } from '@/core/config/env.ts';
import { apiClient } from '@/core/http/fetch-client.ts';
import { mockResponse } from '@/core/http/mock.ts';

export const organizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  status: z.enum(['active', 'suspended']).optional().default('active'),
  /** Organization logo (data URL in mock mode; a CDN URL once the API lands). */
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
  /** `null` clears the logo; a string sets it (data URL in mock, CDN URL live). */
  logoUrl: z.string().nullable().optional(),
});
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;

const BASE = API_BASE_PATH;

/** Organizations the signed-in user belongs to (mock fixture while unwired). */
const MY_ORGANIZATIONS_FIXTURE: Organization[] = [
  { id: 'org_acme', name: 'Acme Inc.', slug: 'acme', status: 'active', logoUrl: null },
  { id: 'org_globex', name: 'Globex', slug: 'globex', status: 'active', logoUrl: null },
];

export async function listMyOrganizations(): Promise<Organization[]> {
  // REPLACE_WITH_API: GET /api/v1/tenancy/organizations
  if (config.useMockApi) return mockResponse(MY_ORGANIZATIONS_FIXTURE);
  const res = await apiClient.get<unknown>(`${BASE}/tenancy/organizations`);
  const data = res.data;
  if (!Array.isArray(data)) return [];
  // core-be returns UPPERCASE status + a nullable slug (null for personal orgs)
  // + type/capabilities. Map to the FE Organization shape.
  return data.map((raw) => {
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
  });
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
    const org: Organization = {
      id: `org_${Date.now()}`,
      name: payload.name,
      slug,
      status: 'active',
      logoUrl: null,
    };
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

/**
 * Rename an organization. Name-only by design — the slug drives URLs/API paths
 * and is not editable here. Mock mode mutates the shared org list (like
 * {@link createOrganization}) so the switcher reflects the new name after the
 * `['organizations']` query invalidates.
 */
export async function updateOrganization(
  id: string,
  input: UpdateOrganizationInput,
): Promise<Organization> {
  // REPLACE_WITH_API: PATCH /api/v1/tenancy/organization
  const payload = updateOrganizationSchema.parse(input);
  if (config.useMockApi) {
    const org = MY_ORGANIZATIONS_FIXTURE.find((o) => o.id === id);
    if (!org) throw new Error('Organization not found');
    if (payload.name !== undefined) org.name = payload.name;
    if (payload.logoUrl !== undefined) org.logoUrl = payload.logoUrl;
    return mockResponse({ ...org });
  }
  const res = await apiClient.patch<unknown>(`${BASE}/tenancy/organization`, {
    ...(payload.name !== undefined ? { name: payload.name } : {}),
    ...(payload.logoUrl !== undefined ? { logo_url: payload.logoUrl } : {}),
  });
  const o = res.data as {
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
