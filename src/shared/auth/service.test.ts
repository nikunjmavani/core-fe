import { type Mock, vi } from 'vitest';

import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';

import { clearAccessToken, getAccessToken, setAccessToken } from './token.ts';
import type { AuthUser } from './types.ts';

// Mock global fetch
let fetchMock: ReturnType<typeof vi.fn>;

vi.mock('@/core/http/queryClient.ts', () => ({
  queryClient: { clear: vi.fn() },
}));

vi.mock('@/shared/auth/refresh-timer.ts', () => ({
  scheduleTokenRefresh: vi.fn(),
  cancelTokenRefresh: vi.fn(),
}));

/** Helper to create a minimal JWT (base64url) */
function makeJwt(payload: Record<string, unknown>): string {
  const encode = (obj: Record<string, unknown>) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
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

function mockResponse(body: unknown, status = 200): Response {
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

  beforeAll(async () => {
    const mod = await import('./service.ts');
    silentRefresh = mod.silentRefresh;
    forceLogout = mod.forceLogout;
    logout = mod.logout;
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
  });

  describe('silentRefresh', () => {
    it('sets token and user on success', async () => {
      (fetchMock as Mock)
        .mockResolvedValueOnce(mockResponse({ accessToken: VALID_TOKEN }))
        .mockResolvedValueOnce(mockResponse(MOCK_USER));

      await silentRefresh();

      expect(getAccessToken()).toBe(VALID_TOKEN);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().user?.email).toBe('test@example.com');
    });

    it('rolls back token if user fetch fails', async () => {
      (fetchMock as Mock)
        .mockResolvedValueOnce(mockResponse({ accessToken: VALID_TOKEN }))
        .mockRejectedValueOnce(new Error('Network error'));

      await expect(silentRefresh()).rejects.toThrow('Network error');
      expect(getAccessToken()).toBeNull();
    });

    it('rejects if refresh endpoint fails', async () => {
      (fetchMock as Mock).mockRejectedValueOnce(new Error('401'));

      await expect(silentRefresh()).rejects.toThrow('401');
      expect(getAccessToken()).toBeNull();
    });

    it('deduplicates concurrent calls (mutex)', async () => {
      (fetchMock as Mock)
        .mockResolvedValueOnce(mockResponse({ accessToken: VALID_TOKEN }))
        .mockResolvedValueOnce(mockResponse(MOCK_USER));

      const [r1, r2] = await Promise.all([silentRefresh(), silentRefresh()]);

      expect(r1).toBeUndefined();
      expect(r2).toBeUndefined();
      // refresh + me (shared promise so only one doSilentRefresh run)
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('logout', () => {
    it('calls logout endpoint and then forceLogout', async () => {
      (fetchMock as Mock).mockResolvedValueOnce(mockResponse({}));
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
});
