import { API_ENDPOINTS } from '@/core/config/constants.ts';
import type { AuthTokenResponse, AuthUser } from '@/shared/auth/types.ts';

/** Base64 to base64url (replace +/ and strip trailing =) without backtracking regex. */
function toBase64UrlNoPadding(base64: string): string {
  const noSlash = base64.replace(/\+/g, '-').replace(/\//g, '_');
  let end = noSlash.length;
  while (end > 0 && noSlash[end - 1] === '=') end--;
  return noSlash.slice(0, end);
}

/**
 * Helper to create a base64url-encoded JWT for testing
 */
function makeJwt(payload: Record<string, unknown>): string {
  const encode = (obj: Record<string, unknown>) =>
    toBase64UrlNoPadding(btoa(JSON.stringify(obj)));
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.dGVzdHNpZw`;
}

/**
 * Default dummy responses for API endpoints
 */
export const mockApiResponses = {
  auth: {
    login: (): AuthTokenResponse => ({
      accessToken: makeJwt({ sub: 'test-user', exp: 9999999999 }),
    }),
    refresh: (): AuthTokenResponse => ({
      accessToken: makeJwt({ sub: 'test-user', exp: 9999999999 }),
    }),
    me: (): AuthUser => ({
      id: 'test-user-id',
      email: 'test@example.com',
      role: 'admin',
      organizationId: 'test-tenant',
      name: 'Test User',
    }),
    logout: (): Record<string, never> => ({}),
  },
  // Dashboard mocks removed with the module — it is a placeholder until the
  // module is rebuilt after auth (REPLACE_WITH_MODULE).
};

/**
 * Get mock response for a given URL
 * Used by test utilities to provide dummy API responses
 */
export function getMockResponse(
  url: string,
  method: 'get' | 'post' | 'put' | 'patch' | 'delete' = 'get',
) {
  // Auth endpoints
  if (url.includes(API_ENDPOINTS.AUTH.ME)) {
    return Promise.resolve({ data: mockApiResponses.auth.me() });
  }
  if (method === 'post' && url.includes(API_ENDPOINTS.AUTH.LOGIN)) {
    return Promise.resolve({ data: mockApiResponses.auth.login() });
  }
  if (method === 'post' && url.includes(API_ENDPOINTS.AUTH.REFRESH)) {
    return Promise.resolve({ data: mockApiResponses.auth.refresh() });
  }
  if (method === 'post' && url.includes(API_ENDPOINTS.AUTH.LOGOUT)) {
    return Promise.resolve({ data: mockApiResponses.auth.logout() });
  }

  // Default fallback
  return Promise.resolve({ data: {} });
}
