# `pages/organization/$organizationId/dashboard` — Dashboard

Route: `/organization/$organizationId/dashboard`. The landing surface after
sign-in. Reads the session context (`useMeContext` → `GET /auth/me/context`) and
renders an overview + capability-gated quick actions. **Personal** organizations
show a lighter set (no member/role/billing management); **team** organizations
surface the full toolkit. Quick actions deep-link into the settings modal
(`#settings/<scope>/<section>`).

## Files

| File                    | Responsibility                                                               |
| ----------------------- | ---------------------------------------------------------------------------- |
| `dashboard.route.tsx`   | Route marker — exports `Component` rendering `DashboardPage`.                |
| `dashboard.manifest.ts` | Manifest — `kind: 'leaf'`, permission `organization:read`.                   |
| `DashboardPage.tsx`     | Overview (stat cards) + quick actions + org switcher. Owns `dashboard-page`. |

## Data

`useMeContext()` (`src/shared/hooks/useMeContext/`) — the single source for the
user, active organization (+ status + capabilities), permission count, and the
org-switcher list. Capabilities (`canInviteMembers`, `canManageRoles`,
`canManageBilling`) gate the quick actions, so personal vs team is data-driven.

## Test ids

- `dashboard-page`, `dashboard-greeting`, `dashboard-org-name`, `dashboard-org-status`
- `dashboard-stat-{workspaces,permissions,type,billing}`
- `dashboard-action-{invite,roles,billing,org-settings,account}` (capability-gated)
- `dashboard-org-item`, `dashboard-org-open` (org switcher, when >1 org)
