# Core-FE Architecture & Code Structure Research Report

**Project**: core-fe — Enterprise Multi-Tenant Admin Dashboard  
**Version**: 1.0.0-alpha.0  
**Date**: Generated from deep codebase audit

---

## 1. Architectural Philosophy

The codebase follows a **layered, domain-driven architecture** with strict import rules designed to prevent circular dependencies and maintain clear separation of concerns. The design philosophy is heavily documented in inline comments and architectural decision records (ADRs) embedded in the code itself.

### Core Design Principles (from codebase analysis)

| Principle                      | Implementation                                      | Evidence                                                        |
| ------------------------------ | --------------------------------------------------- | --------------------------------------------------------------- |
| **URL as Source of Truth**     | Organization context lives in URL, not store        | `shared/tenancy/organization-context.ts`                        |
| **Lazy Everything**            | Observability, analytics, heavy chunks deferred     | `main.tsx` `initObservabilityWhenIdle()`, `requestIdleCallback` |
| **No LocalStorage for Tokens** | Access token in module closure only                 | `shared/auth/token.ts`                                          |
| **Single-Flight Operations**   | Refresh token race prevention via `navigator.locks` | `shared/auth/service.ts`                                        |
| **Mock-to-Real Bridge**        | Every mock call tagged with `// REPLACE_WITH_API`   | 20+ locations across `shared/api/`                              |

---

## 2. Layer Architecture Deep Dive

### 2.1 `core/` — The Kernel (Pure Business Logic)

**Rule**: `core/` must NEVER import from `shared/`, `pages/`, or `lib/`.

**What's Inside**:

```
core/
├── config/           # env.ts, constants.ts — validated at boot
├── data-provider/    # Abstract CRUD contract (DataProvider interface)
│   ├── dataProvider.ts        # The interface contract
│   ├── http-data-provider/    # REST adapter (wraps apiClient)
│   └── mock-data-provider/    # In-memory adapter for tests/dev
├── http/             # Low-level fetch client + query client
│   ├── fetch-client.ts        # The HTTP client with retry, 401 refresh, idempotency
│   ├── queryClient.ts         # TanStack Query config with error handling
│   └── mock.ts                # mockResponse helper
├── rbac/             # Role-based access control (policies, guards)
│   ├── guards.ts              # requirePermission, requireAuth, redirectIfAuthenticated
│   └── policies.ts            # hasPermission, hasAllPermissions, hasAnyPermission
├── resources/        # Resource registry for dynamic nav/data tables
├── types/            # Branded types (OrganizationPublicId, etc.) + permissions
└── version/          # Deployment detection via version.json
```

**Issue Found**: `core/http/fetch-client.ts` imports from `shared/` — violating the kernel boundary:

- Line 4: `import { forceLogout, refreshAccessToken } from '@/shared/auth/service.ts'`
- Line 5: `import { getAccessToken } from '@/shared/auth/token.ts'`
- Line 6: `import { HttpError } from '@/shared/errors/HttpError.ts'`

**Why This Matters**: The kernel should be dependency-free. If `core/http/` needs auth, the auth layer should be in `core/auth/` or passed as a dependency. Current design creates a **layer violation** where the kernel depends on application-level shared code.

**Recommendation**: Move `token.ts` (pure closure storage), `HttpError.ts` (pure error class), and the refresh-timer logic into `core/auth/` or `core/http/auth.ts`. Keep `shared/auth/service.ts` (which uses React stores) in `shared/`.

---

### 2.2 `shared/` — Cross-Cutting Concerns (Application Layer)

**Rule**: `shared/` may import from `core/` but NOT from `pages/`.

**Subsystems**:

#### Auth Subsystem (`shared/auth/`)

```
shared/auth/
├── token.ts           # Module-scoped closure (MOVETO core/)
├── service.ts         # Login/logout/silentRefresh (uses shared stores)
├── auth-channel.ts    # BroadcastChannel cross-tab logout
├── refresh-timer.ts   # Proactive token refresh (MOVETO core/)
├── idle-timeout.ts    # Session inactivity watchdog
├── session-lifetime.ts # 12h absolute cap
├── mock-auth.ts       # Dev-only mock session (MOVETO tests/)
├── mock-credentials.ts # Demo credentials (MOVETO tests/)
└── types.ts           # Zod schemas for auth responses
```

