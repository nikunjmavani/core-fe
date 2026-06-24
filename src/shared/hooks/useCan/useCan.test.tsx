import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import type { AuthUser } from '@/shared/auth/types.ts';
import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';
import { useOrganizationStore } from '@/shared/store/useOrganizationStore/index.ts';

import { useCan, useVisibleNav } from './useCan.ts';

const USER = { id: 'usr_1', email: 'u@e.com', role: 'user' } as AuthUser;

function setCaps(value: boolean) {
  useOrganizationStore.setState({
    capabilities: {
      canInviteMembers: value,
      canManageMembers: value,
      canManageRoles: value,
      canTransferOwnership: value,
      canDelete: value,
      canManageBilling: value,
    },
  });
}

beforeEach(() => {
  useAuthStore.setState({ user: USER });
  useOrganizationStore.getState().clearOrganization();
});

describe('useCan', () => {
  it('is permissive with no requirement', () => {
    expect(renderHook(() => useCan({})).result.current).toBe(true);
  });

  it('checks an org-scoped permission', () => {
    useOrganizationStore.getState().setPermissions(['membership:read']);
    expect(
      renderHook(() => useCan({ permission: 'membership:read' })).result.current,
    ).toBe(true);
    expect(renderHook(() => useCan({ permission: 'role:manage' })).result.current).toBe(
      false,
    );
  });

  it('checks an org-type capability', () => {
    setCaps(true);
    expect(
      renderHook(() => useCan({ capability: 'canManageMembers' })).result.current,
    ).toBe(true);
    setCaps(false);
    expect(
      renderHook(() => useCan({ capability: 'canManageMembers' })).result.current,
    ).toBe(false);
  });

  it('requires BOTH permission and capability (AND)', () => {
    useOrganizationStore.getState().setPermissions(['membership:read']);
    setCaps(false);
    expect(
      renderHook(() =>
        useCan({ permission: 'membership:read', capability: 'canManageMembers' }),
      ).result.current,
    ).toBe(false);
  });
});

describe('useVisibleNav', () => {
  it('filters items by their access check', () => {
    setCaps(true);
    useOrganizationStore.getState().setPermissions(['membership:read']);
    const items = [
      { id: 'a' },
      { id: 'b', capability: 'canManageMembers' as const },
      { id: 'c', permission: 'role:manage' as const },
    ];
    const visible = renderHook(() => useVisibleNav(items)).result.current;
    expect(visible.map((i) => i.id)).toEqual(['a', 'b']);
  });
});
