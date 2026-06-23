import { beforeEach, describe, expect, it } from 'vitest';

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
  it('passes when the active org grants the permission', () => {
    useOrganizationStore.setState({ permissions: ['membership:read'] });
    expect(() => requirePermissionGate('membership:read')()).not.toThrow();
  });

  it('throws (redirect) when the permission is missing', () => {
    useOrganizationStore.setState({ permissions: [] });
    expect(() => requirePermissionGate('membership:read')()).toThrow();
  });
});
