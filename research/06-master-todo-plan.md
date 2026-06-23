# Core-FE Master Action Plan — Consolidated TODOs & Sprint Roadmap

**Project**: core-fe — Enterprise Multi-Tenant Admin Dashboard  
**Version**: 1.0.0-alpha.0  
**Date**: Generated from comprehensive codebase audit  
**Total Items**: 27 action items across 5 priority tiers

---

## Priority Legend

| Badge                | Tier                                         | SLA       | Owner Profile           |
| -------------------- | -------------------------------------------- | --------- | ----------------------- |
| 🔴 **P0 — Blocker**  | Must complete before ANY production traffic  | 1–2 weeks | Backend + Frontend pair |
| 🟠 **P1 — Critical** | Must complete before beta / internal rollout | 2–3 weeks | Frontend lead           |
| 🟡 **P2 — High**     | Must complete before GA / public launch      | 3–4 weeks | Mid-level engineer      |
| 🟢 **P3 — Medium**   | Polish & reliability — before marketing push | 4–6 weeks | Any team member         |
| ⚪ **P4 — Low**      | Nice-to-have, tech debt paydown              | Ongoing   | Community / new hire    |

---

## 🔴 P0 — Production Blockers (Complete First)

These 5 items block ANY production deployment. Do not deploy without all of these resolved.

---

### P0-1: Wire All Backend API Endpoints (The Big One)

**Context**  
The entire data layer is mocked. Every organization-scoped API call returns static fixtures via `mockResponse()`. The backend (`core-be`) must be fully wired before the frontend can enforce real security, permissions, or data consistency.

**Files to Change**

- `src/shared/api/organization-api.ts` (20 functions)
- `src/shared/tenancy/my-organizations.ts` (2 functions)
- `src/shared/tenancy/organization-membership.ts` (1 function)
- `src/shared/auth/service.ts` (refresh + logout real paths already exist, but verify)

**What to Do**

1. For each `// REPLACE_WITH_API` comment:
   - Replace `mockResponse(...)` with `apiClient.get/post/patch/delete(...)`
   - Add Zod schema validation for the response (`organizationSchema.parse(res.data)`)
   - Add error handling for backend-specific error codes
2. Delete `src/shared/api/organization-mock-store.ts` (entire file)
3. Delete `src/shared/api/organization-fixtures.ts` (entire file)
4. Update `knip.jsonc` to remove `src/shared/api/organization-contracts.ts` from `ignore` (it becomes a real contract)
5. Update `sonar-project.properties` to remove mock exclusions
6. Verify `config.useMockApi` is `false` in staging/production builds

**Effort**  
2–3 weeks (full team, backend-dependent)

**Acceptance Criteria**

- [ ] `pnpm test` passes with no mock fixtures loaded
- [ ] `pnpm test:security` passes with real API contracts
- [ ] No `// REPLACE_WITH_API` comments remain in `src/`
- [ ] `organization-mock-store.ts` and `organization-fixtures.ts` deleted
- [ ] Staging build connects to staging API and returns real data
- [ ] `config.useMockApi` throws in production if somehow enabled

**Dependencies**

- Backend must implement all endpoints listed in `REPLACE_WITH_API` comments
- API contract drift checker (`pnpm contracts:drift`) must pass

**Risk if Skipped**

- Zero real security enforcement. Anyone can bypass all permission checks by editing mock fixtures.
- Data is not persisted. Page refresh resets all state.
- Cannot demo to customers or investors.

---

### P0-2: Implement Real Organization Status Check

**Context**  
`requireActiveOrganization()` in `src/app/guards/route-guards.ts` is hardcoded to always return `'active'`. This means a suspended organization can access all routes (dashboard, settings, billing) as if it were active. Only the `suspended` page itself is accessible — which is backwards.

**File to Change**  
`src/app/guards/route-guards.ts` (lines 51–60)

**What to Do**

```typescript
// BEFORE (current):
export function requireActiveOrganization(organizationId: string): void {
  // REPLACE_WITH_API: read status + subscription from the membership response.
  const status: 'active' | 'suspended' = 'active';
  if (status !== 'active') { ... }
}

// AFTER (real implementation):
export function requireActiveOrganization(organizationId: string): void {
  const store = useOrganizationStore.getState();
  const org = store.organizations?.find(o => o.id === organizationId);
  // Or fetch from API if not cached:
  // const org = await getOrganization(organizationId);

  if (!org || org.status !== 'active') {
    throw redirect({
      to: '/organization/$organizationId/suspended',
      params: { organizationId },
    });
  }
}
```

**Effort**  
1–2 days

**Acceptance Criteria**

- [ ] A suspended organization is redirected to `/suspended` from all child routes
- [ ] The `suspended` page itself does NOT redirect (no loop)
- [ ] An active organization passes through normally
- [ ] Unit test: mock store with `status: 'suspended'` → redirect thrown
- [ ] Unit test: mock store with `status: 'active'` → no redirect

**Dependencies**

- P0-1 (backend must expose organization status in membership response)

**Risk if Skipped**

- Suspended organizations continue to access all features indefinitely
- Revenue leakage — users can use the product after subscription lapses
- Legal/compliance risk if suspended orgs access sensitive data

---

### P0-3: Wire RBAC Permission Gates to All Routes

**Context**  
The `requirePermission()` guard exists in `src/core/rbac/guards.ts` but is **never called** in any route's `beforeLoad` or `loader`. The dashboard, billing, members, roles, API keys, and invitations pages are all accessible to any authenticated member. The `PageManifest` type has a `permission` field, but it's always `null` in every manifest file.

**Files to Change**

