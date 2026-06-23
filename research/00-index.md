# Core-FE Audit — Research Index

**Generated**: From comprehensive deep-dive analysis of the `core-fe` codebase  
**Scope**: Architecture, routes, security, scalability, and technical debt

---

## Research Files

| #   | File                                                                         | Focus                                                                                                         | Size  | Key Takeaways                                                                                                                                                                                     |
| --- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | [`01-architecture-structure.md`](./01-architecture-structure.md)             | Layered architecture, data flow, component patterns, import rules, tooling                                    | 20 KB | Core → Shared layer violations found (3 imports). Strong manifest-per-page pattern. React Compiler + Tailwind v4 + TanStack Router v1.                                                            |
| 2   | [`02-route-security-vulnerability.md`](./02-route-security-vulnerability.md) | All route definitions, guard chains, param validation, permission gates, preload security                     | 27 KB | 4 routes missing guest guards. 1 route missing param validation. 0 permission checks wired. No `requireFeature` usage. Excellent 404-on-non-membership pattern.                                   |
| 3   | [`03-scalability-real-world.md`](./03-scalability-real-world.md)             | Caching, concurrency, race conditions, network patterns, browser compatibility, bundle strategy               | 29 KB | `listMyOrganizations()` has no cache. `ensurePermissionsFor` has module-level race condition. No `/offline.html`. Missing retry jitter. `mousemove`/`scroll` keep session alive.                  |
| 4   | [`04-todos-technical-debt.md`](./04-todos-technical-debt.md)                 | All TODOs, REPLACE_WITH_API tags, action items, effort estimates, debt heat map                               | 20 KB | 20+ `REPLACE_WITH_API` calls (biggest blocker). 0 meaningful TODO/FIXME comments (clean code). 20 action items ranked by priority. Mock layer is the single largest debt item.                    |
| 5   | [`05-security-deep-dive.md`](./05-security-deep-dive.md)                     | Authentication, authorization, CSP, XSS/CSRF prevention, secrets, third-party security, vulnerability summary | 48 KB | **Security Score: 9.2/10**. Token-in-memory is excellent. Trusted Types report-only is mature. Telemetry scrubbing is comprehensive. Main gaps: RBAC not wired, org status hardcoded, mock layer. |

---

## Quick Scorecard

| Category             | Score  | Blockers                                                 |
| -------------------- | ------ | -------------------------------------------------------- |
| **Architecture**     | 8.5/10 | 3 core → shared import violations                        |
| **Security**         | 9.2/10 | RBAC not wired to routes, org status hardcoded           |
| **Scalability**      | 7.5/10 | No org list cache, permission race, missing offline page |
| **Route Safety**     | 7/10   | 4 missing guest guards, 0 permission checks              |
| **Production Ready** | 6/10   | **Blocked by 20+ mock API calls**                        |

---

## Top 5 Must-Fix Before Production

1. **🔴 Wire backend APIs** — Replace all `REPLACE_WITH_API` mock calls with real `apiClient` calls (20+ functions). This is the single biggest blocker.
2. **🔴 Implement real org status check** — `requireActiveOrganization` is hardcoded to `'active'`. Suspended orgs are fully accessible.
3. **🔴 Wire RBAC to routes** — `requirePermission` exists but is never called. Every org route should gate on its manifest permission.
4. **🔴 Cache organization list** — `listMyOrganizations()` fetches on every route change with no cache. Add React Query staleTime.
5. **🔴 Fix permission race condition** — `ensurePermissionsFor` uses a module-level mutable variable. Two rapid org switches → wrong permissions.

---

## Top 5 Quick Wins (1–2 days each)

1. **Add guest guards** to `/reset-password`, `/verify-email`, `/mfa` — 2 hours
2. **Add invitation param validation** — 1 day
3. **Create `public/offline.html`** — 2 hours
4. **Remove `mousemove`/`scroll` from idle timeout** — 30 minutes
5. **Add retry jitter** to prevent thundering herd — 30 minutes

---

## How to Use These Reports

- **Planning sprints**: Use `04-todos-technical-debt.md` for the ranked backlog
- **Security review**: Share `05-security-deep-dive.md` with security team
- **Architecture decisions**: Reference `01-architecture-structure.md` for layer rules
- **Route changes**: Check `02-route-security-vulnerability.md` for guard requirements
- **Performance tuning**: Use `03-scalability-real-world.md` for caching and concurrency fixes

---

_All files are read-only research. No code was modified during this audit._
