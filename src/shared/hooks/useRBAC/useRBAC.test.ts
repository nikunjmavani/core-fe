import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import type { AuthUser } from '@/shared/auth/types.ts';
import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';
import { useOrganizationStore } from '@/shared/store/useOrganizationStore/index.ts';

import { useHasPermission } from './useRBAC.ts';

const USER = { id: 'usr_1', email: 'u@e.com', role: 'user' } as AuthUser;

describe('useHasPermission', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null });
    useOrganizationStore.getState().clearOrganization();
  });

  it('is false when signed out', () => {
    const { result } = renderHook(() => useHasPermission('organization:read'));
    expect(result.current).toBe(false);
  });

  it('reflects the active organization permission set', () => {
    useAuthStore.setState({ user: USER });
    useOrganizationStore.getState().setPermissions(['membership:read']);

    expect(renderHook(() => useHasPermission('membership:read')).result.current).toBe(
      true,
    );
    expect(renderHook(() => useHasPermission('role:manage')).result.current).toBe(false);
  });

  it('super_admin bypasses the permission set', () => {
    useAuthStore.setState({ user: { ...USER, role: 'super_admin' } as AuthUser });
    expect(renderHook(() => useHasPermission('role:manage')).result.current).toBe(true);
  });
});
