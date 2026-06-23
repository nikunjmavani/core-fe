# Core-FE TODOs, Technical Debt & Action Items Research Report

**Project**: core-fe — Enterprise Multi-Tenant Admin Dashboard  
**Version**: 1.0.0-alpha.0  
**Scope**: All TODO/FIXME/REPLACE_WITH_API comments, technical debt, and recommended action items

---

## 1. TODO / FIXME Inventory

### 1.1 Explicit Code Comments

After searching the entire `src/` directory for `TODO`, `FIXME`, `HACK`, `XXX`, and `BUG`, the results were remarkably clean. Only **one** meaningful TODO comment exists:

| File                         | Line | Comment                                                                                                                                          | Context                                                |
| ---------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| `app/guards/route-guards.ts` | 52   | `// REPLACE_WITH_API: read status + subscription from the membership response.`                                                                  | `requireActiveOrganization` is hardcoded to `'active'` |
| `app/guards/route-guards.ts` | 65   | `// REPLACE_WITH_API: evaluate plan feature flags; throw notFound() (hide) or redirect to an upsell surface when the module is not in the plan.` | `requireFeature` is an empty stub                      |

**Note**: The codebase is exceptionally clean of TODO/FIXME comments. This suggests either:

1. The team has a strict no-TODO policy (good)
2. TODOs are tracked in an external system (Jira, Linear, etc.)
3. The project is very young and hasn't accumulated debt yet

### 1.2 `REPLACE_WITH_API` Tags — Backend Integration Debt

This is the **largest category of technical debt** in the project. Every `REPLACE_WITH_API` tag indicates a mock implementation that must be replaced with a real backend call before production.

#### Auth Service (`shared/auth/service.ts`)

| Line | Code                                             | Real Endpoint               | Status         |
| ---- | ------------------------------------------------ | --------------------------- | -------------- |
| 155  | `// REPLACE_WITH_API: POST /api/v1/auth/refresh` | `POST /api/v1/auth/refresh` | Mock mode only |
| 231  | `// REPLACE_WITH_API: POST /api/v1/auth/logout`  | `POST /api/v1/auth/logout`  | Mock mode only |

**Note**: The refresh and logout endpoints are already implemented in the real code path (when `config.useMockApi` is false). The comments are just documentation. The mock path is only for development.

#### Organization API (`shared/api/organization-api.ts`)

| Line | Function                   | Real Endpoint                                                             | Mock Implementation                 |
| ---- | -------------------------- | ------------------------------------------------------------------------- | ----------------------------------- |
| 19   | `getMyPermissions()`       | `GET /api/v1/tenancy/organizations/{orgId}/memberships/me`                | Returns `MY_PERMISSIONS_FIXTURE`    |
| 32   | `acceptInvitation()`       | `POST /api/v1/tenancy/invitations/{invitationId}/accept`                  | Hardcoded `org_acme` response       |
| 57   | `listMembers()`            | `GET /api/v1/tenancy/organizations/{orgId}/memberships`                   | `orgMockStore.listMembers()`        |
| 63   | `updateMemberRole()`       | `PATCH /api/v1/tenancy/organizations/{orgId}/memberships/{membershipId}`  | `orgMockStore.updateMemberRole()`   |
| 72   | `updateMemberStatus()`     | `PATCH /api/v1/tenancy/organizations/{orgId}/memberships/{membershipId}`  | `orgMockStore.updateMemberStatus()` |
| 81   | `removeMember()`           | `DELETE /api/v1/tenancy/organizations/{orgId}/memberships/{membershipId}` | `orgMockStore.removeMember()`       |
| 90   | `listInvitations()`        | `GET /api/v1/tenancy/organizations/{orgId}/invitations`                   | `orgMockStore.listInvitations()`    |
| 96   | `createInvitation()`       | `POST /api/v1/tenancy/organizations/{orgId}/invitations`                  | In-memory creation                  |
| 115  | `revokeInvitation()`       | `DELETE /api/v1/tenancy/organizations/{orgId}/invitations/{invitationId}` | `orgMockStore.revokeInvitation()`   |
| 121  | `resendInvitation()`       | `POST /api/v1/tenancy/organizations/{invitationId}/resend`                | `orgMockStore.resendInvitation()`   |
| 129  | `listRoles()`              | `GET /api/v1/tenancy/organizations/{orgId}/roles`                         | `orgMockStore.listRoles()`          |
| 135  | `createRole()`             | `POST /api/v1/tenancy/organizations/{orgId}/roles`                        | In-memory creation                  |
| 153  | `updateRole()`             | `PATCH /api/v1/tenancy/organizations/{orgId}/roles/{roleId}`              | `orgMockStore.updateRole()`         |
| 170  | `deleteRole()`             | `DELETE /api/v1/tenancy/organizations/{orgId}/roles/{roleId}`             | `orgMockStore.deleteRole()`         |
| 189  | `listApiKeys()`            | `GET /api/v1/tenancy/organizations/{orgId}/api-keys`                      | `orgMockStore.listApiKeys()`        |
| 195  | `createApiKey()`           | `POST /api/v1/tenancy/organizations/{orgId}/api-keys`                     | `Math.random()` generation          |
| 218  | `renameApiKey()`           | `PATCH /api/v1/tenancy/organizations/{orgId}/api-keys/{keyId}`            | `orgMockStore.renameApiKey()`       |
| 224  | `revokeApiKey()`           | `DELETE /api/v1/tenancy/organizations/{orgId}/api-keys/{keyId}`           | `orgMockStore.revokeApiKey()`       |
| 239  | `getSubscription()`        | `GET /api/v1/tenancy/organizations/{orgId}/subscription`                  | `orgMockStore.getSubscription()`    |
| 245  | `updateSubscriptionPlan()` | `PATCH /api/v1/tenancy/organizations/{orgId}/subscription`                | `orgMockStore.updateSubscription()` |

