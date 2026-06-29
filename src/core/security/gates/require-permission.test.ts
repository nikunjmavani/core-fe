import { isNotFound, isRedirect } from '@tanstack/react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/auth/service.ts', () => ({
  awaitAuthBootstrap: vi.fn().mockResolvedValue(undefined),
}));

import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';
import { useOrganizationStore } from '@/shared/store/useOrganizationStore/index.ts';

import { requirePermissionGate } from './require-permission.ts';

beforeEach(() => {
  useAuthStore.setState({
    user: { id: 'u', email: 'a@b.test', role: 'user' },
    isAuthenticated: true,
  });
  useOrganizationStore.getState().clearOrganization();
});

describe('requirePermissionGate (L5)', () => {
  it('passes when the active org grants the permission', async () => {
    useOrganizationStore.setState({ permissions: ['membership:read'] });
    await expect(requirePermissionGate('membership:read')()).resolves.toBeUndefined();
  });

  it('throws (redirect) when the permission is missing', async () => {
    useOrganizationStore.setState({ permissions: [] });
    await expect(requirePermissionGate('membership:read')()).rejects.toSatisfy((error) =>
      isRedirect(error),
    );
  });

  it('hides the surface as a 404 when onDeny is "notFound" (FE-52)', async () => {
    useOrganizationStore.setState({ permissions: [] });
    await expect(
      requirePermissionGate('membership:read', 'notFound')(),
    ).rejects.toSatisfy((error) => isNotFound(error));
  });
});
