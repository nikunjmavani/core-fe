import { beforeEach, describe, expect, it } from 'vitest';

import {
  isSafeRedirectPath,
  popReturnTo,
  safeRedirect,
  stashReturnTo,
} from './redirect-safety.ts';

// Exhaustive open-redirect attack vectors live in
// tests/security/redirect-safety.security.test.ts; this covers the shared
// helpers' core contract incl. the safeRedirect narrowing.
describe('isSafeRedirectPath', () => {
  it('accepts a same-origin path', () => {
    expect(isSafeRedirectPath('/organization/org_x/dashboard')).toBe(true);
  });

  it('rejects protocol-relative, absolute, and control-char vectors', () => {
    expect(isSafeRedirectPath('//evil.example.com')).toBe(false);
    expect(isSafeRedirectPath('https://evil.example.com')).toBe(false);
    expect(isSafeRedirectPath('/\t//evil.example.com')).toBe(false);
  });
});

describe('safeRedirect', () => {
  it('returns the value when it is a safe path', () => {
    expect(safeRedirect('/dashboard')).toBe('/dashboard');
  });

  it('returns undefined for unsafe paths or non-strings', () => {
    expect(safeRedirect('//evil.example.com')).toBeUndefined();
    expect(safeRedirect(undefined)).toBeUndefined();
    expect(safeRedirect(123)).toBeUndefined();
  });
});

describe('stashReturnTo / popReturnTo', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('round-trips a safe path and clears it after pop', () => {
    stashReturnTo('/organization/org_x/members');
    expect(popReturnTo()).toBe('/organization/org_x/members');
    expect(popReturnTo()).toBeUndefined();
  });

  it('never stashes an unsafe value', () => {
    stashReturnTo('//evil.example.com');
    expect(popReturnTo()).toBeUndefined();
  });
});
