import { describe, expect, it } from 'vitest';

import {
  formatCspApiConnectSrcFragment,
  getCspConnectSrcOrigin,
} from './csp-api-origin.ts';

describe('getCspConnectSrcOrigin', () => {
  it('returns null for empty or whitespace', () => {
    expect(getCspConnectSrcOrigin(undefined)).toBeNull();
    expect(getCspConnectSrcOrigin('')).toBeNull();
    expect(getCspConnectSrcOrigin('   ')).toBeNull();
  });

  it('returns origin for https API base URL', () => {
    expect(getCspConnectSrcOrigin('https://api.example.com')).toBe(
      'https://api.example.com',
    );
    expect(getCspConnectSrcOrigin('https://api.example.com/api/v1')).toBe(
      'https://api.example.com',
    );
  });

  it('returns origin for http localhost', () => {
    expect(getCspConnectSrcOrigin('http://localhost:3000')).toBe('http://localhost:3000');
  });

  it('returns null for invalid URL', () => {
    expect(getCspConnectSrcOrigin('not-a-url')).toBeNull();
  });

  it('returns null for non-http(s) schemes', () => {
    expect(getCspConnectSrcOrigin('javascript:alert(1)')).toBeNull();
  });
});

describe('formatCspApiConnectSrcFragment', () => {
  it('returns empty string when no API URL', () => {
    expect(formatCspApiConnectSrcFragment(undefined)).toBe('');
  });

  it('returns newline-indented origin for CSP connect-src', () => {
    expect(formatCspApiConnectSrcFragment('https://api.example.com')).toBe(
      '\n               https://api.example.com',
    );
  });
});
