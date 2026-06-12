/**
 * Security invariant: the post-login `?redirect=` target must be a same-origin
 * path. Anything that a browser could interpret as another origin (absolute
 * URL, protocol-relative `//`, scheme smuggling, backslash normalization) is
 * an open-redirect vector and must be rejected.
 */
import { describe, expect, it } from 'vitest';

import { isSafeRedirectPath } from '@/pages/login/forms/LoginForm/redirect-safety.ts';

describe('isSafeRedirectPath (security)', () => {
  it.each([
    '/',
    '/dashboard',
    '/organization/org_8fK2x/dashboard',
    '/organization/org_8fK2x/dashboard?tab=members&page=2',
    '/settings#settings/account/profile',
  ])('accepts same-origin path %j', (path) => {
    expect(isSafeRedirectPath(path)).toBe(true);
  });

  it.each([
    // Absolute URLs — different origin entirely.
    'https://evil.example.com/phish',
    'http://evil.example.com',
    // Protocol-relative — inherits the scheme, lands on another origin.
    '//evil.example.com',
    '//evil.example.com/login',
    // Scheme smuggling.
    'javascript:alert(1)',
    'https://example.com/a://b',
    '/redirect?to=https://x', // contains :// after a safe-looking prefix
    // Backslash normalization: browsers rewrite `/\` to `//`.
    '/\\evil.example.com',
    '/\\\\evil.example.com',
    '/path\\..\\elsewhere',
    // Not rooted at the app origin.
    'dashboard',
    'org_8fK2x/dashboard',
    '',
  ])('rejects open-redirect vector %j', (path) => {
    expect(isSafeRedirectPath(path)).toBe(false);
  });
});
