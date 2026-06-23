import { describe, expect, it, vi } from 'vitest';

vi.mock('@/core/http/fetch-client.ts', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import { apiClient } from '@/core/http/fetch-client.ts';

import {
  createOrganization,
  listMyOrganizations,
  organizationSchema,
} from './my-organizations.ts';

describe('listMyOrganizations', () => {
  it('returns parsed organizations from API response', async () => {
    const mockData = [
      { id: 'org-1', name: 'Acme', slug: 'acme' },
      { id: 'org-2', name: 'Beta', slug: 'beta' },
    ];
    vi.mocked(apiClient.get).mockResolvedValue({ data: mockData });

    const result = await listMyOrganizations();
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: 'org-1',
      name: 'Acme',
      slug: 'acme',
      status: 'active',
    });
  });

  it('returns empty array when API returns non-array', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: null });

    const result = await listMyOrganizations();
    expect(result).toEqual([]);
  });

  it('throws on invalid organization shape', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [{ id: 'org-1' }], // missing name and slug
    });

    await expect(listMyOrganizations()).rejects.toThrow();
  });
});

describe('createOrganization', () => {
  it('posts name and explicit slug, returns the parsed organization', async () => {
    const created = { id: 'org-3', name: 'Gamma', slug: 'gamma' };
    vi.mocked(apiClient.post).mockResolvedValue({ data: created });

    const result = await createOrganization({ name: 'Gamma', slug: 'gamma' });

    expect(apiClient.post).toHaveBeenCalledWith(
      expect.stringContaining('/organizations'),
      {
        name: 'Gamma',
        slug: 'gamma',
      },
    );
    expect(result).toEqual({ ...created, status: 'active' });
  });

  it('derives a slug from the name when none is provided', async () => {
    const created = { id: 'org-4', name: 'My New Org', slug: 'my-new-org' };
    vi.mocked(apiClient.post).mockResolvedValue({ data: created });

    await createOrganization({ name: 'My New Org' });

    expect(apiClient.post).toHaveBeenCalledWith(
      expect.stringContaining('/organizations'),
      {
        name: 'My New Org',
        slug: 'my-new-org',
      },
    );
  });

  it('rejects an empty name', async () => {
    await expect(createOrganization({ name: '   ' })).rejects.toThrow();
  });

  it('throws when the API returns an invalid shape', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { id: 'org-5' } });

    await expect(createOrganization({ name: 'Bad' })).rejects.toThrow();
  });
});

describe('organizationSchema', () => {
  it('parses valid organization', () => {
    const result = organizationSchema.parse({ id: '1', name: 'Test', slug: 'test' });
    expect(result.slug).toBe('test');
  });

  it('rejects missing fields', () => {
    expect(() => organizationSchema.parse({ id: '1' })).toThrow();
  });
});
