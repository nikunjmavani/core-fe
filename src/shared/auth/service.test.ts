import { type Mock, vi } from 'vitest';

import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';
import { useOrganizationStore } from '@/shared/store/useOrganizationStore/index.ts';
import type { MeContext } from '@/shared/tenancy/me-context.ts';

import { clearAccessToken, getAccessToken, setAccessToken } from './token.ts';
import type { AuthUser } from './types.ts';

// Mock global fetch
let fetchMock: ReturnType<typeof vi.fn>;

const { fetchMeContextMock, setQueryDataMock } = vi.hoisted(() => ({
  fetchMeContextMock: vi.fn(),
  setQueryDataMock: vi.fn(),
}));

vi.mock('@/core/http/queryClient.ts', () => ({
  queryClient: { clear: vi.fn(), setQueryData: setQueryDataMock },
}));

vi.mock('@/shared/tenancy/me-context.ts', () => ({
  fetchMeContext: fetchMeContextMock,
  meContextQueryKey: ['auth', 'me-context'],
}));

vi.mock('@/shared/auth/refresh-timer.ts', () => ({
  scheduleTokenRefresh: vi.fn(),
  cancelTokenRefresh: vi.fn(),
}));

/** Helper to create a minimal JWT (base64url) */
function makeJwt(payload: Record<string, unknown>): string {
  const encode = (obj: Record<string, unknown>) =>
    btoa(JSON.stringify(obj))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/={1,2}$/, '');
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const body = encode(payload);
  return `${header}.${body}.dGVzdHNpZw`;
}

const VALID_TOKEN = makeJwt({ sub: 'user1', exp: 9999999999 });
const MOCK_USER: AuthUser = {
  id: 'user-1',
  email: 'test@example.com',
  role: 'admin',
  organizationId: 'org_test1',
  name: 'Test User',
};

