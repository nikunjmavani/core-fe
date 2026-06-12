/**
 * Security tripwires over committed static configuration. These read files as
 * text on purpose (vite `?raw` imports): importing vite.config.ts normally
 * would execute plugin factories, and the point is to fail loudly if a
 * security-relevant line is edited away.
 */
import { describe, expect, it } from 'vitest';

import headers from '../../public/_headers?raw';
import viteConfig from '../../vite.config.ts?raw';

describe('security response headers (public/_headers)', () => {
  it.each([
    ['X-Frame-Options', /X-Frame-Options:\s*SAMEORIGIN/],
    ['X-Content-Type-Options', /X-Content-Type-Options:\s*nosniff/],
    ['Referrer-Policy', /Referrer-Policy:\s*strict-origin-when-cross-origin/],
    ['Strict-Transport-Security', /Strict-Transport-Security:\s*max-age=\d+/],
    ['Permissions-Policy', /Permissions-Policy:\s*camera=\(\)/],
  ])('serves %s on every route', (_name, pattern) => {
    expect(headers).toMatch(pattern);
  });

  it('never caches index.html (new-deployment detection depends on it)', () => {
    expect(headers).toMatch(/\/index\.html\n\s+Cache-Control:\s*no-store/);
  });

  it('never caches version.json (the poll target for reload-on-deploy)', () => {
    expect(headers).toMatch(/\/version\.json\n\s+Cache-Control:\s*no-store/);
  });
});

describe('vite build security config', () => {
  it('keeps assetsInlineLimit at 0 (no inlined data: URIs — CSP compliance)', () => {
    expect(viteConfig).toMatch(/assetsInlineLimit:\s*0/);
  });
});
