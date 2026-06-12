import type { PageManifest } from '@/lib/routes/page-manifest.ts';

/**
 * Onboarding — leaf island (`/onboarding`).
 * First-run flow that collects profile basics before sending the user to the dashboard.
 */
export const manifest = {
  segment: 'onboarding',
  path: '/onboarding',
  title: 'Onboarding',
  testId: 'onboarding-page',
  permission: null,
  kind: 'leaf',
  children: [],
} as const satisfies PageManifest;
