import { API_ENDPOINTS, HTTP } from '@/core/config/constants.ts';
import { config } from '@/core/config/env.ts';
import { forceLogout, refreshAccessToken } from '@/shared/auth/service.ts';
import { getAccessToken } from '@/shared/auth/token.ts';
import { HttpError } from '@/shared/errors/HttpError.ts';

// ------------------------------------------------------------------
// Request ID
// ------------------------------------------------------------------
let requestCounter = 0;
function generateRequestId(): string {
  requestCounter = (requestCounter + 1) % Number.MAX_SAFE_INTEGER;
  return `${Date.now().toString(36)}-${requestCounter.toString(36)}`;
}

// ------------------------------------------------------------------
// Config and client type
// ------------------------------------------------------------------
export interface HttpClientConfig {
  baseURL: string;
  timeout: number;
  credentials: RequestCredentials;
}

const defaultConfig: HttpClientConfig = {
  baseURL: config.apiBaseUrl,
  timeout: HTTP.TIMEOUT,
  credentials: 'include',
};

// No X-Organization-ID header: the backend scopes organization context from
// the URL path (/api/v1/tenancy/organizations/:id/…), so a header would be
// redundant state to keep in sync.
function buildHeaders(idempotencyKey?: string, customHeaders?: HeadersInit): Headers {
  const headers = new Headers(customHeaders);
  headers.set('Content-Type', 'application/json');
  headers.set('X-Requested-With', 'XMLHttpRequest');
  headers.set('X-Request-ID', generateRequestId());
  if (idempotencyKey) {
    headers.set('Idempotency-Key', idempotencyKey);
  }

  const accessToken = getAccessToken();
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  return headers;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      credentials: defaultConfig.credentials,
    });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function parseErrorResponse(
  response: Response,
  url: string,
  method: string,
): Promise<HttpError> {
  let data: unknown;
  const ct = response.headers.get('Content-Type');
  try {
    const text = await response.text();
    if (ct?.includes('application/json') && text) {
      data = JSON.parse(text) as unknown;
    } else {
      data = text;
    }
  } catch {
    data = undefined;
  }
  const message =
    (data as { message?: string } | undefined)?.message ??
    (response.statusText || `HTTP ${response.status}`);
  return new HttpError(message, response.status, url, method, data);
}

/** Idempotent methods: safe to retry on network/5xx (no body or same body). */
const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE']);

function shouldRetry(
  method: string,
  status: number | null,
  isNetworkError: boolean,
): boolean {
  if (status === 429) return true;
  if (isNetworkError || (status !== null && status >= 500)) {
    return IDEMPOTENT_METHODS.has(method);
  }
  return false;
}

function exponentialDelay(attempt: number): number {
  return Math.min(1000 * 2 ** attempt, 30_000);
}

function buildRequestUrl(path: string): string {
  if (path.startsWith('http')) return path;
  const base = defaultConfig.baseURL.replace(/\/$/, '');
  const sep = path.startsWith('/') ? '' : '/';
  return `${base}${sep}${path}`;
}

/**
 * 401 handler: refresh once via the SHARED single-flight in shared/auth
 * (the only code path allowed to call /auth/refresh — see
 * `refreshAccessToken`'s remarks on rotation + reuse-detection), then replay
 * the original request. Concurrent 401s all await the same in-flight refresh.
 * A failed refresh means the session is gone: clear local auth and bail.
 */
async function doRefreshAndReplay<T>(
  replay: () => Promise<{ data: T }>,
): Promise<{ data: T }> {
  try {
    await refreshAccessToken();
  } catch (refreshError) {
    forceLogout();
    throw refreshError;
  }
  return replay();
}

