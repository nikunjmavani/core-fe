import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearAccessToken, setAccessToken } from '@/shared/auth/token.ts';
import { HttpError, isUnauthorized } from '@/shared/errors/HttpError.ts';

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
