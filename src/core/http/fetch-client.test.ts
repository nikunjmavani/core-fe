import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearAccessToken, setAccessToken } from '@/shared/auth/token.ts';
import { HttpError, isUnauthorized } from '@/shared/errors/HttpError.ts';

vi.mock('@/shared/auth/service.ts', () => ({ forceLogout: vi.fn() }));
import { forceLogout } from '@/shared/auth/service.ts';

import { apiClient } from './fetch-client.ts';

/** Helper to create a base64url-encoded JWT */
function makeJwt(payload: Record<string, unknown>): string {
  const encode = (obj: Record<string, unknown>) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.dGVzdHNpZw`;
}

const VALID_TOKEN = makeJwt({ sub: 'user1', exp: 9999999999 });

describe('fetch-client', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    clearAccessToken();
  });

  describe('apiClient.get', () => {
    it('returns parsed JSON data on 200', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ foo: 'bar' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const { data } = await apiClient.get<{ foo: string }>('/test');
      expect(data).toEqual({ foo: 'bar' });
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({
          method: 'GET',
          credentials: 'include',
        }),
      );
    });

    it('throws HttpError on non-2xx', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Not found' }), {
          status: 404,
          statusText: 'Not Found',
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      let err: unknown;
      try {
        await apiClient.get('/test');
      } catch (e) {
        err = e;
      }
      expect(err).toBeInstanceOf(HttpError);
      expect((err as HttpError).status).toBe(404);
      expect((err as HttpError).data).toEqual({ message: 'Not found' });
    });
  });

  describe('request headers', () => {
    it('adds Authorization when token is set', async () => {
      setAccessToken(VALID_TOKEN);
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      await apiClient.get('/test');

      const call = fetchMock.mock.calls[0];
      const init = call[1] as RequestInit;
      const headers = init.headers as Headers;
      expect(headers.get('Authorization')).toBe(`Bearer ${VALID_TOKEN}`);
    });

    it('adds X-Request-ID', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      await apiClient.get('/test');

      const call = fetchMock.mock.calls[0];
      const init = call[1] as RequestInit;
      const headers = init.headers as Headers;
      expect(headers.get('X-Request-ID')).toBeDefined();
      expect(typeof headers.get('X-Request-ID')).toBe('string');
    });

    it('adds Content-Type and X-Requested-With', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      await apiClient.get('/test');

      const call = fetchMock.mock.calls[0];
      const init = call[1] as RequestInit;
      const headers = init.headers as Headers;
      expect(headers.get('Content-Type')).toBe('application/json');
      expect(headers.get('X-Requested-With')).toBe('XMLHttpRequest');
    });
  });

  describe('reactive auth layer', () => {
    const ok = () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    const unauthorized = () =>
      new Response(JSON.stringify({ message: 'expired' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    const refreshed = () =>
      new Response(JSON.stringify({ accessToken: VALID_TOKEN }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    it('401 → ONE refresh → replay succeeds with the fresh token', async () => {
      fetchMock
        .mockResolvedValueOnce(unauthorized()) // original request
        .mockResolvedValueOnce(refreshed()) // refresh call
        .mockResolvedValueOnce(ok()); // replay

      const { data } = await apiClient.get<{ ok: boolean }>('/protected');
      expect(data).toEqual({ ok: true });
      const urls = fetchMock.mock.calls.map((c) => String(c[0]));
      expect(urls.filter((u) => u.includes('/auth/refresh'))).toHaveLength(1);
      expect(forceLogout).not.toHaveBeenCalled();
    });

    it('replay that 401s AGAIN means a dead session: forceLogout, no refresh loop', async () => {
      fetchMock
        .mockResolvedValueOnce(unauthorized()) // original request
        .mockResolvedValueOnce(refreshed()) // refresh call (succeeds)
        .mockResolvedValueOnce(unauthorized()); // replay STILL 401

      await expect(apiClient.get('/protected')).rejects.toBeInstanceOf(HttpError);
      const refreshCalls = fetchMock.mock.calls
        .map((c) => String(c[0]))
        .filter((u) => u.includes('/auth/refresh'));
      expect(refreshCalls).toHaveLength(1); // never refreshes twice for one request
      expect(forceLogout).toHaveBeenCalledTimes(1);
    });

    it('refresh failure clears the session via forceLogout', async () => {
      fetchMock
        .mockResolvedValueOnce(unauthorized()) // original request
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ message: 'session revoked' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }),
        ); // refresh itself rejected

      await expect(apiClient.get('/protected')).rejects.toBeInstanceOf(HttpError);
      expect(forceLogout).toHaveBeenCalledTimes(1);
    });
  });

  describe('Idempotency-Key', () => {
    const ok = () =>
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    it('writes carry an auto-generated key; reads do not', async () => {
      // Fresh Response per call — a Response body can only be consumed once.
      fetchMock.mockImplementation(() => Promise.resolve(ok()));

      await apiClient.post('/things', { a: 1 });
      await apiClient.get('/things');

      const postHeaders = (fetchMock.mock.calls[0][1] as RequestInit).headers as Headers;
      const getHeaders = (fetchMock.mock.calls[1][1] as RequestInit).headers as Headers;
      expect(postHeaders.get('Idempotency-Key')).toMatch(/[0-9a-f-]{36}/);
      expect(getHeaders.get('Idempotency-Key')).toBeNull();
    });

    it('the SAME key survives the 401 refresh replay (server can de-dupe)', async () => {
      fetchMock
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ message: 'expired' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ accessToken: VALID_TOKEN }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        )
        .mockResolvedValueOnce(ok());

      await apiClient.post('/things', { a: 1 });

      const writeCalls = fetchMock.mock.calls.filter(
        (c) => !String(c[0]).includes('/auth/refresh'),
      );
      const first = (writeCalls[0][1] as RequestInit).headers as Headers;
      const replay = (writeCalls[1][1] as RequestInit).headers as Headers;
      expect(first.get('Idempotency-Key')).toBe(replay.get('Idempotency-Key'));
      expect(first.get('Idempotency-Key')).toMatch(/[0-9a-f-]{36}/);
    });
  });

  describe('organization scoping', () => {
    it('never sends an X-Organization-ID header (org context lives in the URL path)', async () => {
      const { useOrganizationStore } =
        await import('@/shared/store/useOrganizationStore/index.ts');
      useOrganizationStore.getState().setOrganization('org_test1', 'test');
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      await apiClient.get('/api/v1/tenancy/organizations/org_test1');

      const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Headers;
      expect(headers.get('X-Organization-ID')).toBeNull();
      useOrganizationStore.getState().clearOrganization();
    });
  });

  describe('isUnauthorized', () => {
    it('returns true for HttpError with status 401', () => {
      const error = new HttpError('Unauthorized', 401, '/test', 'GET');
      expect(isUnauthorized(error)).toBe(true);
    });

    it('returns false for HttpError with status 403', () => {
      const error = new HttpError('Forbidden', 403, '/test', 'GET');
      expect(isUnauthorized(error)).toBe(false);
    });

    it('returns false for non-HttpError', () => {
      expect(isUnauthorized(new Error('random'))).toBe(false);
      expect(isUnauthorized('string')).toBe(false);
      expect(isUnauthorized(null)).toBe(false);
    });
  });
});