- `src/core/rbac/guards.ts` — no change needed (function exists)
- `src/app/routes/routeTree.tsx` — add permission checks to each org route
- `src/pages/organization/$organizationId/dashboard/dashboard.manifest.ts` — add `permission: 'organization:read'`
- `src/pages/organization/$organizationId/suspended/suspended.manifest.ts` — add `permission: null` (or `'organization:read'`)
- All other org page manifests (as they are created)

**What to Do**

1. Update `dashboard.manifest.ts`:

```typescript
export const manifest = {
  segment: 'dashboard',
  path: '/organization/$organizationId/dashboard',
  title: 'Dashboard',
  testId: 'dashboard-page',
  permission: 'organization:read', // ← ADD
  kind: 'leaf',
  children: [],
} as const satisfies PageManifest;
```

2. Update `routeTree.tsx` to enforce manifest permissions:

```typescript
const organizationDashboardRoute = createRoute({
  // ... existing config
  beforeLoad: ({ params, preload }) => {
    if (preload) return;
    requireActiveOrganization(params.organizationId);
    if (dashboardManifest.permission) {
      requirePermission(dashboardManifest.permission);
    }
  },
});
```

3. Create a helper to DRY this up:

```typescript
function enforceManifestPermission(manifest: PageManifest) {
  if (manifest.permission) requirePermission(manifest.permission);
}
```

**Effort**  
2–3 days

**Acceptance Criteria**

- [ ] Dashboard requires `organization:read`
- [ ] Members page requires `membership:read`
- [ ] Members management requires `membership:manage`
- [ ] Invitations requires `invitation:manage`
- [ ] Roles requires `role:read` / `role:manage`
- [ ] API keys requires `api-key:read` / `api-key:manage`
- [ ] Billing requires `subscription:read` / `subscription:manage`
- [ ] Unauthenticated user → `/login`
- [ ] Authenticated but missing permission → `/unauthorized`
- [ ] `super_admin` role bypasses all permission checks (verified)

**Dependencies**

- P0-1 (backend must return real permissions)
- P0-2 (organization status check must be real)

**Risk if Skipped**

- Any member can access billing, manage other members, create API keys, delete roles
- Multi-tenant isolation is broken — a member in one org could see data they shouldn't
- Complete bypass of subscription tier enforcement

---

### P0-4: Cache Organization Membership List

**Context**  
`findMembership()` in `src/shared/tenancy/organization-membership.ts` calls `listMyOrganizations()` on EVERY organization route navigation. This means switching from `/org/acme/dashboard` to `/org/acme/members` triggers a fresh fetch of the entire membership list. For a user with 10+ organizations, this is wasteful and causes UI flicker.

**File to Change**  
`src/shared/tenancy/organization-membership.ts` (lines 23–28)

**What to Do**  
Option A (React Query cache — preferred):

```typescript
// Add to my-organizations.ts or a new hook:
export function useMyOrganizations() {
  return useQuery({
    queryKey: ['organizations', 'list'],
    queryFn: listMyOrganizations,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Update findMembership:
export async function findMembership(
  organizationId: string,
): Promise<Organization | null> {
  // Try cache first
  const cached = queryClient.getQueryData<Organization[]>(['organizations', 'list']);
  const organizations = cached ?? (await listMyOrganizations());
  return organizations.find((o) => o.id === organizationId) ?? null;
}
```

Option B (Zustand store cache):

```typescript
// Add to useOrganizationStore:
interface OrganizationStore {
  organizations: Organization[];
  setOrganizations: (orgs: Organization[]) => void;
  // ...
}
```

**Effort**  
1 day

**Acceptance Criteria**

- [ ] Navigating between routes in the same organization does NOT refetch `listMyOrganizations()`
- [ ] Switching to a different organization uses cached list (if within staleTime)
- [ ] After 5 minutes of inactivity, the next navigation fetches fresh data
- [ ] Manual refresh (e.g., pull-to-refresh or F5) always fetches fresh data
- [ ] Unit test: cache hit → no network call
- [ ] Unit test: cache miss → network call

**Dependencies**

