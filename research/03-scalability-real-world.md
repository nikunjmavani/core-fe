# Core-FE Scalability & Real-World Working Issues Research Report

**Project**: core-fe — Enterprise Multi-Tenant Admin Dashboard  
**Version**: 1.0.0-alpha.0  
**Scope**: Performance, caching, concurrency, production behavior, edge cases, and scalability bottlenecks

---

## 1. Performance Architecture Overview

The application is built with performance as a first-class concern. Key patterns include lazy loading, code splitting, proactive token refresh, and requestIdleCallback-based observability initialization. However, several gaps exist between the ideal architecture and real-world scalability.

### 1.1 Bundle Size Budgets

| Budget                      | Limit       | Status  | File               |
| --------------------------- | ----------- | ------- | ------------------ |
| Initial JS (entry + vendor) | 260 KB gzip | Unknown | `.size-limit.json` |
| Initial CSS                 | 30 KB gzip  | Unknown | `.size-limit.json` |

**Note**: Actual bundle sizes are not available in the source code. The `pnpm size` script would need to be run to verify compliance.

### 1.2 Manual Chunk Strategy

The Vite configuration defines manual chunks to optimize loading:

```typescript
// vite.config.ts — manualChunks
if (id.includes('@sentry')) return 'sentry';
if (id.includes('posthog-js')) return 'posthog';
if (id.includes('recharts')) return 'charts';
if (id.includes('zod')) return 'zod';
if (id.includes('react-hook-form')) return 'rhf';
if (
  id.includes('react/') ||
  id.includes('react-dom/') ||
  id.includes('@tanstack/react-router')
)
  return 'vendor';
if (id.includes('@tanstack/react-query')) return 'query';
```

**Strength**: Splits heavy libraries into separate chunks. A user who never opens the Command Palette never loads `cmdk` (dynamically imported via `CommandPaletteLazy`).

**Issue**: No chunk for `radix-ui`. The entire Radix UI library (25+ components) is spread across the `vendor` and individual component chunks. This might create many small chunks.

**Issue**: No chunk for `lucide-react`. Icon libraries can be heavy if tree-shaking fails. With 100+ icons used, this could be significant.

---

## 2. Caching Strategy Analysis

### 2.1 HTTP Cache Headers (`public/_headers`)

```
/index.html
  Cache-Control: no-store, must-revalidate

/version.json
  Cache-Control: no-store, must-revalidate

/assets/*
  Cache-Control: public, max-age=31536000, immutable
```

**Analysis**:

- ✅ `index.html` and `version.json` are never cached — correct for SPAs that update frequently
- ✅ `assets/*` (hashed JS/CSS chunks) are cached for 1 year — correct for immutable content
- ⚠️ No `service-worker.js` cache policy — should be `no-cache` or short TTL to allow SW updates
- ⚠️ No `manifest.webmanifest` cache policy — should be short TTL

### 2.2 Service Worker Caching (`src/sw.ts`)

```typescript
// Precache all assets from the build manifest
precacheAndRoute(self.__WB_MANIFEST);

// Cache fonts with CacheFirst
registerRoute(
  /^https:\/\/.*\.(woff2|ttf|otf)$/,
  new CacheFirst({
    cacheName: 'fonts',
    plugins: [
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 }),
    ],
  }),
);

// Offline fallback for navigation requests
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches
          .match('/offline.html')
          .then((response) => response ?? new Response('Offline', { status: 503 })),
      ),
    );
  }
});
```

**Issues**:

1. **No `/offline.html` file**: The service worker references `/offline.html` but there is no such file in `public/`. The fallback will always return `new Response('Offline', { status: 503 })`.

2. **No image caching strategy**: Images are not cached. In an enterprise dashboard with user avatars, organization logos, and charts, this is a gap.

3. **No API response caching**: The service worker doesn't cache API responses. For a dashboard that might load the same data on re-navigation, this is a missed opportunity.

4. **Stale-while-revalidate for assets**: The `precacheAndRoute` uses Workbox's default strategy. For a long-lived app, consider `StaleWhileRevalidate` for the precache to ensure updates are picked up.