**Key Patterns**:

- **Token Storage**: `let accessToken: string | null = null;` — never persisted. Cleared on logout. JWT format validated on `setAccessToken()`.
- **Cross-Tab Logout**: `BroadcastChannel` with `'core-auth'` channel. Only logout propagates, never tokens.
- **Single-Flight Refresh**: `navigator.locks.request('core-auth:refresh', ...)` prevents refresh token reuse detection from triggering.
- **Idle Timeout**: Tracks `mousedown`, `keydown`, `touchstart`, `scroll`, `mousemove` — throttled to 10s. Warns at 5min, logs out at 10min grace.
- **Session Cap**: 12-hour absolute max from first interactive auth. Stored in `localStorage` as a timestamp (not a token).

#### Tenancy Subsystem (`shared/tenancy/`)

```
shared/tenancy/
├── my-organizations.ts       # listMyOrganizations() + createOrganization()
├── organization-context.ts   # syncOrganizationFromRoute() (URL → store)
├── organization-resolver.ts  # resolveRootRedirect() — where does `/` go?
├── organization-membership.ts # findMembership() + ensurePermissionsFor()
└── *.test.ts                 # Comprehensive tests for each
```

**Critical Flow**: `resolveRootRedirect()` → checks `localStorage` for last-used org → validates against current memberships → redirects to dashboard or picker or onboarding.

**Issue**: `listMyOrganizations()` is called on every org route navigation with NO caching. This is O(n) per route change.

#### Store Subsystem (`shared/store/`)

| Store                  | Purpose                               | Persistence              |
| ---------------------- | ------------------------------------- | ------------------------ |
| `useAuthStore`         | User, isAuthenticated, isLoading      | In-memory only           |
| `useOrganizationStore` | Active org ID, slug, permissions      | localStorage (last-used) |
| `useConsentStore`      | Analytics consent state               | localStorage             |
| `useThemeStore`        | Light/dark/system theme               | localStorage             |
| `useOnboardingStore`   | Onboarding wizard state               | localStorage             |
| `useUIStore`           | UI state (command palette open, etc.) | In-memory                |

**All stores use Zustand** with no middleware (no persist). The `useOrganizationStore` manually writes to `localStorage` via `persistOrganizationToStorage()`.

---

### 2.3 `pages/` — Route Islands (Presentation Layer)

**Rule**: One folder = one route. Every page exports `Component()` and `loader()`.

**Folder Naming Convention**:

- `$paramName` for dynamic segments (e.g., `$organizationId`)
- Each folder contains: `*.Page.tsx`, `*.route.tsx`, `*.manifest.ts`, `forms/` (if applicable), `components/` (if applicable), `hooks/` (if applicable)

**Example**: `pages/login/`

```
pages/login/
├── LoginPage.tsx           # The actual page component
├── login.manifest.ts       # Route metadata (title, testId, permission)
├── login.route.tsx         # Router lazy entry point (exports Component + loader)
├── login.route.test.tsx    # Route tests
├── forms/
│   └── LoginForm/
│       ├── LoginForm.tsx
│       ├── LoginForm.test.tsx
│       └── index.ts
└── hooks/
    └── useCooldownClock/
        ├── useCooldownClock.ts
        ├── useCooldownClock.test.ts
        └── index.ts
```

**Manifest Contract** (`PageManifest`):

```typescript
type PageManifest = {
  segment: string; // URL segment
  path: string; // Full pathname
  title: string; // <title> tag content
  testId: string; // data-testid for E2E
  permission: OrganizationPermission | null; // RBAC gate
  kind: 'leaf' | 'layout'; // Has children or terminal
  children: readonly string[]; // Child segment names
};
```

---

### 2.4 `lib/` — Utilities (No React Ideally)

**Rule**: `lib/` should never import React or TanStack Router. It should be pure TypeScript.

**Contents**:

