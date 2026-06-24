import { beforeEach, describe, expect, it, vi } from 'vitest';

const { contextMock, statusMock } = vi.hoisted(() => ({
  contextMock: vi.fn(),
  statusMock: vi.fn(),
}));
vi.mock('./route-guards.ts', () => ({
  requireOrganizationContext: contextMock,
  requireActiveOrganization: statusMock,
}));

import { requireOrgStatus, resolveActiveOrg } from './org-gates.ts';

const ctx = {
  location: { pathname: '/x', search: '', hash: '', href: '/x' },
  params: { organizationId: 'org_x' },
};

beforeEach(() => {
  vi.clearAllMocks();
  contextMock.mockResolvedValue({});
});

describe('org gates', () => {
  it('resolveActiveOrg delegates to requireOrganizationContext with the param', async () => {
    await resolveActiveOrg(ctx);
    expect(contextMock).toHaveBeenCalledWith('org_x');
  });

  it('requireOrgStatus delegates to requireActiveOrganization with the param', () => {
    requireOrgStatus(ctx);
    expect(statusMock).toHaveBeenCalledWith('org_x');
  });
});