/** Write methods carry an auto-generated Idempotency-Key (server de-dupes). */
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options?: { skip401?: boolean },
): Promise<{ data: T }> {
  const url = buildRequestUrl(path);
  const isRefreshUrl =
    path === API_ENDPOINTS.AUTH.REFRESH || url.endsWith(API_ENDPOINTS.AUTH.REFRESH);
  // Minted once per logical request: retries and the post-refresh replay all
  // send the SAME key, so the server can collapse duplicates.
  const idempotencyKey = WRITE_METHODS.has(method) ? crypto.randomUUID() : undefined;

  async function attemptFetch(retryCount: number): Promise<Response> {
    const headers = buildHeaders(idempotencyKey);
    const init: RequestInit = {
      method,
      headers,
      ...(body !== undefined && { body: JSON.stringify(body) }),
    };
    try {
      return await fetchWithTimeout(url, init, defaultConfig.timeout);
    } catch (err) {
      const isNetworkError =
        err instanceof TypeError || (err as Error)?.name === 'AbortError';
      if (shouldRetry(method, null, isNetworkError) && retryCount < HTTP.MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, exponentialDelay(retryCount)));
        if (import.meta.env.DEV) {
          console.warn(
            `[HTTP] Retry attempt ${retryCount + 1} for ${url}`,
            (err as Error)?.message,
          );
        }
        return attemptFetch(retryCount + 1);
      }
      throw new HttpError(
        (err as Error)?.message ?? 'Network error',
        0,
        url,
        method,
        undefined,
      );
    }
  }

  const doOne = async (retryCount = 0, hasRefreshed = false): Promise<{ data: T }> => {
    const response = await attemptFetch(retryCount);

    if (response.status === 401 && !options?.skip401 && !isRefreshUrl) {
      if (hasRefreshed) {
        // The replay carried a freshly-minted token and was still rejected:
        // the session is genuinely dead (revoked / logout-all / expiry).
        // Never refresh-loop — clear local auth and surface the error.
        forceLogout();
        throw await parseErrorResponse(response, url, method);
      }
      return doRefreshAndReplay(() => doOne(0, true));
    }

    if (!response.ok) {
      const status = response.status;
      if (shouldRetry(method, status, false) && retryCount < HTTP.MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, exponentialDelay(retryCount)));
        if (import.meta.env.DEV) {
          console.warn(`[HTTP] Retry attempt ${retryCount + 1} for ${url} (${status})`);
        }
        return doOne(retryCount + 1);
      }
      throw await parseErrorResponse(response, url, method);
    }

    const text = await response.text();
    if (!text) {
      return { data: undefined as T };
    }
    const contentType = response.headers.get('Content-Type') ?? '';
    if (!(contentType.includes('application/json') || contentType.includes('+json'))) {
      throw new HttpError(
        'Expected JSON response',
        response.status,
        url,
        method,
        text.slice(0, 200),
      );
    }
    let data: T;
    try {
      data = JSON.parse(text) as T;
    } catch {
      throw new HttpError(
        'Invalid JSON response',
        response.status,
        url,
        method,
        text.slice(0, 200),
      );
    }
    return { data };
  };

  return doOne();
}

// ------------------------------------------------------------------
// Public API (axios-like: .get().then(r => r.data))
// ------------------------------------------------------------------
export interface HttpClient {
  get: <T>(url: string, options?: { skip401?: boolean }) => Promise<{ data: T }>;
  post: <T>(
    url: string,
    body?: unknown,
    options?: { skip401?: boolean },
  ) => Promise<{ data: T }>;
  put: <T>(
    url: string,
    body?: unknown,
    options?: { skip401?: boolean },
  ) => Promise<{ data: T }>;
  patch: <T>(
    url: string,
    body?: unknown,
    options?: { skip401?: boolean },
  ) => Promise<{ data: T }>;
  delete: <T>(url: string, options?: { skip401?: boolean }) => Promise<{ data: T }>;
}

function createHttpClient(_overrides?: Partial<HttpClientConfig>): HttpClient {
  return {
    get: <T>(path: string, options?: { skip401?: boolean }) =>
      request<T>('GET', path, undefined, options),
    post: <T>(path: string, body?: unknown, options?: { skip401?: boolean }) =>
      request<T>('POST', path, body, options),
    put: <T>(path: string, body?: unknown, options?: { skip401?: boolean }) =>
      request<T>('PUT', path, body, options),
    patch: <T>(path: string, body?: unknown, options?: { skip401?: boolean }) =>
      request<T>('PATCH', path, body, options),
    delete: <T>(path: string, options?: { skip401?: boolean }) =>
      request<T>('DELETE', path, undefined, options),
  };
}

export const apiClient = createHttpClient();

export { isUnauthorized } from '@/shared/errors/HttpError.ts';