**Count**: 20+ `REPLACE_WITH_API` tags in this file alone.

#### Tenancy (`shared/tenancy/`)

| File                         | Line | Comment                                                                 | Context                                  |
| ---------------------------- | ---- | ----------------------------------------------------------------------- | ---------------------------------------- |
| `organization-membership.ts` | 19   | `// REPLACE_WITH_API note: this runs on EVERY org-route navigation...`  | `findMembership` fetches every time      |
| `organization-membership.ts` | 36   | `// REPLACE_WITH_API: permissions come from the membership response...` | `ensurePermissionsFor` uses mock         |
| `my-organizations.ts`        | 36   | `// REPLACE_WITH_API: GET /api/v1/tenancy/organizations`                | `listMyOrganizations()` returns fixtures |
| `my-organizations.ts`        | 57   | `// REPLACE_WITH_API: POST /api/v1/tenancy/organizations`               | `createOrganization()` is mock in dev    |

#### Auth API (`shared/api/auth-api.ts`)

This file is not fully visible in the audit, but similar patterns likely exist for login, register, forgot password, etc.

---

## 2. Technical Debt Classification

### 2.1 Backend Integration Debt (Mock Code)

**Debt Type**: The entire application is built on a mock data layer. This is intentional for early development, but it's a significant blocker for production.

**Files Affected**:

- `shared/api/organization-api.ts` (20+ functions)
- `shared/api/organization-mock-store.ts` (entire file)
- `shared/api/organization-fixtures.ts` (entire file)
- `shared/auth/mock-auth.ts` (mock session)
- `shared/auth/mock-credentials.ts` (demo credentials)
- `core/data-provider/mock-data-provider/` (entire folder)

**Effort Estimate**: High (weeks). Each mock function needs:

1. Real API endpoint implementation (backend)
2. Zod schema validation for the response
3. Error handling for network failures
4. Integration testing

**Priority**: 🔴 Critical. This is the single biggest blocker for production launch.

### 2.2 Hardcoded Values

| Location                         | Value                                      | Purpose              | Should Be                              |
| -------------------------------- | ------------------------------------------ | -------------------- | -------------------------------------- |
| `core/config/constants.ts`       | `SESSION.MAX_AGE_MS = 12 * 60 * 60 * 1000` | Session cap          | Backend-driven or env-configurable     |
| `core/config/constants.ts`       | `HTTP.TIMEOUT = 30_000`                    | Request timeout      | Per-endpoint or env-configurable       |
| `shared/auth/refresh-timer.ts`   | `BUFFER_MS = 60_000`                       | Token refresh buffer | Backend-driven (token expiry - buffer) |
| `shared/auth/idle-timeout.ts`    | `WARN_AFTER_MS = 5 * 60 * 1000`            | Idle warning         | Env-configurable                       |
| `shared/auth/idle-timeout.ts`    | `GRACE_MS = 5 * 60 * 1000`                 | Idle grace           | Env-configurable                       |
| `shared/api/organization-api.ts` | `PLAN_PRICING` object                      | Subscription pricing | Backend-driven                         |
| `shared/api/organization-api.ts` | `randomHex()` using `Math.random()`        | API key generation   | Backend-driven                         |