### 2.3 TanStack Query Caching

```typescript
// core/http/queryClient.ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: HTTP.STALE_TIME, // 5 minutes (300,000ms)
      retry: (failureCount, error) => {
        if (isUnauthorized(error)) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: { retry: false },
  },
});
```

**Analysis**:

- ✅ `staleTime: 5 minutes` — reduces unnecessary refetches
- ✅ `refetchOnWindowFocus: false` — avoids jarring UI updates
- ✅ `retry: 2` for non-401 errors — good resilience
- ⚠️ **No cacheTime / gcTime specified** — default is 5 minutes. For large data sets, this might be too short.
- ⚠️ **No per-query optimization** — all queries use the same staleTime. Dashboard metrics might want longer; real-time data might want shorter.

### 2.4 Organization List Caching Gap

```typescript
// shared/tenancy/organization-membership.ts
export async function findMembership(
  organizationId: string,
): Promise<Organization | null> {
  const organizations = await listMyOrganizations(); // ❌ No cache
  return organizations.find((o) => o.id === organizationId) ?? null;
}
```

**Problem**: `listMyOrganizations()` is called on EVERY organization route navigation. This means:

- User visits `/organization/org_acme/dashboard` → `listMyOrganizations()` fetches
- User navigates to `/organization/org_acme/members` → `listMyOrganizations()` fetches AGAIN
- User switches to `/organization/org_globex/dashboard` → `listMyOrganizations()` fetches AGAIN

**Impact**: O(n) network requests per route change, where n = number of org routes visited. For a user with 10+ organizations, this is significant overhead.

**Fix**: Cache `listMyOrganizations()` in TanStack Query with a 5-minute staleTime:

```typescript
// In my-organizations.ts or a new hook:
export function useMyOrganizations() {
  return useQuery({
    queryKey: ['organizations', 'list'],
    queryFn: listMyOrganizations,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

Then update `findMembership` to use the cached data or accept a pre-fetched list.

---

## 3. Concurrency & Race Conditions

### 3.1 Token Refresh Race Condition (Mitigated)

**Design**: `refreshAccessToken()` uses `navigator.locks` for cross-tab serialization and a module-level promise for intra-tab serialization.

```typescript
// shared/auth/service.ts
let tokenRefreshPromise: Promise<void> | null = null;

export async function refreshAccessToken(): Promise<void> {
  if (tokenRefreshPromise) return tokenRefreshPromise;
  tokenRefreshPromise = runExclusiveRefresh().finally(() => {
    tokenRefreshPromise = null;
  });
  return tokenRefreshPromise;
}

async function runExclusiveRefresh(): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return navigator.locks.request('core-auth:refresh', () => doTokenRefresh());
  }
  return doTokenRefresh();
}
```

**Analysis**: ✅ This is a best-practice implementation. The `navigator.locks` API ensures that even if 5 tabs refresh simultaneously, only one network request is made. The backend's refresh token rotation is protected from reuse-detection.

**Fallback**: If `navigator.locks` is not available (older browsers, some embedded WebViews), the module-level promise still prevents intra-tab races. However, cross-tab races are possible in this fallback scenario.

**Risk**: Very low. `navigator.locks` is supported in all modern browsers (Chrome 69+, Firefox 78+, Safari 15.4+). The only unsupported environments are very old browsers and some in-app WebViews.

### 3.2 Permission Loading Race Condition

```typescript
// shared/tenancy/organization-membership.ts
let permissionsLoadedFor: string | null = null;

