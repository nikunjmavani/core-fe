import { isNotFound, isRedirect } from '@tanstack/react-router';
import { beforeEach, describe, expect, it } from 'vitest';

import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';
import { useOrganizationStore } from '@/shared/store/useOrganizationStore/index.ts';

import { requirePermissionGate } from './require-permission.ts';

/** Capture a synchronous throw for assertion. */
function thrownBy(fn: () => void): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  return undefined;
}

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
    expect(isRedirect(thrownBy(() => requirePermissionGate('membership:read')()))).toBe(
      true,
    );
  });

  it('hides the surface as a 404 when onDeny is "notFound" (FE-52)', () => {
    useOrganizationStore.setState({ permissions: [] });
    expect(
      isNotFound(thrownBy(() => requirePermissionGate('membership:read', 'notFound')())),
    ).toBe(true);
  });
});