**Priority**: 🟡 Medium. These are acceptable for an MVP but should be backend-driven for production flexibility.

### 2.3 Missing Features (Stubs)

| Feature                          | Location                            | Status       | Notes                               |
| -------------------------------- | ----------------------------------- | ------------ | ----------------------------------- |
| `requireFeature()`               | `app/guards/route-guards.ts`        | Empty stub   | Plan/feature gating not implemented |
| `requireActiveOrganization()`    | `app/guards/route-guards.ts`        | Hardcoded    | Organization status always "active" |
| `organization:read` permission   | Dashboard route                     | Not enforced | All members see dashboard           |
| `membership:read` permission     | Members table                       | Not enforced | All members see members list        |
| `subscription:manage` permission | Billing panel                       | Not enforced | All members see billing             |
| Plan limits (seats)              | `organization-api.ts`               | Not enforced | Mock data only                      |
| Branches panel                   | `OrganizationBranchesPanel.tsx`     | Placeholder  | Empty or stub UI                    |
| Integrations panel               | `OrganizationIntegrationsPanel.tsx` | Placeholder  | Empty or stub UI                    |

**Priority**: 🔴 Critical for production RBAC. 🟡 Medium for placeholder UI.

### 2.4 Test Debt

#### Coverage Thresholds

```typescript
// vitest.config.ts
thresholds: {
  branches: 59,
  functions: 61,
  lines: 66,
  statements: 66,
}
```

**Analysis**: These are below the industry standard of 80% for production applications. The team acknowledges this is alpha-stage and targets 80% as auth/organization modules get rebuilt.

**Debt**: Tests for:

- Error boundaries (partially covered)
- Service worker behavior (not covered)
- Real API integration (not applicable yet — mock layer)
- Visual regression (Playwright snapshots exist but may not be comprehensive)
- Accessibility (axe-core tests are configured but coverage unknown)

**Priority**: 🟡 Medium. Increase to 80% before production.

#### Mock Test Leakage

The mock data layer (`organization-mock-store.ts`) is used by both:

1. Development (when `VITE_USE_MOCK_API=true`)
2. Unit tests

This creates a risk that mock-only code paths are tested but real API paths are not. When the backend is wired, the test suite might need significant refactoring.

**Priority**: 🟡 Medium. Plan for mock-to-real test migration.

### 2.5 Documentation Debt

The codebase has extensive inline documentation, but external documentation might be lacking:

| Document              | Status     | Notes                                      |
| --------------------- | ---------- | ------------------------------------------ |
| `README.md`           | ✅ Exists  | 40+ KB, very detailed                      |
| `CLAUDE.md`           | ✅ Exists  | 26+ KB, agent-facing conventions           |
| `AGENTS.md`           | ✅ Exists  | Secondary entry point                      |
| `CONTRIBUTING.md`     | ✅ Exists  | 13+ KB                                     |
| `SECURITY.md`         | ✅ Exists  | 4+ KB                                      |
| `CODE_OF_CONDUCT.md`  | ✅ Exists  | Standard                                   |
| API documentation     | ❌ Missing | No OpenAPI/Swagger spec                    |
| Deployment guide      | ⚠️ Partial | Docker compose for SonarQube only          |
| Onboarding docs       | ⚠️ Partial | `docs/` folder exists but contents unknown |
| Architecture diagrams | ❌ Missing | No C4 or system diagrams                   |

**Priority**: 🟢 Low. Good for team growth but not blocking.

---

## 3. Action Items by Priority

### 🔴 Critical (Before Production)

#### A1: Wire All Backend API Endpoints

**Scope**: Replace all `// REPLACE_WITH_API` calls with real `apiClient` calls.

**Files to Modify**:

- `shared/api/organization-api.ts` (20+ functions)
- `shared/auth/service.ts` (refresh, logout)
- `shared/tenancy/my-organizations.ts` (list, create)
- `shared/tenancy/organization-membership.ts` (permissions)

**Steps**:

1. Backend implements all endpoints (core-be dependency)
2. Frontend swaps `mockResponse()` → `apiClient.get/post/patch/delete()`
3. Add Zod validation for all responses
4. Add error handling for new backend error codes
5. Delete `organization-mock-store.ts` and `organization-fixtures.ts`
6. Disable mock mode in all environments

**Estimated Effort**: 2-3 weeks (full team)

---

