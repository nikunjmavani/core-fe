import type { PageManifest } from '@/lib/route-island/page-manifest.ts';

/**
 * MFA — leaf island (`/mfa`).
 * TOTP verification step shown after a primary login when MFA is enabled.
 */
export const page = {
  segment: 'mfa',
  path: '/mfa',
  testId: 'mfa-page',
  permission: null,
  kind: 'leaf',
  children: [],
} as const satisfies PageManifest;