```
lib/
├── animations/         # Framer Motion wrappers + hooks (React present — OK)
├── routes/
│   ├── builders.ts     # Route builder functions (organizationDashboard(), etc.)
│   ├── page-head.ts    # Title composition + manifestHead()
│   ├── page-manifest.ts # PageManifest type definition
│   └── params.ts       # URL param validators (Zod schemas)
├── csp-api-origin.ts   # CSP origin derivation from API base URL
├── csv.ts              # CSV generation utilities
├── onboarding-defaults.ts
├── password-breach.ts  # Have I Been Pwned k-anonymity check
├── password-strength.ts # Heuristic password scorer
├── telemetry-scrub.ts  # URL secret scrubbing for Sentry/PostHog
└── utils.ts            # General utilities
```

**Issue**: `lib/animations/` imports React (Framer Motion). This is acceptable since animations are inherently React-oriented, but it does blur the `lib/` purity boundary. Consider moving to `shared/animations/`.

---

## 3. Data Flow Architecture

### 3.1 HTTP Request Lifecycle

```
User Action
    ↓
CRUD Hook (useList, useOne, useCreate, useUpdate, useDelete)
    ↓
dataProvider (abstract — HTTP or Mock)
    ↓
apiClient (fetch-client.ts)
    ↓
request() function
    ├── buildHeaders() → adds Authorization, X-Request-ID, Content-Type
    ├── fetchWithTimeout() → AbortController with 30s timeout
    ├── parseErrorResponse() → HttpError on non-2xx
    ├── shouldRetry() → exponential backoff (max 30s) on 5xx/network
    └── 401 handler → doRefreshAndReplay() → single-flight refresh
        ↓
    refreshAccessToken() → navigator.locks → POST /auth/refresh
        ↓
    Replay original request with new token
        ↓
    JSON.parse() response
        ↓
    Return { data: T }
```

### 3.2 State Flow

```
URL Bar (e.g., /organization/org_acme/dashboard)
    ↓
TanStack Router
    ├── beforeLoad: requireAuth() → redirect if not authenticated
    ├── beforeLoad: requireOrganizationContext(org_acme) → 404 if not member
    ├── beforeLoad: requireActiveOrganization(org_acme) → redirect to /suspended
    └── loader: requirePermission('organization:read') → 403 if missing
    ↓
Route Component (lazy loaded)
    ↓
Zustand Stores (read via hooks)
    ├── useAuthStore → user, isAuthenticated
    ├── useOrganizationStore → orgId, permissions
    └── useQuery → server data via TanStack Query
    ↓
UI Render
```

### 3.3 Auth State Machine

```
[App Boot]
    ↓
silentRefresh() → POST /auth/refresh (HttpOnly cookie)
    ├── Success → setUser() → isAuthenticated=true, isLoading=false
    │               → scheduleTokenRefresh() (proactive ~60s before expiry)
    │               → startIdleTimeout() (25min warn, 30min logout)
    │               → startSessionLifetimeWatch() (12h cap)
    └── Failure → clearAuth() → isAuthenticated=false, isLoading=false
    ↓
[User Navigates]
    ↓
beforeLoad guards check useAuthStore.getState().isAuthenticated
    ↓
[Token Expires Soon]
    ↓
refreshTimer fires → silentRefresh() → new token scheduled
    ↓
[Token Expires (API 401)]
    ↓
fetch-client intercepts 401 → refreshAccessToken() → replay request
    ├── Success → transparent to user
    └── Failure → forceLogout() → clearAuth() → broadcastLogout() → redirect /login
    ↓
[User Idle]
    ↓
idleTimeout warns → user interacts → cancel warning
    → no interaction → forceLogout()
    ↓
[Session Too Old]
    ↓
sessionLifetimeWatch fires → forceLogout()
    ↓
[User Logs Out Manually]
    ↓
logout() → POST /auth/logout → forceLogout()
    → broadcastLogout() → other tabs clear auth + redirect
```

---

## 4. Component Architecture Patterns

### 4.1 Shadcn UI Vendored Components

25+ components in `shared/components/ui/`. Each is a self-contained Radix UI primitive + Tailwind CSS styling. Notable:

