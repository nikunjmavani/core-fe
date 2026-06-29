/**
 * Security tripwires over committed static configuration. These read files as
 * text on purpose (vite `?raw` imports): importing vite.config.ts normally
 * would execute plugin factories, and the point is to fail loudly if a
 * security-relevant line is edited away.
 */
import { describe, expect, it } from 'vitest';

import indexHtml from '../../index.html?raw';
import headers from '../../public/_headers?raw';
import viteConfig from '../../vite.config.ts?raw';

describe('security response headers (public/_headers)', () => {
  it.each([
    ['X-Frame-Options', /X-Frame-Options:\s*DENY/],
    // frame-ancestors only works as an HTTP header — browsers ignore it in
    // meta CSPs, so it MUST live here and not (only) in index.html.
    [
      'Content-Security-Policy frame-ancestors',
      /Content-Security-Policy:\s*frame-ancestors 'none'/,
    ],
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

describe('content security policy (index.html meta)', () => {
  it('ships a CSP meta tag', () => {
    expect(indexHtml).toMatch(/http-equiv="Content-Security-Policy"/);
  });

  it.each([
    ["default-src 'self'", /default-src 'self'/],
    [
      "script-src 'self' + Turnstile + Stripe (no unsafe-inline/eval)",
      /script-src 'self' https:\/\/challenges\.cloudflare\.com https:\/\/js\.stripe\.com/,
    ],
    ["object-src 'none'", /object-src 'none'/],
    ["base-uri 'self'", /base-uri 'self'/],
    ["form-action 'self'", /form-action 'self'/],
    [
      'connect-src API origin placeholder (injected at build)',
      /<!-- CSP_API_CONNECT_SRC -->/,
    ],
  ])('keeps %s', (_name, pattern) => {
    expect(indexHtml).toMatch(pattern);
  });

  it('never weakens meta script-src with unsafe-inline or unsafe-eval', () => {
    const match = indexHtml.match(
      /http-equiv="Content-Security-Policy"[\s\S]*?content="([^"]*)"/,
    );
    expect(match?.[1]).toBeDefined();
    expect(match?.[1]).not.toMatch(/script-src[^;]*unsafe-(inline|eval)/);
  });

  it('does NOT carry a frame-ancestors directive in the meta CSP (header-only directive — it lives in public/_headers)', () => {
    expect(indexHtml).not.toMatch(/frame-ancestors\s+'/);
  });

  it('does NOT carry upgrade-insecure-requests in the meta CSP (header-only — breaks Safari on http://localhost preview)', () => {
    const match = indexHtml.match(
      /http-equiv="Content-Security-Policy"[\s\S]*?content="([^"]*)"/,
    );
    expect(match?.[1]).toBeDefined();
    expect(match?.[1]).not.toMatch(/upgrade-insecure-requests/);
  });
});

describe('vite build security config', () => {
  it('keeps assetsInlineLimit at 0 (no inlined data: URIs — CSP compliance)', () => {
    expect(viteConfig).toMatch(/assetsInlineLimit:\s*0/);
  });
});
