import { describe, expect, it } from 'vitest';

import { childRouteModule, SUB_PAGES_DIR, subPageDir } from './paths.ts';

describe('route-island paths', () => {
  it('uses sub-pages as the child bucket', () => {
    expect(SUB_PAGES_DIR).toBe('sub-pages');
    expect(subPageDir('members')).toBe('sub-pages/members');
  });

  it('builds lazy import paths for routeTree', () => {
    expect(childRouteModule('organization', 'members')).toBe(
      '@/pages/organization/sub-pages/members/members.route.tsx',
    );
  });
});
