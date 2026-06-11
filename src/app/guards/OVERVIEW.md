# `src/app/guards/`

Route-level auth and RBAC enforcement. Protected routes use `beforeLoad` on TanStack Router routes in `src/app/routes/routeTree.tsx` (redirect to login, tenant bootstrap, `requirePermission`). UI-level checks use `PermissionGuard` / `useHasPermission` in `src/shared/`.

| File     | Purpose                                                                |
| -------- | ---------------------------------------------------------------------- |
| _(none)_ | Guards live in `src/core/rbac/guards.ts` and route `beforeLoad` hooks. |