const SAMPLE_CTX: MeContext = {
  user: {
    id: 'usr_1',
    email: 'ada@acme.test',
    isEmailVerified: true,
    isMfaEnabled: false,
    firstName: 'Ada',
    lastName: 'Byron',
    avatarUrl: null,
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  activeOrganization: {
    id: 'org_1',
    name: 'Acme',
    slug: 'acme',
    type: 'TEAM',
    status: 'ACTIVE',
    logoUrl: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  myPermissions: ['organization:read'],
  globalRole: null,
  organizations: [],
  deploymentFlags: { personalOrganizations: true, teamOrganizations: true },
  personalOrganizationId: null,
};

function mockFetchResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

import type * as AuthServiceModule from './service.ts';

describe('auth/service', () => {
  let silentRefresh: AuthServiceModule['silentRefresh'];
  let forceLogout: AuthServiceModule['forceLogout'];
  let logout: AuthServiceModule['logout'];
  let refreshAccessToken: AuthServiceModule['refreshAccessToken'];
  let establishSession: AuthServiceModule['establishSession'];

  beforeAll(async () => {
    const mod = await import('./service.ts');
    silentRefresh = mod.silentRefresh;
    forceLogout = mod.forceLogout;
    logout = mod.logout;
    refreshAccessToken = mod.refreshAccessToken;
    establishSession = mod.establishSession;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    clearAccessToken();
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: true,
    });
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { href: '' },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('forceLogout', () => {
    it('clears token, auth store, and redirects to /login', () => {
      setAccessToken(VALID_TOKEN);
      useAuthStore.getState().setUser(MOCK_USER);

      forceLogout();

      expect(getAccessToken()).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().user).toBeNull();
      expect(window.location.href).toBe('/login');
    });

    it('wipes the active-org context + RBAC permissions (no privilege bleed to next sign-in)', () => {
      setAccessToken(VALID_TOKEN);
      useAuthStore.getState().setUser(MOCK_USER);
      // Seed an org context with elevated grants, as if a session were active.
      useOrganizationStore.getState().setOrganization('org_prev', 'acme', 'active');
      useOrganizationStore.setState({ permissions: ['membership:manage'] });

      forceLogout();

      // Must not rely on the post-logout reload — the store is cleared inline,
      // so a non-reloading logout path can't leave one user's grants behind.
      expect(useOrganizationStore.getState().organizationId).toBeNull();
      expect(useOrganizationStore.getState().permissions).toEqual([]);
    });
  });

  describe('silentRefresh', () => {
    it('sets token and user on success', async () => {
      fetchMeContextMock.mockResolvedValueOnce(SAMPLE_CTX);
      (fetchMock as Mock).mockResolvedValueOnce(
        mockFetchResponse({ data: { access_token: VALID_TOKEN } }),
      );

      await silentRefresh();

      expect(getAccessToken()).toBe(VALID_TOKEN);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().user?.email).toBe('ada@acme.test');
    });

    it('rolls back token if context fetch fails', async () => {
      (fetchMock as Mock).mockResolvedValueOnce(
        mockFetchResponse({ data: { access_token: VALID_TOKEN } }),
      );
      fetchMeContextMock.mockRejectedValueOnce(new Error('Network error'));

      await expect(silentRefresh()).rejects.toThrow('Network error');
      expect(getAccessToken()).toBeNull();
    });

    it('rejects if refresh endpoint fails', async () => {
      (fetchMock as Mock).mockRejectedValueOnce(new Error('401'));

      await expect(silentRefresh()).rejects.toThrow('401');
      expect(getAccessToken()).toBeNull();
    });

    it('deduplicates concurrent calls (mutex)', async () => {
      fetchMeContextMock.mockResolvedValue(SAMPLE_CTX);
      (fetchMock as Mock).mockResolvedValue(
        mockFetchResponse({ data: { access_token: VALID_TOKEN } }),
      );

      const [r1, r2] = await Promise.all([silentRefresh(), silentRefresh()]);

      expect(r1).toBeUndefined();
      expect(r2).toBeUndefined();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('refreshAccessToken (the ONE single-flight)', () => {
    it('concurrent calls share ONE /auth/refresh request', async () => {
      (fetchMock as Mock).mockResolvedValueOnce(
        mockFetchResponse({ data: { access_token: VALID_TOKEN } }),
      );

      // jsdom has no navigator.locks, so this also covers the fallback path.
      await Promise.all([refreshAccessToken(), refreshAccessToken()]);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/auth/refresh');
      expect(getAccessToken()).toBe(VALID_TOKEN);
    });

    it('a failed refresh clears the in-flight slot so the next call retries', async () => {
      (fetchMock as Mock)
        .mockResolvedValueOnce(mockFetchResponse({ message: 'session revoked' }, 401))
        .mockResolvedValueOnce(
          mockFetchResponse({ data: { access_token: VALID_TOKEN } }),
        );

      await expect(refreshAccessToken()).rejects.toThrow('session revoked');
      await refreshAccessToken();

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(getAccessToken()).toBe(VALID_TOKEN);
    });

    it('serializes through the cross-tab Web Lock when navigator.locks exists', async () => {
      const lockRequest = vi.fn(
        (_name: string, cb: () => Promise<unknown>): Promise<unknown> => cb(),
      );
      Object.defineProperty(navigator, 'locks', {
        configurable: true,
        value: { request: lockRequest },
      });
      try {
        (fetchMock as Mock).mockResolvedValueOnce(
          mockFetchResponse({ accessToken: VALID_TOKEN }),
        );

        await refreshAccessToken();

        expect(lockRequest).toHaveBeenCalledTimes(1);
        expect(lockRequest.mock.calls[0]?.[0]).toBe('core-auth:refresh');
        expect(getAccessToken()).toBe(VALID_TOKEN);
      } finally {
        delete (navigator as { locks?: unknown }).locks;
      }
    });
  });

  describe('logout', () => {
    it('calls logout endpoint and then forceLogout', async () => {
      (fetchMock as Mock).mockResolvedValueOnce(mockFetchResponse({}));
      setAccessToken(VALID_TOKEN);
      useAuthStore.getState().setUser(MOCK_USER);

      await logout();

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/auth/logout'),
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        }),
      );
      expect(getAccessToken()).toBeNull();
      expect(window.location.href).toBe('/login');
    });

    it('still clears state even if logout endpoint fails', async () => {
      (fetchMock as Mock).mockRejectedValueOnce(new Error('Network down'));
      setAccessToken(VALID_TOKEN);

      await logout();

      expect(getAccessToken()).toBeNull();
      expect(window.location.href).toBe('/login');
    });
  });

  describe('establishSession', () => {
    it('seeds the me/context cache + header user from one canonical read', async () => {
      fetchMeContextMock.mockResolvedValueOnce(SAMPLE_CTX);

      await establishSession(VALID_TOKEN);

      expect(getAccessToken()).toBe(VALID_TOKEN);
      expect(setQueryDataMock).toHaveBeenCalledWith(['auth', 'me-context'], SAMPLE_CTX);
      const user = useAuthStore.getState().user;
      expect(user?.email).toBe('ada@acme.test');
      expect(user?.name).toBe('Ada Byron');
      expect(user?.organizationId).toBe('org_1');
    });

    it('rolls the token back if the context load fails', async () => {
      fetchMeContextMock.mockRejectedValueOnce(new Error('500'));

      await expect(establishSession(VALID_TOKEN)).rejects.toThrow('500');
      expect(getAccessToken()).toBeNull();
    });
  });
});