export async function ensurePermissionsFor(organizationId: string): Promise<void> {
  const store = useOrganizationStore.getState();
  if (permissionsLoadedFor === organizationId && store.permissions.length > 0) return;
  store.setPermissions(await getMyPermissions());
  permissionsLoadedFor = organizationId;
}
```

**Problem**: This is a module-level mutable variable. In a race condition:

1. User navigates to `/organization/org_acme/members` → `ensurePermissionsFor('org_acme')` starts
2. User quickly switches to `/organization/org_globex/dashboard` → `ensurePermissionsFor('org_globex')` starts
3. Both fetch `getMyPermissions()` concurrently (one for each org)
4. The second one to finish overwrites `permissionsLoadedFor` and the store

**Impact**: The user might briefly see org_acme's permissions while viewing org_globex, or vice versa. This could allow/disallow actions incorrectly.

**Fix**: Use a per-organization cache or TanStack Query:

```typescript
// Option A: Store-level cache
export async function ensurePermissionsFor(organizationId: string): Promise<void> {
  const store = useOrganizationStore.getState();
  if (store.permissionsMap[organizationId]?.length > 0) return;
  const permissions = await getMyPermissions();
  store.setPermissionsMap(organizationId, permissions);
}

// Option B: TanStack Query
export function usePermissions(organizationId: string) {
  return useQuery({
    queryKey: ['permissions', organizationId],
    queryFn: () => getMyPermissions(),
    staleTime: 5 * 60 * 1000,
  });
}
```

### 3.3 Mock Store Mutation Race

```typescript
// shared/api/organization-api.ts
export function createOrganization(
  input: CreateOrganizationInput,
): Promise<Organization> {
  const payload = createOrganizationSchema.parse(input);
  // ...
  if (config.useMockApi) {
    const org: Organization = { id: `org_${Date.now()}`, name: payload.name, slug };
    MY_ORGANIZATIONS_FIXTURE.push(org); // ❌ Mutates shared fixture
    return mockResponse(org);
  }
  // ...
}
```

**Problem**: `MY_ORGANIZATIONS_FIXTURE` is a module-level array. Every `createOrganization` call mutates it. In a concurrent scenario (e.g., multiple tabs or rapid calls), this could cause inconsistent state.

**Impact**: Low — this is mock code only. But it demonstrates a pattern that could be copied to real API code.

**Fix**: Not needed for mock code, but ensure real API endpoints don't have this pattern.

---

## 4. Network & Request Patterns

### 4.1 HTTP Retry Logic

```typescript
// core/http/fetch-client.ts
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
```

**Analysis**:

- ✅ 429 (Too Many Requests) is retried — good for rate limit recovery
- ✅ 5xx errors are retried for idempotent methods (GET, HEAD, PUT, DELETE)
- ✅ Non-idempotent methods (POST, PATCH) are NOT retried on 5xx — prevents duplicate creation
- ✅ Exponential backoff capped at 30 seconds — prevents runaway retries
- ⚠️ **No circuit breaker** — if the API is down, every request will retry 3 times, causing 3x the load
- ⚠️ **No jitter** — exponential backoff without jitter can cause thundering herd

**Fix**: Add jitter to the delay:

```typescript
function exponentialDelay(attempt: number): number {
  const base = Math.min(1000 * 2 ** attempt, 30_000);
  return base + Math.random() * 1000; // Add up to 1s jitter
}
```

### 4.2 Request ID Generation

```typescript
// core/http/fetch-client.ts
let requestCounter = 0;
function generateRequestId(): string {
  requestCounter = (requestCounter + 1) % Number.MAX_SAFE_INTEGER;
  return `${Date.now().toString(36)}-${requestCounter.toString(36)}`;
}
```

**Issue**: `requestCounter` is a global mutable variable. In a long-lived tab with many requests, it could theoretically overflow. `Number.MAX_SAFE_INTEGER` is 9,007,199,254,740,991, so practically this won't happen. However, the modulo operation is unnecessary and the counter resets on page reload, which is fine for correlation IDs.

**Issue**: No `crypto.randomUUID()` is used for the request ID. The current format is deterministic and could be guessed. For security-sensitive correlation, a UUID would be better.

### 4.3 Idempotency Key for Write Methods

```typescript
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const idempotencyKey = WRITE_METHODS.has(method) ? crypto.randomUUID() : undefined;
```

**Analysis**: ✅ Excellent. Every write request carries a unique `Idempotency-Key` header. The server can deduplicate requests. The key is the same for retries and the post-refresh replay, ensuring that a retried request is collapsed by the server.

### 4.4 Request Timeout

```typescript
const defaultConfig: HttpClientConfig = {
  baseURL: config.apiBaseUrl,
  timeout: HTTP.TIMEOUT, // 30,000ms
  credentials: 'include',
};
```

**Issue**: 30 seconds is long for a user-facing API. In practice, users will abandon a page that takes 30 seconds to load. Consider:

- 10 seconds for GET requests (list data)
- 30 seconds for POST/PUT/PATCH (write operations that might be complex)
- 5 seconds for auth operations (login, refresh)

**Note**: The refresh timeout is already 5 seconds (`HTTP.REFRESH_TIMEOUT`), which is good.

---

## 5. Token & Session Management

### 5.1 Proactive Token Refresh

```typescript
// shared/auth/refresh-timer.ts
const BUFFER_MS = 60_000; // Refresh 60 seconds before expiry
const MIN_DELAY_MS = 5_000; // Minimum delay to prevent runaway loops

