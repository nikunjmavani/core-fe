/**
 * Route island path conventions (option B: `sub-pages/` bucket).
 * Layout islands list URL segments in `page.children`; on disk they live under `sub-pages/<segment>/`.
 */

/** Directory name for nested route islands under a layout parent. */
export const SUB_PAGES_DIR = 'sub-pages';

/** Relative path from a layout island root to a child island folder. */
export function subPageDir(segment: string): string {
  return `${SUB_PAGES_DIR}/${segment}`;
}

/**
 * Vite/import path from `src/pages/<parent>/` to a child route module.
 * Children follow the `<segment>.route.tsx` naming convention.
 *
 * @example childRouteModule('organization', 'members') → '@/pages/organization/sub-pages/members/members.route.tsx'
 */
export function childRouteModule(parentSegment: string, childSegment: string): string {
  return `@/pages/${parentSegment}/${SUB_PAGES_DIR}/${childSegment}/${childSegment}.route.tsx`;
}