#### A2: Implement Real Organization Status Check

**Location**: `app/guards/route-guards.ts:51-60`

```typescript
export function requireActiveOrganization(organizationId: string): void {
  // REPLACE_WITH_API: read status + subscription from the membership response.
  const status: 'active' | 'suspended' = 'active'; // ← HARDCODED
  if (status !== 'active') {
    throw redirect({
      to: '/organization/$organizationId/suspended',
      params: { organizationId },
    });
  }
}
```

**Fix**: Read status from the organization object (already fetched by `requireOrganizationContext`):

```typescript
export function requireActiveOrganization(organizationId: string): void {
  const store = useOrganizationStore.getState();
  const org = // get org from store or fetch
  if (org.status !== 'active') {
    throw redirect({ to: '/organization/$organizationId/suspended', params: { organizationId } });
  }
}
```

**Estimated Effort**: 1-2 days

---

#### A3: Implement Feature Gating

**Location**: `app/guards/route-guards.ts:65-68`

```typescript
export function requireFeature(_feature: string): void {
  // REPLACE_WITH_API: evaluate plan feature flags; throw notFound() (hide) or
  // redirect to an upsell surface when the module is not in the plan.
}
```

**Fix**: Evaluate feature flags from the organization subscription or a feature flag service (e.g., PostHog feature flags, LaunchDarkly, or backend-driven flags):

```typescript
export function requireFeature(feature: string): void {
  const store = useOrganizationStore.getState();
  const features = store.features ?? [];
  if (!features.includes(feature)) {
    throw notFound(); // or redirect to upsell
  }
}
```

**Estimated Effort**: 2-3 days

---

#### A4: Add Permission Gates to All Routes

**Scope**: Every organization-scoped route should have a permission check.

**Routes to Update**:

- `/organization/$organizationId/dashboard` → `organization:read`
- `/organization/$organizationId/members` → `membership:read`
- `/organization/$organizationId/roles` → `role:read`
- `/organization/$organizationId/settings` → `organization:update`
- `/organization/$organizationId/billing` → `subscription:read`
- `/organization/$organizationId/api-keys` → `api-key:read`
- `/organization/$organizationId/invitations` → `invitation:manage`

**Implementation**:

```typescript
// In each route's beforeLoad:
beforeLoad: ({ params, preload }) => {
  if (preload) return;
  requireActiveOrganization(params.organizationId);
  requirePermission('organization:read'); // or appropriate permission
},
```

**Estimated Effort**: 1-2 days

---

#### A5: Cache Organization Membership List

**Location**: `shared/tenancy/organization-membership.ts:23-28`

**Fix**: Add React Query caching:

```typescript
export function useMyOrganizations() {
  return useQuery({
    queryKey: ['organizations', 'list'],
    queryFn: listMyOrganizations,
    staleTime: 5 * 60 * 1000,
  });
}

export async function findMembership(
  organizationId: string,
): Promise<Organization | null> {
  // Use cached data if available, or fetch
  const organizations =
    queryClient.getQueryData(['organizations', 'list']) ?? (await listMyOrganizations());
  return organizations.find((o) => o.id === organizationId) ?? null;
}
```

**Estimated Effort**: 1 day

---

#### A6: Fix Permission Race Condition

**Location**: `shared/tenancy/organization-membership.ts:30-40`

**Fix**: Replace module-level `permissionsLoadedFor` with a per-organization cache in the store:

```typescript
interface OrganizationStore {
  // ... existing fields
  permissionsMap: Record<string, OrganizationPermission[]>;
  setPermissionsForOrg: (orgId: string, permissions: OrganizationPermission[]) => void;
}

export async function ensurePermissionsFor(organizationId: string): Promise<void> {
  const store = useOrganizationStore.getState();
  if (store.permissionsMap[organizationId]?.length > 0) return;
  const permissions = await getMyPermissions();
  store.setPermissionsForOrg(organizationId, permissions);
}
```

**Estimated Effort**: 1 day

---

### 🟡 High (Before Beta)

#### A7: Add Missing Guest Guards

**Routes**: `/reset-password`, `/verify-email`, `/mfa`

**Fix**: Add `beforeLoad: () => redirectIfAuthenticated()` to each.

**Estimated Effort**: 2 hours

---

#### A8: Add Invitation Param Validation

**Route**: `/accept-invite/$invitationId`

**Fix**: Add param validation and decide auth policy (guest or authenticated).

**Estimated Effort**: 1 day

---

#### A9: Create Offline Page