export function scheduleTokenRefresh(): void {
  cancelTokenRefresh();
  const exp = getTokenExpiry();
  if (exp === null) return;
  const expiresAt = exp * 1000;
  const delay = Math.max(expiresAt - Date.now() - BUFFER_MS, MIN_DELAY_MS);
  // ... setTimeout
}
```

**Analysis**: ✅ Good. The token is refreshed proactively before expiry, avoiding the 401 → refresh → retry cycle.

**Issue**: If the user's system clock is wrong (e.g., set 5 minutes behind), the token might appear to not need refresh when it actually does. The `getTokenExpiry()` reads the `exp` claim from the JWT, which is server time. The comparison uses `Date.now()`, which is client time. Clock skew could cause:

- Token not refreshed before expiry (client clock is behind)
- Token refreshed too early (client clock is ahead)

**Impact**: Low. The 60-second buffer is generous. Even with 5 minutes of clock skew, the token is still valid for 55 seconds after the scheduled refresh.

**Fix**: Not critical. If clock skew becomes an issue, add a server-time endpoint or use NTP.

### 5.2 Session Lifetime Cap

```typescript
// core/config/constants.ts
export const SESSION = {
  MAX_AGE_MS: 12 * 60 * 60 * 1000, // 12 hours
  LIFETIME_CHECK_INTERVAL_MS: 60_000, // Check every minute
} as const;
```

**Analysis**: ✅ Good defense-in-depth. Even if the token keeps refreshing, the session is forcefully logged out after 12 hours.

**Issue**: The session start time is stored in `localStorage`:

```typescript
const SESSION_STARTED_AT_KEY = 'core:session-started-at';
localStorage.setItem(SESSION_STARTED_AT_KEY, String(Date.now()));
```

An attacker with XSS could read this value, but it contains no sensitive information (just a timestamp). An attacker could also delete it, which would reset the session timer (allowing an indefinite session). However, the backend's refresh session age is the real source of truth.

### 5.3 Idle Timeout

```typescript
// shared/auth/idle-timeout.ts
const ACTIVITY_EVENTS: Array<keyof DocumentEventMap> = [
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
  'mousemove',
];
const THROTTLE_MS = 10_000;
```

**Analysis**: ✅ Good. Monitors user activity and warns/logs out after inactivity.

**Issue**: `mousemove` is included. In a dashboard with data visualization, users might move the mouse continuously without interacting. This could keep the session alive indefinitely.

**Issue**: `scroll` is included. A page with auto-scrolling content (e.g., a live feed) would keep the session alive even if the user is not actively using the app.

**Recommendation**: Remove `mousemove` and `scroll` from activity events, or make them opt-in. Use only explicit interaction events: `mousedown`, `keydown`, `touchstart`, `click`.

### 5.4 Cross-Tab Logout

```typescript
// shared/auth/auth-channel.ts
const CHANNEL_NAME = 'core-auth';

