import type { PageManifest } from '@/lib/routes/page-manifest.ts';

/**
 * MFA — leaf island (`/mfa`).
 * TOTP verification step shown after a primary login when MFA is enabled.
 */
export const manifest = {
  segment: 'mfa',
  path: '/mfa',
  title: 'Two-factor authentication',
  testId: 'mfa-page',
  permission: null,
  kind: 'leaf',
  children: [],
} as const satisfies PageManifest;