- None (can be done before P0-1 since it's a frontend caching change)

**Risk if Skipped**

- Performance degradation as the app scales to more organizations
- Unnecessary API load on backend
- UI flicker on every route change within the same org

---

### P0-5: Fix Permission Loading Race Condition

**Context**  
`ensurePermissionsFor()` in `src/shared/tenancy/organization-membership.ts` uses a module-level mutable variable `permissionsLoadedFor` to track which organization has loaded permissions. If a user navigates from `org_acme` to `org_globex` rapidly (before the first permission fetch completes), both fetches run concurrently. The second one to finish overwrites the store, potentially leaving `org_acme` with `org_globex`'s permissions.

**File to Change**  
`src/shared/tenancy/organization-membership.ts` (lines 30–40)

**What to Do**  
Replace module-level variable with per-organization cache in the Zustand store:

```typescript
// In useOrganizationStore:
interface OrganizationStore {
  // ... existing fields
  permissionsMap: Record<string, OrganizationPermission[]>;
  setPermissionsForOrg: (orgId: string, permissions: OrganizationPermission[]) => void;
  getPermissionsForOrg: (orgId: string) => OrganizationPermission[] | undefined;
}

export const useOrganizationStore = create<OrganizationStore>((set, get) => ({
  // ... existing fields
  permissionsMap: {},
  setPermissionsForOrg: (orgId, permissions) =>
    set((state) => ({
      permissionsMap: { ...state.permissionsMap, [orgId]: permissions },
    })),
  getPermissionsForOrg: (orgId) => get().permissionsMap[orgId],
}));

// Update ensurePermissionsFor:
export async function ensurePermissionsFor(organizationId: string): Promise<void> {
  const store = useOrganizationStore.getState();
  if (store.getPermissionsForOrg(organizationId)?.length > 0) return;

  const permissions = await getMyPermissions();
  store.setPermissionsForOrg(organizationId, permissions);
}
```

**Effort**  
1 day

**Acceptance Criteria**

- [ ] Rapid org switching (e.g., clicking between org A and org B in < 100ms) loads correct permissions for each
- [ ] Each org has its own permission cache entry
- [ ] Permissions are never mixed between organizations
- [ ] Unit test: simulate rapid switch → verify correct permissions per org
- [ ] `resetPermissionCacheForTests()` clears all entries

**Dependencies**

- None (can be done before P0-1)

**Risk if Skipped**

- User sees wrong permissions for the current organization
- Could allow unauthorized actions (e.g., deleting members in org A while viewing org B)
- Data corruption if user submits a form with wrong org context

---

## 🟠 P1 — Critical (Before Beta / Internal Rollout)

These 6 items must be completed before any internal beta or team-wide usage. They fix security gaps and UX issues that would block real users.

---

### P1-1: Add Guest Guards to Auth-Adjacent Routes

**Context**  
Three guest-only routes (`/login`, `/register`, `/forgot-password`) have `redirectIfAuthenticated()` guards, but three other auth-adjacent routes do NOT: `/reset-password`, `/verify-email`, `/mfa`. An already-authenticated user can accidentally navigate to these pages, which is confusing and could cause session issues.

**Files to Change**

- `src/app/routes/routeTree.tsx` (lines 193–215)

**What to Do**

```typescript
const resetPasswordRoute = createRoute({
  // ... existing
  beforeLoad: () => redirectIfAuthenticated(), // ADD
});

const verifyEmailRoute = createRoute({
  // ... existing
  beforeLoad: () => redirectIfAuthenticated(), // ADD
});

const mfaRoute = createRoute({
  // ... existing
  beforeLoad: () => redirectIfAuthenticated(), // ADD
});
```

**Effort**  
2 hours

**Acceptance Criteria**

- [ ] Authenticated user navigating to `/reset-password` → redirected to `/`
- [ ] Authenticated user navigating to `/verify-email` → redirected to `/`
- [ ] Authenticated user navigating to `/mfa` → redirected to `/`
- [ ] Guest user can still access all three normally
- [ ] E2E test: login → navigate to `/reset-password` → verify redirect

**Dependencies**

- None

---

### P1-2: Add Invitation Param Validation + Auth Policy

**Context**  
`/accept-invite/$invitationId` has no param validation and no auth guard. The `$invitationId` could be any string. An unauthenticated user can visit this page and potentially see invitation details (org name, sender, etc.) before accepting. This is an information leakage risk.

**Files to Change**

- `src/app/routes/routeTree.tsx` (lines 237–243)
- `src/lib/routes/params.ts` (add invitation schema)

**What to Do**

1. Add param validation schema:

```typescript
// src/lib/routes/params.ts
export const invitationIdParamSchema = z
  .string()
  .regex(/^inv_[A-Za-z0-9]{1,32}$/, 'invalid invitation id');

export function parseInvitationIdParam(raw: string): string | null {
  const result = invitationIdParamSchema.safeParse(raw);
  return result.success ? result.data : null;
}
```

2. Add to route:

```typescript
const acceptInviteRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/accept-invite/$invitationId',
  params: {
    parse: ({ invitationId }) => {
      if (!parseInvitationIdParam(invitationId)) throw notFound();
      return { invitationId };
    },
  },
  // Decide auth policy:
  // Option A: Allow guests to view invitation + prompt to sign up
  // beforeLoad: () => { /* no guard — public page */ }

  // Option B: Require auth to accept
  // beforeLoad: () => requireAuth(),

  head: manifestHead(acceptInviteManifest),
  component: AcceptInvitePage,
});
```

**Decision Needed**: Should guests view invitations? Typically yes — they need to see what they're joining before creating an account. But the invitation details should be minimal (org name only, not member list).

**Effort**  
1 day (including backend endpoint for invitation details)

**Acceptance Criteria**

- [ ] Invalid invitation ID format → 404
- [ ] Valid invitation ID → invitation page loads
- [ ] Guest can view invitation (if policy = public)
- [ ] Authenticated user can accept invitation
- [ ] Expired invitation → appropriate error message
- [ ] Unit test: invalid ID → 404
- [ ] E2E test: visit invitation → accept → join organization

**Dependencies**

- Backend must expose `GET /invitations/:id` (public, minimal info)
- P0-1 if policy = authenticated-only

---

### P1-3: Create Offline Page (`public/offline.html`)

**Context**  
The service worker (`src/sw.ts`) references `/offline.html` in its navigation fallback, but the file does not exist. When the user is offline and navigates to a new page, they see a plain text "Offline" response with status 503. This is a poor UX.

**File to Create**  
`public/offline.html`

**What to Do**  
Create a styled HTML page that matches the app's design:

- Uses the same color scheme (dark mode support via `theme-init.js`)
- Shows "You're offline" message
- Has a "Retry" button that attempts to reload
- Links to cached pages if available (e.g., "Go to Dashboard" if cached)
- Uses inline styles (no external CSS, since network is unavailable)
- Minimal JS to check `navigator.onLine` and auto-reload when online

**Effort**  
2 hours

**Acceptance Criteria**

- [ ] `public/offline.html` exists and is committed
- [ ] Service worker serves it when offline and navigation fails
- [ ] Page matches app branding (colors, fonts, layout)
- [ ] Has a "Retry" button that reloads the page
- [ ] Works without any external resources (all styles inline)
- [ ] E2E test: simulate offline → navigate to new page → verify offline.html loads

**Dependencies**

- None

---

### P1-4: Add Production API Base URL Validation

**Context**  
In production, `config.apiBaseUrl` defaults to `''` (empty string) if `VITE_API_BASE_URL` is not set. This means API calls become relative to the origin (`/api/v1/...`). If the frontend and backend are deployed to different origins, all API calls fail silently with 404s. This is a common deployment misconfiguration.

**File to Change**  
`src/core/config/env.ts` (lines 117–121)

**What to Do**

```typescript
// After existing HTTPS check (line 117), add:
if (config.isProduction && !config.apiBaseUrl) {
  throw new Error(
    '[Config] VITE_API_BASE_URL is required in production. ' +
      'Set it to your API origin (e.g., https://api.yourapp.com).',
  );
}
```

**Effort**  
30 minutes

**Acceptance Criteria**

- [ ] Production build with missing `VITE_API_BASE_URL` → hard error at boot
- [ ] Production build with valid `VITE_API_BASE_URL` → normal startup
- [ ] Development build with empty `VITE_API_BASE_URL` → works (Vite proxy)
- [ ] Unit test: mock `PROD=true` + `VITE_API_BASE_URL=''` → throws
- [ ] CI build fails if env var is missing

**Dependencies**

- None

---

### P1-5: Add Retry Jitter to Prevent Thundering Herd

**Context**  
The HTTP retry logic uses exponential backoff without jitter. If the API server goes down and comes back up, all waiting clients will retry at the exact same time (1s, 2s, 4s, 8s... synchronized). This creates a thundering herd that can overwhelm the recovering server.

**File to Change**  
`src/core/http/fetch-client.ts` (lines 107–109)

**What to Do**

```typescript
// BEFORE:
function exponentialDelay(attempt: number): number {
  return Math.min(1000 * 2 ** attempt, 30_000);
}

// AFTER:
function exponentialDelay(attempt: number): number {
  const base = Math.min(1000 * 2 ** attempt, 30_000);
  const jitter = Math.random() * 1000; // 0–1000ms random
  return base + jitter;
}
```

**Effort**  
30 minutes

**Acceptance Criteria**

- [ ] Retries have random jitter between 0 and 1000ms
- [ ] Multiple clients retrying simultaneously spread out over time
- [ ] Unit test: verify jitter is within expected range
- [ ] No change to max delay (still 30 seconds)

**Dependencies**

- None

---

### P1-6: Strip All Console Output in Production

**Context**  
The Vite config strips `console.log` and `debugger` in production, but `console.warn` and `console.error` remain. The codebase has many `console.warn` calls in error paths (HTTP retries, refresh failures, config warnings). These appear in production browser consoles and can leak implementation details or help attackers fingerprint the app.

**File to Change**  
`vite.config.ts` (line 96)

**What to Do**

```typescript
// BEFORE:
esbuild: {
  drop: mode === 'production' ? ['console', 'debugger'] : [],
},

// AFTER:
esbuild: {
  drop: mode === 'production' ? ['console', 'debugger'] : [],
},
// AND add a custom plugin or use terser to strip console.warn/error:
// OR: change to 'drop_console' which strips ALL console methods
```

Actually, `esbuild`'s `drop: ['console']` drops ALL `console.*` calls. The current config only drops `console` and `debugger` — this already drops all `console.*` methods. Let me verify...

After checking: `esbuild` `drop: ['console']` removes ALL `console.*` calls. The current config should already strip `console.warn` and `console.error`. However, the `//` comments in the source code might confuse. Let me check if there are any `console.warn` or `console.error` calls that use the window object or aliases.

**Actual Fix**: Verify that `drop: ['console']` works as expected. If not, add a terser plugin to strip remaining console calls. Also add a lint rule (`biome.json` or `eslint.config.mjs`) to forbid `console.*` in production code paths.

**Effort**  
1 hour (verification + lint rule)

**Acceptance Criteria**

- [ ] No `console.*` calls exist in production bundle (verified via `grep` on `dist/`)
- [ ] Lint rule flags `console.warn` / `console.error` in PR review
- [ ] Dev-only diagnostic logging uses a custom logger that compiles out in production

**Dependencies**

- None

---

## 🟡 P2 — High (Before GA / Public Launch)

These 7 items are important for a polished public launch but don't block internal testing.

---

### P2-1: Improve Idle Timeout Activity Events

**Context**  
The idle timeout monitors `mousemove` and `scroll` as user activity events. On a dashboard with auto-updating charts, live feeds, or scrollable data tables, these events can fire continuously even if the user is not actively interacting. This prevents the session from ever expiring, defeating the security purpose.

**File to Change**  
`src/shared/auth/idle-timeout.ts` (lines 34–40)

**What to Do**

```typescript
// BEFORE:
const ACTIVITY_EVENTS: Array<keyof DocumentEventMap> = [
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
  'mousemove',
];

// AFTER:
const ACTIVITY_EVENTS: Array<keyof DocumentEventMap> = [
  'mousedown',
  'keydown',
  'touchstart',
  'click',
  'submit',
];
```

Remove `scroll` and `mousemove`. Add `click` and `submit` for explicit interactions.

**Effort**  
30 minutes

**Acceptance Criteria**

- [ ] Moving mouse over charts does NOT reset idle timer
- [ ] Scrolling a data table does NOT reset idle timer
- [ ] Clicking a button, typing, or touching the screen DOES reset timer
- [ ] Unit test: mousemove event → timer NOT reset
- [ ] Unit test: keydown event → timer reset

**Dependencies**

- None

---

### P2-2: Add Data Table Virtualization

**Context**  
The `DataTable` component renders all rows in the DOM. For datasets with 1000+ rows (e.g., large member lists, audit logs), this causes significant DOM bloat and performance degradation. The table has pagination but no virtual scrolling.

**Files to Change**

- `src/shared/components/data-table/DataTable.tsx`
- `package.json` (add `@tanstack/react-virtual`)

**What to Do**

1. Add `@tanstack/react-virtual` dependency
2. Wrap the table body in a virtualizer:

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

function DataTable<T>({ data, ... }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48, // row height
  });

  return (
    <div ref={parentRef} className="overflow-auto max-h-[600px]">
      <table>
        {/* header */}
        <tbody>
          {virtualizer.getVirtualItems().map((virtualRow) => (
            <tr key={virtualRow.key} style={{ height: `${virtualRow.size}px` }}>
              {/* cells */}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

**Effort**  
2–3 days

**Acceptance Criteria**

- [ ] Table with 10,000 rows renders smoothly
- [ ] Only visible rows are in the DOM
- [ ] Sorting, filtering, pagination still work
- [ ] Row height is consistent or dynamically measured
- [ ] Performance: < 16ms frame time during scroll
- [ ] Works with `useDataTableUrlState` (URL sync)

**Dependencies**

- None

---

### P2-3: Add API Health Check + Global Unavailable State

**Context**  
If the API is completely down (e.g., server maintenance, DDoS), the app shows individual error toasts for every failed request. There is no global "API unavailable" state that disables the UI and shows a maintenance banner.

**Files to Change**

- `src/shared/components/OfflineIndicator/` (extend or create new)
- `src/core/http/fetch-client.ts` (add health check logic)
- `src/shared/store/useUIStore/` (add global API state)

**What to Do**

1. Add a lightweight health check endpoint ping (e.g., `GET /api/v1/health` or `HEAD /api/v1/health`)
2. Create a global API state in the UI store:

```typescript
interface UIStore {
  apiStatus: 'online' | 'degraded' | 'offline';
  setApiStatus: (status: 'online' | 'degraded' | 'offline') => void;
}
```

3. Show a banner when API is offline:

```tsx
{
  apiStatus === 'offline' && (
    <Banner variant="destructive">
      Service temporarily unavailable. Please try again later.
    </Banner>
  );
}
```

4. Disable interactive elements when offline

**Effort**  
2–3 days

**Acceptance Criteria**

- [ ] Health check pings every 30 seconds when API is up, every 5 seconds when down
- [ ] First API failure → show banner within 5 seconds
- [ ] API recovery → banner disappears, UI re-enables
- [ ] Does not interfere with the existing `OfflineIndicator` (network-level)
- [ ] Health check uses minimal bandwidth (HEAD request or small JSON)
- [ ] Unit test: simulate API failure → banner shown
- [ ] E2E test: mock API 503 → verify banner and disabled buttons

**Dependencies**

- Backend must expose `GET /health` or similar lightweight endpoint

---

### P2-4: Add Image Caching to Service Worker

**Context**  
The service worker only caches fonts. User avatars, organization logos, and chart images are not cached. These images are re-fetched on every page load, causing unnecessary bandwidth usage and slower loading.

**File to Change**  
`src/sw.ts`

**What to Do**

```typescript
// Add after font caching:
registerRoute(
  /^https:\/\/.*\.(png|jpg|jpeg|svg|webp|gif)$/,
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  }),
);

// For API-served images (avatars, logos):
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/v1/') && url.pathname.includes('/avatar'),
  new StaleWhileRevalidate({
    cacheName: 'api-images',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
      }),
    ],
  }),
);
```

**Effort**  
2 hours

**Acceptance Criteria**

- [ ] Static images (PNG, JPG, SVG, WebP) cached for 30 days
- [ ] API-served avatars/logos cached with stale-while-revalidate (7 days)
- [ ] Cache limits prevent unbounded growth (100 static, 200 API)
- [ ] Works offline: previously loaded images display without network
- [ ] E2E test: load page → go offline → verify images still display

**Dependencies**

- None

---

### P2-5: Add Debounce to Data Table URL Filter Sync

**Context**  
The `useDataTableUrlState` hook updates URL search params immediately on every filter change. If a user types "john" in a search box, the URL updates 4 times: `?search=j`, `?search=jo`, `?search=joh`, `?search=john`. This creates excessive browser history entries and causes unnecessary re-renders.

**File to Change**  
`src/shared/hooks/useDataTableUrlState/useDataTableUrlState.ts`

**What to Do**  
Add a debounce (300ms) before syncing filters to the URL:

```typescript
import { useDebounce } from '@/shared/hooks/useDebounce'; // or use lodash.debounce

function useDataTableUrlState(enabled: boolean) {
  // ... existing logic

  const debouncedSync = useDebounce((filters) => {
    syncUrl(filters);
  }, 300);

  useEffect(() => {
    if (!enabled) return;
    debouncedSync(currentFilters);
  }, [currentFilters]);
}
```

**Effort**  
2 hours

**Acceptance Criteria**

- [ ] Typing "john" in search → URL updates once after 300ms
- [ ] Sorting column → URL updates immediately (no debounce needed for sort)
- [ ] Changing page size → URL updates immediately
- [ ] Browser back button works correctly with debounced history
- [ ] Unit test: rapid filter changes → only one URL update

**Dependencies**

- None

---

### P2-6: Reset Session Timestamp on Every Login

**Context**  
The 12-hour session cap (`SESSION.MAX_AGE_MS`) uses a timestamp stored in `localStorage`. This timestamp is set on the FIRST login and never reset on subsequent logins. If a user logs out and logs back in, the new session inherits the old timestamp, potentially causing an immediate logout if the cap was reached.

**File to Change**  
`src/shared/auth/session-lifetime.ts` (lines 16–25)

**What to Do**  
Ensure `markSessionStart()` is called on every interactive login (not just the first):

```typescript
// In shared/auth/service.ts, inside performLogin() or wherever login succeeds:
markSessionStart(); // Always call this on successful login
```

Also verify that `silentRefresh()` (background refresh on boot) does NOT call `markSessionStart()` — it should only be called on interactive authentication (login, register, MFA, invite accept, email verify).

**Effort**  
1 hour

**Acceptance Criteria**

- [ ] Login → `core:session-started-at` updated to current time
- [ ] Logout → `core:session-started-at` cleared
- [ ] Silent refresh on page load → timestamp NOT updated
- [ ] 12-hour cap applies from most recent login, not first login
- [ ] Unit test: login → logout → login → verify fresh timestamp

**Dependencies**

- None

---

### P2-7: Add `frame-src` Directive to CSP

**Context**  
The CSP does not include a `frame-src` directive. If the app ever embeds iframes (e.g., Stripe Checkout, Calendly, Intercom), the default `default-src 'self'` will apply. This is restrictive and might break integrations. Adding `frame-src` explicitly provides clarity and control.

**File to Change**  
`src/lib/csp-api-origin.ts` (line 54–85, `buildContentSecurityPolicy`)

**What to Do**

```typescript
const directives = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  `connect-src ${connectSrc.join(' ')}`,
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "worker-src 'self'",
  "frame-src 'none'", // ADD THIS
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
];
```

**Effort**  
15 minutes

**Acceptance Criteria**

- [ ] CSP header includes `frame-src 'none'`
- [ ] If future integrations need iframes, this is the explicit place to allowlist them
- [ ] No functional change (default-src already covered this)

**Dependencies**

- None

---

## 🟢 P3 — Medium (Polish & Reliability)

These 5 items improve the user experience and reliability but don't block launch.

---

### P3-1: Move Mock Code to Test Tree

**Context**  
Mock-only files (`organization-mock-store.ts`, `organization-fixtures.ts`, `mock-auth.ts`, `mock-credentials.ts`) live in `src/shared/api/` and `src/shared/auth/`. These are development/test dependencies that should not be in the production source tree. While they are tree-shaken out of production builds, their presence in `src/` is confusing and could lead to accidental imports.

**Files to Move**

- `src/shared/api/organization-mock-store.ts` → `tests/__mocks__/organization-mock-store.ts`
- `src/shared/api/organization-fixtures.ts` → `tests/__mocks__/organization-fixtures.ts`
- `src/shared/auth/mock-auth.ts` → `tests/__mocks__/auth-mock.ts`
- `src/shared/auth/mock-credentials.ts` → `tests/__mocks__/auth-credentials.ts`

**Files to Update**

- All imports of the moved files
- `knip.jsonc` (update `ignore` entries)
- `sonar-project.properties` (update exclusions)
- `vite.config.ts` (ensure tests still resolve)

**Effort**  
1 day

**Acceptance Criteria**

- [ ] All mock files moved to `tests/__mocks__/`
- [ ] All imports updated
- [ ] `pnpm test` passes
- [ ] `pnpm build` still tree-shakes mocks correctly (or they don't exist in build)
- [ ] `knip` does not report them as dead code
- [ ] SonarQube does not scan them as production code

**Dependencies**

- P0-1 (safer to do after backend is wired, so mocks are truly unused)

---

### P3-2: Add Top-Level Store Barrel

**Context**  
Each Zustand store has its own `index.ts` in a subfolder, but there is no top-level `src/shared/store/index.ts` barrel. This means importing multiple stores requires multiple import statements:

```typescript
import { useAuthStore } from '@/shared/store/useAuthStore';
import { useOrganizationStore } from '@/shared/store/useOrganizationStore';
import { useThemeStore } from '@/shared/store/useThemeStore';
```

**File to Create**  
`src/shared/store/index.ts`

**What to Do**

```typescript
export { useAuthStore } from './useAuthStore';
export { useOrganizationStore } from './useOrganizationStore';
export { useConsentStore } from './useConsentStore';
export { useThemeStore } from './useThemeStore';
export { useOnboardingStore } from './useOnboardingStore';
export { useUIStore } from './useUIStore';
```

Then update all multi-store imports to use the barrel (optional — can be done incrementally).

**Effort**  
1 hour

**Acceptance Criteria**

- [ ] `src/shared/store/index.ts` exists and exports all stores
- [ ] All existing imports still work (backward compatible)
- [ ] No circular dependencies introduced
- [ ] `knip` does not flag the barrel as unused

**Dependencies**

- None

---

### P3-3: Add Top-Level Hooks Barrel

**Context**  
Similar to stores, hooks are in subfolders with `index.ts` but no top-level barrel. This is a minor developer experience issue.

**File to Create**  
`src/shared/hooks/index.ts`

**What to Do**

```typescript
export { useList } from './useList';
export { useOne } from './useOne';
export { useCreate } from './useCreate';
export { useUpdate } from './useUpdate';
export { useDelete } from './useDelete';
export { useApiKeys } from './useApiKeys';
export { useMembers } from './useMembers';
export { useInvitations } from './useInvitations';
export { useRoles } from './useRoles';
export { useSubscription } from './useSubscription';
export { useRBAC } from './useRBAC';
export { useDataTableUrlState } from './useDataTableUrlState';
export { useConsumedSearchToken } from './useConsumedSearchToken';
```

**Effort**  
30 minutes

**Acceptance Criteria**

- [ ] `src/shared/hooks/index.ts` exists and exports all hooks
- [ ] All existing imports still work

**Dependencies**

- None

---

### P3-4: Improve Auth Fetch JSON Validation

**Context**  
`authFetch()` in `src/shared/auth/service.ts` calls `response.json()` without checking the `Content-Type` header. If the server returns an HTML error page (e.g., 502 Bad Gateway from a proxy), the JSON parse will fail with an unhelpful error.

**File to Change**  
`src/shared/auth/service.ts` (lines 155–175)

**What to Do**

```typescript
// In doTokenRefresh() or authFetch():
const data = (await response.json()) as unknown;

// AFTER:
const contentType = response.headers.get('Content-Type') ?? '';
if (!contentType.includes('application/json')) {
  throw new Error(`Expected JSON, got ${contentType} (status ${response.status})`);
}
const data = (await response.json()) as unknown;
```

**Effort**  
30 minutes

**Acceptance Criteria**

- [ ] HTML response from auth endpoint → clear error message
- [ ] JSON response → normal parsing
- [ ] Unit test: mock HTML response → meaningful error

**Dependencies**

- None

---

### P3-5: Verify Source Map Deletion on Sentry Upload Failure

**Context**  
The Sentry Vite plugin deletes source maps after upload with `filesToDeleteAfterUpload: ['./dist/assets/*.map']`. However, if the upload fails (e.g., network error, invalid auth token), the plugin may not delete the files. The source maps would then be deployed with the application, exposing source code.

**What to Do**

1. Add a CI step that verifies no `.map` files exist in the final deployment artifact:

```bash
# In CI pipeline (GitHub Actions, Netlify, etc.):
if [ "$(find dist/assets -name '*.map' | wc -l)" -gt 0 ]; then
  echo "ERROR: Source maps found in dist/assets/"
  exit 1
fi
```

2. Or add a post-build script:

```javascript
// scripts/ci/verify-no-source-maps.mjs
import { glob } from 'glob';
const maps = await glob('dist/assets/*.map');
if (maps.length > 0) {
  console.error('Source maps found in dist/assets/:', maps);
  process.exit(1);
}
console.log('No source maps in dist/assets/ ✓');
```

**Effort**  
2 hours

**Acceptance Criteria**

- [ ] CI build fails if `.map` files exist in `dist/assets/`
- [ ] Normal build with successful Sentry upload → no `.map` files
- [ ] Build with failed Sentry upload → CI catches remaining `.map` files
- [ ] Script added to `package.json` as `verify:source-maps`

**Dependencies**

- None

---

## ⚪ P4 — Low (Nice-to-Have)

These 4 items are enhancements that can be done anytime, or by new team members.

---

### P4-1: Add Architecture Diagrams to `docs/`

**Context**  
The codebase has excellent inline documentation but no visual architecture diagrams. New team members would benefit from C4 diagrams (Context, Container, Component, Code) showing how the layers interact.

**Files to Create**

- `docs/architecture/context.md` — System context (users, browser, API, CDN)
- `docs/architecture/container.md` — Frontend container (React, Router, Query, Zustand, Sentry, PostHog)
- `docs/architecture/component.md` — Key components (auth flow, data flow, guard chain)
- `docs/architecture/data-flow.md` — Sequence diagrams for login, route navigation, API call

**Tools**

- Mermaid (Markdown-native, renders in GitHub)
- PlantUML (if more complex diagrams needed)
- Draw.io / Excalidraw (for non-technical stakeholders)

**Effort**  
2–3 days

**Acceptance Criteria**

- [ ] Diagrams render in GitHub preview
- [ ] C4 model covers all 4 levels
- [ ] Auth flow sequence diagram shows token refresh, idle timeout, logout
- [ ] Route guard flow shows decision tree (auth → org → status → permission)
- [ ] Linked from `README.md`

**Dependencies**

- None

---

### P4-2: Use `crypto.randomUUID()` for Request IDs

**Context**  
`generateRequestId()` in `src/core/http/fetch-client.ts` uses a global counter + timestamp. This is deterministic and could theoretically be guessed. While not a security issue (request IDs are only for correlation), using `crypto.randomUUID()` is more robust.

**File to Change**  
`src/core/http/fetch-client.ts` (lines 8–14)

**What to Do**

```typescript
// BEFORE:
let requestCounter = 0;
function generateRequestId(): string {
  requestCounter = (requestCounter + 1) % Number.MAX_SAFE_INTEGER;
  return `${Date.now().toString(36)}-${requestCounter.toString(36)}`;
}

// AFTER:
function generateRequestId(): string {
  return crypto.randomUUID();
}
```

**Effort**  
15 minutes

**Acceptance Criteria**

- [ ] All requests have a `X-Request-ID` header with UUID format
- [ ] No global mutable state
- [ ] Unit test: verify UUID format (8-4-4-4-12)

**Dependencies**

- None

---

### P4-3: Add Clock Skew Detection for Token Refresh

**Context**  
The proactive token refresh uses `Date.now()` (client time) to compare against the JWT `exp` claim (server time). If the client clock is significantly wrong, the token might not be refreshed before expiry. While the 60-second buffer and 401 fallback handle this, detecting clock skew could improve reliability.

**What to Do**

1. Add a server-time endpoint (`GET /api/v1/time`) that returns `{ serverTime: ISOString }`
2. On app boot, compare `Date.now()` to server time
3. If skew > 5 minutes, log a warning and adjust the refresh buffer
4. Or: use the server's `Date` header from every API response to calculate drift

**Effort**  
1 day

**Acceptance Criteria**

- [ ] Clock skew detected on boot
- [ ] Warning logged if skew > 5 minutes
- [ ] Refresh buffer adjusted for detected skew
- [ ] Unit test: simulate clock skew → verify adjusted behavior

**Dependencies**

- Backend must expose time endpoint or `Date` header

---

### P4-4: Flatten Deep Organization Page Paths

**Context**  
The organization pages are nested 6 levels deep: `src/pages/organization/$organizationId/dashboard/...`. This is verbose and can cause issues with some file system tools. While the `$` prefix is a TanStack Router convention, flattening to `src/pages/org/...` or keeping the folder at `src/pages/organization/` with flatter internals would be cleaner.

**What to Do**  
Option A (rename to `org/`):

```
src/pages/
  org/
    [orgId]/
      dashboard/
      suspended/
    picker/
```

Option B (keep `$organizationId` but flatten internals):

```
src/pages/organization/
  $organizationId/
    dashboard.tsx        # instead of dashboard/DashboardPage.tsx
    dashboard.route.tsx
    dashboard.manifest.ts
    dashboard.test.tsx
    suspended.tsx
    suspended.route.tsx
    suspended.manifest.ts
    suspended.test.tsx
```

Option C (status quo — do nothing):
The current structure is correct for TanStack Router conventions and works fine. This is a cosmetic preference.

**Effort**  
1–2 days (if renaming) / 0 days (if status quo)

**Acceptance Criteria**

- [ ] All routes work after rename (if done)
- [ ] All tests pass
- [ ] No import path issues

**Dependencies**

- None (can be done anytime)

---

## Sprint Planning Suggestions

### Sprint 1: Foundation (Weeks 1–2)

- P0-1: Wire backend APIs (2–3 weeks, backend-dependent)
- P1-1: Add guest guards (2 hours)
- P1-5: Add retry jitter (30 minutes)
- P2-1: Fix idle timeout events (30 minutes)

### Sprint 2: Security Hardening (Weeks 3–4)

- P0-2: Implement real org status check (1–2 days)
- P0-3: Wire RBAC to routes (2–3 days)
- P0-4: Cache org list (1 day)
- P0-5: Fix permission race (1 day)
- P1-2: Invitation param validation (1 day)

### Sprint 3: Reliability & Polish (Weeks 5–6)

- P1-3: Create offline page (2 hours)
- P1-4: Production API URL validation (30 minutes)
- P1-6: Strip console output (1 hour)
- P2-3: API health check (2–3 days)
- P2-4: Image caching (2 hours)
- P2-5: URL filter debounce (2 hours)

### Sprint 4: Performance & Scale (Weeks 7–8)

- P2-2: Data table virtualization (2–3 days)
- P2-6: Reset session timestamp (1 hour)
- P2-7: CSP frame-src (15 minutes)
- P3-1: Move mock code to tests (1 day)
- P3-2: Store barrel (1 hour)
- P3-3: Hooks barrel (30 minutes)

### Sprint 5: Cleanup & Documentation (Ongoing)

- P3-4: Auth fetch JSON validation (30 minutes)
- P3-5: Source map verification (2 hours)
- P4-1: Architecture diagrams (2–3 days)
- P4-2: UUID request IDs (15 minutes)
- P4-3: Clock skew detection (1 day)
- P4-4: Flatten page paths (optional)

---

## Tracking Template

Use this checkbox list to track progress. Copy into your project management tool (GitHub Issues, Linear, Jira).

### 🔴 P0 — Blockers

- [ ] P0-1: Wire all backend APIs (REPLACE_WITH_API removal)
- [ ] P0-2: Implement real organization status check
- [ ] P0-3: Wire RBAC permission gates to all routes
- [ ] P0-4: Cache organization membership list
- [ ] P0-5: Fix permission loading race condition

### 🟠 P1 — Critical

- [ ] P1-1: Add guest guards to `/reset-password`, `/verify-email`, `/mfa`
- [ ] P1-2: Add invitation param validation + auth policy
- [ ] P1-3: Create `public/offline.html`
- [ ] P1-4: Add production API base URL validation
- [ ] P1-5: Add retry jitter to HTTP client
- [ ] P1-6: Strip all console output in production

### 🟡 P2 — High

- [ ] P2-1: Remove `mousemove`/`scroll` from idle timeout
- [ ] P2-2: Add data table virtualization
- [ ] P2-3: Add API health check + global unavailable state
- [ ] P2-4: Add image caching to service worker
- [ ] P2-5: Add debounce to data table URL filter sync
- [ ] P2-6: Reset session timestamp on every login
- [ ] P2-7: Add `frame-src` to CSP

### 🟢 P3 — Medium

- [ ] P3-1: Move mock code to `tests/__mocks__/`
- [ ] P3-2: Add `src/shared/store/index.ts` barrel
- [ ] P3-3: Add `src/shared/hooks/index.ts` barrel
- [ ] P3-4: Improve auth fetch JSON validation
- [ ] P3-5: Verify source map deletion on Sentry upload failure

### ⚪ P4 — Low

- [ ] P4-1: Add architecture diagrams to `docs/`
- [ ] P4-2: Use `crypto.randomUUID()` for request IDs
- [ ] P4-3: Add clock skew detection for token refresh
- [ ] P4-4: Flatten deep organization page paths (optional)

---

_This plan is derived from the 5 deep-dive research reports in the `research/` folder. Each item references the specific file and line numbers from the codebase. Update this document as items are completed, and add new items discovered during implementation._
