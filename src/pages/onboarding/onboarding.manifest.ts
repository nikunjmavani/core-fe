import i18n from '@/lib/i18n/i18n.ts';
import type { PageManifest } from '@/lib/routes/page-manifest.ts';

import {
  ONBOARDING_KEYS,
  ONBOARDING_NS,
  ONBOARDING_TEST_IDS,
} from './onboarding.constants.ts';

/**
 * Onboarding — leaf island (`/onboarding`).
 * First-run flow that collects profile basics before sending the user to the dashboard.
 */
export const manifest = {
  segment: 'onboarding',
  path: '/onboarding',
  title: i18n.t(ONBOARDING_KEYS.manifest.title, { ns: ONBOARDING_NS }),
  testId: ONBOARDING_TEST_IDS.page,
  permission: null,
  kind: 'leaf',
  children: [],
} as const satisfies PageManifest;
