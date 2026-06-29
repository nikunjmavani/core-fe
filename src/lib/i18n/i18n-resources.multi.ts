import enAuth from '@/locales/en/auth.json';
import enCommon from '@/locales/en/common.json';
import enDashboard from '@/locales/en/dashboard.json';
import enErrors from '@/locales/en/errors.json';
import enLayout from '@/locales/en/layout.json';
import enOnboarding from '@/locales/en/onboarding.json';
import enSettings from '@/locales/en/settings.json';

import type { LocaleBuildProfile } from './build-config.ts';
import type { I18nLocale } from './locales.ts';
import { DEFAULT_LOCALE } from './locales.ts';
import { I18N_NAMESPACES, type I18nNamespace } from './namespaces.ts';

export const I18N_BUILD_MODE = 'multi' as const;
export const I18N_BUILD_BCP47 = 'en-US';
export const I18N_BUILD_UI_LOCALE: I18nLocale = DEFAULT_LOCALE;

type NamespaceResources = Record<I18nNamespace, Record<string, unknown>>;

/** English shell namespaces — other locales load on demand via `load-namespace.ts`. */
export function getBootstrapResources(): Record<string, Partial<NamespaceResources>> {
  return {
    [DEFAULT_LOCALE]: {
      [I18N_NAMESPACES.common]: enCommon,
      [I18N_NAMESPACES.layout]: enLayout,
      [I18N_NAMESPACES.dashboard]: enDashboard,
      [I18N_NAMESPACES.errors]: enErrors,
      [I18N_NAMESPACES.auth]: enAuth,
      [I18N_NAMESPACES.onboarding]: enOnboarding,
      [I18N_NAMESPACES.settings]: enSettings,
    },
  };
}

/** Runtime locale profile — only defined for single-locale builds. */
export function getBuildLocaleProfile(): LocaleBuildProfile | null {
  return null;
}