| Component          | Dependencies                   | Notes                                          |
| ------------------ | ------------------------------ | ---------------------------------------------- |
| `alert-dialog.tsx` | `@radix-ui/react-alert-dialog` | Modal confirmations                            |
| `dialog.tsx`       | `@radix-ui/react-dialog`       | Generic modal                                  |
| `chart.tsx`        | `recharts`                     | Data visualization wrapper                     |
| `data-table/`      | `@tanstack/react-table`        | Full table with sorting, pagination, filtering |

**Issue**: `chart.tsx` is 400+ lines and imports `recharts` which is a heavy dependency. It's correctly chunked in `vite.config.ts` (`return 'charts'`), but the component itself is complex.

### 4.2 Compound Components Pattern

`SettingsModal` is a good example of compound composition:

```
SettingsModal/
├── SettingsModal.tsx          # Shell + hash routing (#settings/account/profile)
├── SettingsModalLazy.tsx      # Lazy wrapper
├── SettingsNav.tsx            # Navigation sidebar
├── SettingsPanelShell.tsx     # Content panel wrapper
├── account/
│   ├── AccountPanel.tsx       # Shell with tabs
│   ├── AccountProfilePanel.tsx
│   ├── AccountSecurityPanel.tsx
│   ├── AccountSessionsPanel.tsx
│   ├── AccountAppearancePanel.tsx
│   └── AccountNotificationsPanel.tsx
└── organization/
    ├── OrganizationGeneralPanel.tsx
    ├── OrganizationMembersPanel.tsx
    ├── OrganizationRolesPanel.tsx
    ├── OrganizationBillingPanel.tsx
    ├── OrganizationBranchesPanel.tsx
    └── OrganizationIntegrationsPanel.tsx
```

The modal is driven by URL hash: `#settings/<scope>/<section>`. This is a sophisticated pattern that avoids route remounting.

### 4.3 Data Table Architecture

```
DataTable/
├── DataTable.tsx              # Main table wrapper (TanStack Table)
├── DataTableColumnHeader.tsx  # Sortable column headers
├── DataTablePagination.tsx    # Pagination controls
├── DataTableToolbar.tsx       # Search + filter toolbar
└── useDataTableUrlState.ts   # URL ↔ table state sync
```

The `useDataTableUrlState` hook is critical for shareable filtered views. It syncs pagination, sorting, and filters to URL search params.

---

## 5. File Structure Health Score

| Category                   | Score | Notes                                                                                                                      |
| -------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------- |
| **Folder Depth**           | 7/10  | Max depth 6 (`src/pages/organization/$organizationId/dashboard/...`). Acceptable for an enterprise app.                    |
| **Naming Consistency**     | 9/10  | PascalCase for components, camelCase for files, kebab-case for folders. Consistent.                                        |
| **Co-location**            | 9/10  | Tests colocated with source, components in folders with `index.ts` barrels.                                                |
| **Barrel Files**           | 8/10  | Most units have `index.ts`. Some missing (e.g., `shared/hooks/` subfolders all have `index.ts`).                           |
| **Separation of Concerns** | 8/10  | Core/shared/pages boundary is clear. Minor leakage (core → shared imports).                                                |
| **Dead Code Detection**    | 9/10  | `knip` configured with explicit entries and ignores. Good documentation of exclusions.                                     |
| **Test Coverage**          | 7/10  | Coverage thresholds: branches 59%, functions 61%, lines 66%, statements 66%. Good for alpha but needs 80%+ for production. |

---

## 6. Recommended Structural Improvements

### 6.1 Move Auth Kernel to `core/`

```diff
  src/
+ ├── core/
+ │   ├── auth/
+ │   │   ├── token.ts           # ← from shared/auth/token.ts
+ │   │   ├── refresh-timer.ts   # ← from shared/auth/refresh-timer.ts
+ │   │   ├── session-lifetime.ts # ← from shared/auth/session-lifetime.ts
+ │   │   └── idle-timeout.ts    # ← from shared/auth/idle-timeout.ts
+ │   └── errors/
+ │       ├── HttpError.ts       # ← from shared/errors/HttpError.ts
+ │       └── AppError.ts        # ← from shared/errors/AppError.ts
  ├── shared/
  │   ├── auth/
  │   │   ├── service.ts         # (stays — uses React stores)
  │   │   └── auth-channel.ts    # (stays — BroadcastChannel)
  │   └── errors/
  │       └── errorHandler.ts    # (stays — uses Sentry)
```