export function broadcastLogout(): void {
  getChannel()?.postMessage({ type: 'logout' } satisfies AuthBroadcast);
}
```

**Analysis**: ✅ Good. Logout is propagated to all tabs.

**Issue**: The message is not signed or authenticated. A malicious script in another tab could broadcast a fake logout. However, this requires the attacker to already have script execution in the same origin, which is an XSS scenario. In that case, the attacker can do much worse than logging out the user.

**Issue**: No origin check on the message. If the BroadcastChannel is shared across subdomains (it's not — it's origin-scoped), this could be an issue. But `BroadcastChannel` is origin-scoped by design, so this is not a concern.

---

## 6. Offline & Resilience

### 6.1 Offline Indicator

The `OfflineIndicator` component (`shared/components/OfflineIndicator/`) uses `navigator.onLine` to detect network status. This is a standard browser API.

**Issue**: `navigator.onLine` is unreliable. It only indicates whether the browser has a network interface, not whether the internet is reachable. A user on a Wi-Fi network with no internet access would show `navigator.onLine = true`.

**Fix**: Add a periodic ping to the API (or a lightweight health endpoint) to verify connectivity. The `OfflineIndicator` could show a "connection unstable" state if the ping fails but `navigator.onLine` is true.

### 6.2 Service Worker Offline Fallback

```typescript
// src/sw.ts
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches
          .match('/offline.html')
          .then((response) => response ?? new Response('Offline', { status: 503 })),
      ),
    );
  }
});
```

**Issue**: No `/offline.html` file exists. The fallback returns a plain text "Offline" response with a 503 status. This is a poor user experience.

**Fix**: Create a styled `public/offline.html` that matches the app's design and offers a "Retry" button.

### 6.3 API Unavailable Behavior

If the API is completely unavailable (e.g., server maintenance), the app will:

1. Show spinners / loading states indefinitely
2. Retry requests 3 times with exponential backoff
3. Eventually show error messages (from `HttpError` or `QueryBoundary`)

**Issue**: No global "API unavailable" state. The user might see multiple error toasts or broken UI elements.

**Fix**: Add a global API health check that, if failed, shows a maintenance banner or disables interactive elements.

---

## 7. Production Deployment Concerns

### 7.1 Version Detection & Auto-Reload

```typescript
// core/version/check.ts
export function startVersionCheck(): void {
  // Fetches /version.json periodically and compares buildId
  // If different, reloads the page
}
```

**Analysis**: ✅ Good. When a new deployment is pushed, active users are prompted to reload.

**Issue**: The version check might fire during a form submission or critical operation. The reload should be deferred until a safe moment (e.g., navigation, or after a user confirmation).

**Issue**: No graceful handling if the user has unsaved data. A `beforeunload` prompt or a "Save before reload" mechanism would be better.

### 7.2 Environment Configuration

```typescript
// core/config/env.ts
export const config = {
  apiBaseUrl: env.MODE === 'development' ? '' : (get('API_BASE_URL') ?? ''),
  sentryDsn: get('SENTRY_DSN'),
  posthogKey: get('POSTHOG_KEY'),
  posthogHost: get('POSTHOG_HOST'),
  useMockApi: resolveUseMockApi({ ... }),
};
```

**Issue**: `config.apiBaseUrl` defaults to `''` (empty string) in production if `VITE_API_BASE_URL` is not set. This means API calls will be relative to the origin. If the frontend and backend are on different origins, this will fail silently.

**Issue**: `get('API_BASE_URL')` reads `VITE_API_BASE_URL`. If the deployment uses Docker or runtime config injection, the build-time env might not be available. The `window.__CONFIG__` mechanism is provided but not well-documented.

**Fix**: Add a startup check that fails loudly if `apiBaseUrl` is empty in production:

```typescript
if (config.isProduction && !config.apiBaseUrl) {
  throw new Error('[Config] VITE_API_BASE_URL is required in production');
}
```

### 7.3 Mock Mode Rejection

```typescript
// core/config/env.ts
export function resolveUseMockApi(options: {
  mode: AppMode;
  isProd: boolean;
  useMockApiFlag: string | undefined;
}): boolean {
  if (options.mode === 'test') return false;
  const isDeployed =
    options.isProd || options.mode === 'production' || options.mode === 'staging';
  if (isDeployed) {
    if (options.useMockApiFlag === 'true') {
      throw new Error('[Config] VITE_USE_MOCK_API=true is not allowed in production...');
    }
    return false;
  }
  return options.useMockApiFlag !== 'false';
}
```

**Analysis**: ✅ Excellent. Mock mode is forcibly disabled in production and staging. If accidentally enabled, the app throws an error at startup rather than silently serving fake data.

---

## 8. Bundle & Asset Concerns

### 8.1 React Compiler

```typescript
// vite.config.ts
react({ babel: { plugins: [['babel-plugin-react-compiler', {}]] } }),
```

**Analysis**: React 19's automatic memoization via the compiler. This eliminates manual `useMemo` / `useCallback` in most cases.

**Issue**: The compiler is new (React 19 feature). If it has bugs, the app might have subtle performance issues. The ESLint plugin `eslint-plugin-react-compiler` is configured, which is good.

**Issue**: The compiler only works with React 19. If the project ever needs to downgrade to React 18, all manually removed memoizations would need to be restored.

### 8.2 Source Maps in Production

```typescript
// vite.config.ts
sourcemap: mode === 'development' ? true : 'hidden',
```

**Analysis**: ✅ Correct. `hidden` source maps are generated for Sentry error reporting but not referenced in the bundle. The Sentry plugin uploads them and deletes them from `dist/`.

**Issue**: If Sentry upload fails, the source maps are still in `dist/` (because the deletion happens in the plugin). The plugin has `filesToDeleteAfterUpload: ['./dist/assets/*.map']`, but this only runs if the Sentry plugin is active (i.e., `SENTRY_AUTH_TOKEN` is set).

**Fix**: Add a CI step that fails the build if source maps are present in the final artifact.

### 8.3 esbuild Console Stripping

```typescript
// vite.config.ts
esbuild: {
  drop: mode === 'production' ? ['console', 'debugger'] : [],
},
```

**Analysis**: ✅ Good. All `console.log` and `debugger` statements are stripped in production.

**Issue**: `console.warn` and `console.error` are NOT stripped. The app has many `console.warn` calls in error paths (e.g., HTTP retries). These will still appear in production browser consoles.

**Issue**: The `console.info` calls (e.g., `[RefreshTimer] Scheduled refresh...`) are also stripped. This is correct — they are dev-only diagnostics.

---

## 9. Browser & Device Compatibility

### 9.1 BroadcastChannel Fallback

```typescript
// shared/auth/auth-channel.ts
function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  channel ??= new BroadcastChannel(CHANNEL_NAME);
  return channel;
}
```

**Fallback**: If `BroadcastChannel` is not available, cross-tab logout is disabled. Each tab will only learn about logout when it makes its next API request and gets a 401.

**Impact**: Low. Safari < 15.4, some in-app WebViews, and very old browsers lack `BroadcastChannel`. The app still functions correctly; it's just a UX degradation.

### 9.2 navigator.locks Fallback

```typescript
// shared/auth/service.ts
async function runExclusiveRefresh(): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return navigator.locks.request('core-auth:refresh', () => doTokenRefresh());
  }
  return doTokenRefresh();
}
```

**Fallback**: If `navigator.locks` is not available, the module-level promise (`tokenRefreshPromise`) still prevents intra-tab races. Cross-tab races are possible.

**Impact**: Low. Same as BroadcastChannel.

### 9.3 requestIdleCallback Fallback

```typescript
// main.tsx
if ('requestIdleCallback' in window) {
  window.requestIdleCallback(run, { timeout: 3000 });
} else {
  setTimeout(run, 1);
}
```

**Fallback**: `setTimeout(run, 1)` is used instead. This is fine — it just means observability initializes slightly sooner, potentially competing with the initial render.

**Impact**: Very low. The run function is a dynamic import (`import('@sentry/react')`), which is already non-blocking.

### 9.4 matchMedia Polyfill (Tests Only)

```typescript
// tests/utils/setup.ts
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({ ... }),
});
```

**Issue**: This is a test-only polyfill. In production, `matchMedia` is available in all modern browsers. However, the `useThemeStore` uses `matchMedia` for system theme detection. If `matchMedia` is not available, the theme might default incorrectly.

**Impact**: Very low. `matchMedia` is supported in all browsers since ~2012.

---

## 10. Data Table Scalability

### 10.1 URL State Sync

```typescript
// shared/hooks/useDataTableUrlState/useDataTableUrlState.ts
export function useDataTableUrlState(enabled: boolean) {
  // Syncs pagination, sorting, and filters to URL search params
}
```

**Analysis**: ✅ Good for shareability. Users can copy/paste a URL with filters.

**Issue**: For large datasets with many filter combinations, the URL could become very long. If the URL exceeds ~2000 characters, some browsers or servers might truncate it.

**Issue**: No debounce on filter changes. Every keystroke in a search field updates the URL immediately, potentially causing excessive history entries.

**Fix**: Add a debounce (e.g., 300ms) before updating the URL for filter changes.

### 10.2 Pagination

The `DataTablePagination` component uses standard TanStack Table pagination. No virtual scrolling is implemented.

**Issue**: For datasets with 1000+ rows, the DOM will have 1000+ rendered rows. This will cause performance issues.

**Fix**: Implement virtual scrolling (e.g., `@tanstack/react-virtual`) or server-side pagination with a fixed page size.

---

## 11. Summary of Scalability Issues

| ID   | Issue                                     | Severity  | Impact                        | Fix Priority      |
| ---- | ----------------------------------------- | --------- | ----------------------------- | ----------------- |
| SC1  | No `/offline.html`                        | 🟡 Medium | Poor offline UX               | Before beta       |
| SC2  | `listMyOrganizations()` no caching        | 🔴 High   | O(n) requests per route       | Before production |
| SC3  | `ensurePermissionsFor` race condition     | 🔴 High   | Wrong permissions shown       | Before production |
| SC4  | No circuit breaker / jitter               | 🟡 Medium | Thundering herd on API outage | Before beta       |
| SC5  | `mousemove` / `scroll` in idle timeout    | 🟡 Medium | Session never expires         | Before beta       |
| SC6  | No API health check                       | 🟡 Medium | Broken UX during outage       | Before beta       |
| SC7  | No image caching in SW                    | 🟢 Low    | Slower image loading          | Nice to have      |
| SC8  | `navigator.onLine` unreliable             | 🟡 Medium | Wrong offline state           | Before beta       |
| SC9  | URL filter changes not debounced          | 🟢 Low    | Excessive history entries     | Nice to have      |
| SC10 | No virtual scrolling in data table        | 🟡 Medium | DOM bloat on large data       | Before beta       |
| SC11 | Source maps not deleted on Sentry failure | 🟡 Medium | Security exposure             | Before production |
| SC12 | `apiBaseUrl` empty in production          | 🔴 High   | API calls fail silently       | Before production |
| SC13 | Mock store mutations                      | 🟢 Low    | Test flakiness                | Before beta       |
| SC14 | Clock skew in token refresh               | 🟢 Low    | Minor timing issues           | Nice to have      |
| SC15 | No per-query staleTime                    | 🟡 Medium | Suboptimal caching            | Before beta       |

---

## 12. Conclusion

The application has a **strong performance foundation** with code splitting, lazy loading, and aggressive caching. However, several real-world scalability issues need attention before production:

1. **Critical**: Cache `listMyOrganizations()` and fix the permission race condition
2. **Critical**: Ensure `apiBaseUrl` is set in production or fail loudly
3. **High**: Add an offline page, improve idle timeout accuracy, and add API health checks
4. **Medium**: Add retry jitter, circuit breaker patterns, and data table virtualization

These are all **incremental improvements** that don't require architectural changes. The current architecture is well-suited for scaling to a large user base once these issues are addressed.
