import { describe, expect, it } from 'vitest';

import { isAuthenticatedAppSurface } from './chunk-prefetch.ts';

describe('isAuthenticatedAppSurface', () => {
  it('blocks while auth is loading or signed out', () => {
    expect(isAuthenticatedAppSurface('/dashboard', false, true)).toBe(false);
    expect(isAuthenticatedAppSurface('/dashboard', false, false)).toBe(false);
  });

  it('allows authenticated app routes', () => {
    expect(isAuthenticatedAppSurface('/dashboard', true, false)).toBe(true);
    expect(isAuthenticatedAppSurface('/organization/acme/dashboard', true, false)).toBe(
      true,
    );
  });

  it('blocks auth funnels even when signed in', () => {
    expect(isAuthenticatedAppSurface('/login', true, false)).toBe(false);
    expect(isAuthenticatedAppSurface('/onboarding', true, false)).toBe(false);
    expect(isAuthenticatedAppSurface('/accept-invite/inv_x', true, false)).toBe(false);
  });
});