### 6.2 Extract Mock Code to Test Tree

```diff
  src/
  ├── shared/
  │   └── api/
  │       ├── organization-api.ts     # Keep real API calls
  │       └── organization-contracts.ts # Keep types
- │       ├── organization-fixtures.ts   # REMOVE → tests/__mocks__/
- │       └── organization-mock-store.ts # REMOVE → tests/__mocks__/
  tests/
  └── __mocks__/
      ├── organization-mock-store.ts
      └── organization-fixtures.ts
```

### 6.3 Add Top-Level Store Barrel

```typescript
// src/shared/store/index.ts
export { useAuthStore } from './useAuthStore';
export { useOrganizationStore } from './useOrganizationStore';
export { useConsentStore } from './useConsentStore';
export { useThemeStore } from './useThemeStore';
export { useOnboardingStore } from './useOnboardingStore';
export { useUIStore } from './useUIStore';
```

### 6.4 Flatten Deep Organization Pages (Optional)

```diff
  pages/organization/
- ├── $organizationId/
- │   ├── dashboard/
- │   └── suspended/
+ ├── [organizationId]/          # or keep $ but flatten
+ │   ├── dashboard/
+ │   └── suspended/
```

The `$` prefix is a TanStack Router convention. Keeping it is fine, but consider flattening if the tree grows beyond 3 levels.

---

## 7. Import Rule Verification

| Rule               | From                        | To                           | Status        |
| ------------------ | --------------------------- | ---------------------------- | ------------- |
| `core` → `shared`  | `core/http/fetch-client.ts` | `shared/auth/token.ts`       | ❌ VIOLATION  |
| `core` → `shared`  | `core/http/fetch-client.ts` | `shared/auth/service.ts`     | ❌ VIOLATION  |
| `core` → `shared`  | `core/http/fetch-client.ts` | `shared/errors/HttpError.ts` | ❌ VIOLATION  |
| `shared` → `core`  | `shared/auth/service.ts`    | `core/config/constants.ts`   | ✅ OK         |
| `shared` → `pages` | Any                         | Any                          | ✅ None found |
| `pages` → `shared` | `pages/login/LoginPage.tsx` | `shared/components/ui/`      | ✅ OK         |
| `lib` → `shared`   | `lib/routes/builders.ts`    | `lib/routes/` only           | ✅ OK         |

---

## 8. Tooling & Configuration Architecture

### Lint/Format/Test Stack

```
Biome (lint + format)
  → ESLint (security + a11y + react-hooks + sonarjs + unused-imports)
    → Prettier (format)
      → Husky + lint-staged (pre-commit)
        → Vitest (unit + security tests)
          → Playwright (e2e + visual regression)
            → SonarQube (SAST + coverage)
              → Stryker (mutation testing)
```

### Build Pipeline

```
Vite 7
  ├── React Compiler (babel-plugin-react-compiler) — automatic memoization
  ├── TailwindCSS v4 (CSS-first, @tailwindcss/vite plugin)
  ├── PWA (vite-plugin-pwa, injectManifest, Workbox)
  ├── CSP Injection (custom plugin: csp-api-origin.ts)
  ├── Version JSON (custom plugin: version-json.ts)
  ├── Sentry Source Maps (conditional, production only)
  └── Bundle Analysis (rollup-plugin-visualizer, ANALYZE=true)
```

### Manual Chunk Strategy (`vite.config.ts`)

```typescript
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

**Note**: `cmdk` is intentionally NOT manually chunked because it's only dynamically imported via `CommandPaletteLazy`, so natural splitting handles it. This is a sophisticated optimization decision.

---

## 9. Conclusion

The architecture is **enterprise-grade** with excellent security patterns, clean layer separation, and comprehensive tooling. The main structural issues are:

1. **Core → Shared imports** (3 violations) — fix by moving auth primitives into `core/`
2. **Mock code in production tree** — move to `tests/__mocks__/`
3. **Missing top-level store barrel** — add `shared/store/index.ts`
4. **No `shared/hooks/` barrel** — add `shared/hooks/index.ts`

These are all **mechanical refactors** with no functional changes. The foundation is solid for scaling to a full production system.
