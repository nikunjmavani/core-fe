import type { PageManifest } from '@/lib/route-island/page-manifest.ts';

/**
 * Onboarding — leaf island (`/onboarding`).
 * First-run flow that collects profile basics before sending the user to the dashboard.
 */
export const page = {
  segment: 'onboarding',
  path: '/onboarding',
  testId: 'onboarding-page',
  permission: null,
  kind: 'leaf',
  children: [],
} as const satisfies PageManifest;