**Location**: `public/offline.html` (doesn't exist)

**Fix**: Create a styled offline page with a retry button.

**Estimated Effort**: 2 hours

---

#### A10: Improve Idle Timeout Events

**Location**: `shared/auth/idle-timeout.ts:34-40`

**Fix**: Remove `mousemove` and `scroll` from activity events:

```typescript
const ACTIVITY_EVENTS: Array<keyof DocumentEventMap> = [
  'mousedown',
  'keydown',
  'touchstart',
  'click',
];
```

**Estimated Effort**: 30 minutes

---

#### A11: Add Retry Jitter

**Location**: `core/http/fetch-client.ts:107-109`

**Fix**: Add random jitter to prevent thundering herd.

**Estimated Effort**: 30 minutes

---

#### A12: Add Production API Base URL Check

**Location**: `core/config/env.ts:117-121`

**Fix**: Add a hard error if `apiBaseUrl` is empty in production:

```typescript
if (config.isProduction && !config.apiBaseUrl) {
  throw new Error('[Config] VITE_API_BASE_URL is required in production');
}
```

**Estimated Effort**: 30 minutes

---

#### A13: Increase Test Coverage to 80%

**Location**: `vitest.config.ts:62-67`

**Fix**: Add tests for uncovered areas and raise thresholds.

**Estimated Effort**: 1 week

---

### 🟢 Medium (Nice to Have)

#### A14: Add Data Table Virtualization

**Scope**: `shared/components/data-table/`

**Fix**: Implement `@tanstack/react-virtual` for large datasets.

**Estimated Effort**: 2-3 days

---

#### A15: Add Debounce to URL Filter Sync

**Scope**: `shared/hooks/useDataTableUrlState/`

**Fix**: Add 300ms debounce to filter changes.

**Estimated Effort**: 2 hours

---

#### A16: Add API Health Check

**Scope**: Global app state

**Fix**: Add a periodic ping to a lightweight health endpoint (e.g., `GET /api/v1/health`).

**Estimated Effort**: 1 day

---

#### A17: Add Image Caching to Service Worker

**Scope**: `src/sw.ts`

**Fix**: Add `CacheFirst` strategy for images.

**Estimated Effort**: 2 hours

---

#### A18: Improve Source Map Security

**Scope**: Build pipeline

**Fix**: Add CI check to verify source maps are deleted before deployment.

**Estimated Effort**: 2 hours

---

#### A19: Move Mock Code to Test Tree

**Scope**: `shared/api/organization-mock-store.ts`, `shared/api/organization-fixtures.ts`, `shared/auth/mock-auth.ts`, `shared/auth/mock-credentials.ts`

**Fix**: Move to `tests/__mocks__/` and update imports.

**Estimated Effort**: 1 day

---

#### A20: Add Architecture Diagrams

**Scope**: Documentation

**Fix**: Create C4 diagrams (context, container, component) and add to `docs/`.

**Estimated Effort**: 1-2 days

---

## 4. Technical Debt Heat Map

| Category             | Debt Items         | Effort | Risk        | Priority |
| -------------------- | ------------------ | ------ | ----------- | -------- |
| Backend Integration  | 20+ mock APIs      | High   | 🔴 Critical | 1        |
| RBAC / Permissions   | 6 missing gates    | Medium | 🔴 Critical | 2        |
| Caching              | 2 race conditions  | Medium | 🔴 Critical | 3        |
| Route Guards         | 4 missing guards   | Low    | 🟡 High     | 4        |
| Test Coverage        | Below 80%          | Medium | 🟡 High     | 5        |
| Production Config    | 3 missing checks   | Low    | 🟡 High     | 6        |
| Offline / Resilience | 3 missing features | Low    | 🟡 Medium   | 7        |
| Code Organization    | 4 refactor items   | Low    | 🟢 Medium   | 8        |
| Documentation        | 3 missing docs     | Low    | 🟢 Low      | 9        |

---

## 5. Conclusion

The codebase is remarkably clean for an alpha-stage project. There are very few TODO/FIXME comments, which indicates good discipline. However, the **backend integration debt** is substantial — the entire data layer is mocked. This is the single most important item to address before production.

The secondary priorities are:

1. **RBAC enforcement** — the permission system exists but is not wired to routes
2. **Caching** — organization list and permissions have race conditions
3. **Route guards** — several routes have inconsistent guard coverage

All of these are **mechanical tasks** that don't require architectural changes. The existing architecture is solid and ready to scale once the debt is paid down.
