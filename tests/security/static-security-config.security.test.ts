/**
 * Security tripwires over committed static configuration. These read files as
 * text on purpose (vite `?raw` imports): importing vite.config.ts normally
 * would execute plugin factories, and the point is to fail loudly if a
 * security-relevant line is edited away.
 */
import { describe, expect, it } from 'vitest';

import indexHtml from '../../index.html?raw';
import pkg from '../../package.json';
import headers from '../../public/_headers?raw';
import viteConfig from '../../vite.config.ts?raw';

/** Lowest version a semver range like `^7.3.6` / `>=3.4.7` can resolve to. */
function rangeFloor(range: string): [number, number, number] {
  // Single-token /\d+/g scan — linear, unlike a chained \d+\.\d+\.\d+ pattern.
  const parts = range.match(/\d+/g);
  if (!parts || parts.length < 3) throw new Error(`unparseable version range: ${range}`);
  return [Number(parts[0]), Number(parts[1]), Number(parts[2])];
}

function atLeast(range: string, min: [number, number, number]): boolean {
  const [a, b, c] = rangeFloor(range);
  const [x, y, z] = min;
  if (a !== x) return a > x;
  if (b !== y) return b > y;
  return c >= z;
}

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
    // COOP isolates the top-level window (origin isolation). Value is
    // same-origin-allow-popups — not the stricter same-origin — so Stripe
    // 3-D Secure popups and any window.opener flow keep working.
    [
      'Cross-Origin-Opener-Policy',
      /Cross-Origin-Opener-Policy:\s*same-origin-allow-popups/,
    ],
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

describe('supply-chain dependency floors (no downgrade past a known CVE)', () => {
  it('pins vite at >=7.3.5 (server.fs.deny bypass — GHSA dev-server path traversal)', () => {
    expect(atLeast(pkg.devDependencies.vite, [7, 3, 5])).toBe(true);
  });

  it('forces dompurify >=3.4.7 via pnpm override (cross-realm XSS — GHSA-76mc-f452-cxcm)', () => {
    // dompurify is a transitive of posthog-js; the override is the only floor.
    expect(atLeast(pkg.pnpm.overrides.dompurify, [3, 4, 7])).toBe(true);
  });

  it('forces @opentelemetry/core >=2.8.0 via pnpm override (unbounded memory allocation — GHSA-8988-4f7v-96qf)', () => {
    // @opentelemetry/core is a transitive of netlify-cli (dev-only CLI); the override is the floor.
    expect(atLeast(pkg.pnpm.overrides['@opentelemetry/core'], [2, 8, 0])).toBe(true);
  });

  // Bounded floors (>=x.y.z <nextMajor): patches flow, the known-CVE floor holds.
  it('floors protobufjs >=7.6.4 via pnpm override (unbounded-recursion DoS — <=7.5.7)', () => {
    expect(atLeast(pkg.pnpm.overrides.protobufjs, [7, 6, 4])).toBe(true);
  });

  it('floors basic-ftp >=5.3.1 via pnpm override (path-traversal / DoS advisories)', () => {
    expect(atLeast(pkg.pnpm.overrides['basic-ftp'], [5, 3, 1])).toBe(true);
  });

  it('floors minimatch >=10.2.5 via pnpm override (ReDoS on the 10.1.x line)', () => {
    expect(atLeast(pkg.pnpm.overrides.minimatch, [10, 2, 5])).toBe(true);
  });
});
