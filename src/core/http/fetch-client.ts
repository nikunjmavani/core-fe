import {
  API_BASE_PATH,
  API_ENDPOINTS,
  HTTP,
  ORGANIZATION,
} from '@/core/config/constants.ts';
import { config } from '@/core/config/env.ts';
import { forceLogout } from '@/shared/auth/service.ts';
import { getAccessToken, setAccessToken } from '@/shared/auth/token.ts';
import { authTokenResponseSchema } from '@/shared/auth/types.ts';
import { HttpError } from '@/shared/errors/HttpError.ts';
import { useOrganizationStore } from '@/shared/store/useOrganizationStore/index.ts';

// ------------------------------------------------------------------
// Request ID
// ------------------------------------------------------------------
let requestCounter = 0;
function generateRequestId(): string {
  requestCounter = (requestCounter + 1) % Number.MAX_SAFE_INTEGER;
  return `${Date.now().toString(36)}-${requestCounter.toString(36)}`;
}

// ------------------------------------------------------------------
// 401 refresh queue
// ------------------------------------------------------------------
let isRefreshing = false;
const failedQueue: Array<{
  resolve: () => void;
  reject: (reason: unknown) => void;
}> = [];

function processQueue(error: unknown): void {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve();
  });
  failedQueue.length = 0;
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

function buildHeaders(_method: string, customHeaders?: HeadersInit): Headers {
  const headers = new Headers(customHeaders);
  headers.set('Content-Type', 'application/json');
  headers.set('X-Requested-With', 'XMLHttpRequest');
  headers.set('X-Request-ID', generateRequestId());

  const accessToken = getAccessToken();
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  const organizationId = useOrganizationStore.getState().organizationId;
  if (organizationId) {
    headers.set(ORGANIZATION.HEADER, organizationId);
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

async function doRefreshAndReplay<T>(
  url: string,
  replay: () => Promise<{ data: T }>,
): Promise<{ data: T }> {
  if (isRefreshing) {
    await new Promise<void>((resolve, reject) => {
      failedQueue.push({ resolve, reject });
    });
    return replay();
  }
  isRefreshing = true;
  try {
    const refreshController = new AbortController();
    const refreshTimeoutId = setTimeout(
      () => refreshController.abort(),
      HTTP.REFRESH_TIMEOUT,
    );
    const refreshRes = await fetch(
      `${config.apiBaseUrl}${API_BASE_PATH}${API_ENDPOINTS.AUTH.REFRESH}`,
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        signal: refreshController.signal,
      },
    ).finally(() => clearTimeout(refreshTimeoutId));
    if (!refreshRes.ok) {
      const errData = await refreshRes.json().catch(() => ({}));
      throw new HttpError(
        (errData as { message?: string })?.message ?? 'Refresh failed',
        refreshRes.status,
        url,
        'POST',
        errData,
      );
    }
    const refreshData = (await refreshRes.json()) as unknown;
    const { accessToken } = authTokenResponseSchema.parse(refreshData);
    setAccessToken(accessToken);
    processQueue(null);
    return replay();
  } catch (refreshError) {
    processQueue(refreshError);
    forceLogout();
    throw refreshError;
  } finally {
    isRefreshing = false;
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options?: { skip401?: boolean },
): Promise<{ data: T }> {
  const url = buildRequestUrl(path);
  const isRefreshUrl =
    path === API_ENDPOINTS.AUTH.REFRESH || url.endsWith(API_ENDPOINTS.AUTH.REFRESH);

  async function attemptFetch(retryCount: number): Promise<Response> {
    const headers = buildHeaders(method);
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

  const doOne = async (retryCount = 0): Promise<{ data: T }> => {
    const response = await attemptFetch(retryCount);

    if (response.status === 401 && !options?.skip401 && !isRefreshUrl) {
      return doRefreshAndReplay(url, () => doOne(0));
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
    if (!contentType.includes('application/json') && !contentType.includes('+json')) {
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

export function createHttpClient(_overrides?: Partial<HttpClientConfig>): HttpClient {
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
