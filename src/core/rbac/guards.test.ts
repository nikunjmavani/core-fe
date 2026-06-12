import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tanstack/react-router', () => ({
  redirect: vi.fn((opts: unknown) => {
    throw { __isRedirect: true, ...(opts as Record<string, unknown>) };
  }),
}));

vi.mock('@/shared/store/useAuthStore/index.ts', () => {
  let state = { user: null as unknown, isAuthenticated: false };
  return {
    useAuthStore: {
      getState: () => state,
      __setState: (s: typeof state) => {
        state = s;
      },
    },
  };
});

vi.mock('@/shared/store/useOrganizationStore/index.ts', () => {
  let state = { permissions: [] as string[] };
  return {
    useOrganizationStore: {
      getState: () => state,
      __setState: (s: typeof state) => {
        state = s;
      },
    },
  };
});

vi.mock('@/core/rbac/policies.ts', async (importOriginal) => {
  return importOriginal();
});

import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';
import { useOrganizationStore } from '@/shared/store/useOrganizationStore/index.ts';

import { redirectIfAuthenticated, requireAuth, requirePermission } from './guards.ts';

const setAuth = (useAuthStore as unknown as { __setState: (s: unknown) => void })
  .__setState;
const setOrganization = (
  useOrganizationStore as unknown as { __setState: (s: unknown) => void }
).__setState;

describe('requireAuth', () => {
  beforeEach(() => {
    setAuth({ user: null, isAuthenticated: false });
  });

  it('throws redirect when not authenticated', () => {
    expect(() => requireAuth()).toThrow();
  });

  it('does not throw when authenticated', () => {
    setAuth({ user: { id: '1', role: 'user' }, isAuthenticated: true });
    expect(() => requireAuth()).not.toThrow();
  });
});

describe('redirectIfAuthenticated', () => {
  it('does not throw for guests (login form renders)', () => {
    setAuth({ user: null, isAuthenticated: false });
    expect(() => redirectIfAuthenticated()).not.toThrow();
  });

  it('redirects signed-in users to / (resolver picks the destination)', () => {
    setAuth({
      user: { id: '1', email: 'u@test.com', role: 'user' },
      isAuthenticated: true,
    });
    try {
      redirectIfAuthenticated();
      expect.fail('should throw');
    } catch (e) {
      expect((e as { to: string }).to).toBe('/');
    }
  });
});

describe('requirePermission', () => {
  beforeEach(() => {
    setAuth({ user: null, isAuthenticated: false });
    setOrganization({ permissions: [] });
  });

  it('throws redirect to login when not authenticated', () => {
    try {
      requirePermission('membership:read');
      expect.fail('should throw');
    } catch (e) {
      expect((e as { to: string }).to).toBe('/login');
    }
  });

  it('throws redirect to unauthorized when lacking permission', () => {
    setAuth({
      user: { id: '1', email: 'u@test.com', role: 'user' },
      isAuthenticated: true,
    });
    setOrganization({ permissions: ['membership:read'] });
    try {
      requirePermission('membership:manage');
      expect.fail('should throw');
    } catch (e) {
      expect((e as { to: string }).to).toBe('/unauthorized');
    }
  });

  it('does not throw when the active org grants the permission', () => {
    setAuth({
      user: { id: '1', email: 'u@test.com', role: 'user' },
      isAuthenticated: true,
    });
    setOrganization({ permissions: ['membership:manage'] });
    expect(() => requirePermission('membership:manage')).not.toThrow();
  });

  it('does not throw for super_admin regardless of org permissions', () => {
    setAuth({
      user: { id: '1', email: 'sa@test.com', role: 'super_admin' },
      isAuthenticated: true,
    });
    setOrganization({ permissions: [] });
    expect(() => requirePermission('organization:delete')).not.toThrow();
  });
});
