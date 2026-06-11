import type { OrgPermission } from '@/core/types/permissions.ts';

/**
 * Shape for `page.ts` in every route island (leaf or layout).
 * Single manifest for layout vs leaf: path, RBAC, testId, child segments.
 * React UI: `components/<Segment>Layout.tsx` or `components/<Segment>Page.tsx`.
 * Tests: `__tests__/unit/` (not colocated beside source). See route-island skill.
 */
export type RouteIslandKind = 'leaf' | 'layout';

export type PageManifest = {
  /** URL segment for this folder (not the full path). */
  segment: string;
  /** Full pathname this island serves. */
  path: string;
  /** Primary page container `data-testid`. */
  testId: string;
  /** Loader permission; `null` when inherited or public. */
  permission: OrgPermission | null;
  /** `layout` = has `<Outlet />` and `children`; `leaf` = terminal UI. */
  kind: RouteIslandKind;
  /**
   * URL segment names for child routes. On disk (layout islands): `sub-pages/<segment>/`
   * with the full island tree. Same structure at every depth; layout children may nest
   * their own `sub-pages/`.
   */
  children: readonly string[];
};
