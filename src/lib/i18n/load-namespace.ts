import { isMultiLocaleBuild } from '@/lib/i18n/build-runtime.ts';
import i18n from '@/lib/i18n/i18n.ts';
import {
  getBootstrapResources,
  I18N_BUILD_UI_LOCALE,
} from '@/lib/i18n/i18n-resources.ts';
import { I18N_LOCALES, type I18nLocale, PARTIAL_UI_LOCALES } from '@/lib/i18n/locales.ts';
import { I18N_NAMESPACES, type I18nNamespace } from '@/lib/i18n/namespaces.ts';

type NamespaceModule = { default: Record<string, unknown> };

const EN_LOADERS: Record<I18nNamespace, () => Promise<NamespaceModule>> = {
  common: () => import('@/locales/en/common.json'),
  layout: () => import('@/locales/en/layout.json'),
  dashboard: () => import('@/locales/en/dashboard.json'),
  settings: () => import('@/locales/en/settings.json'),
  errors: () => import('@/locales/en/errors.json'),
  auth: () => import('@/locales/en/auth.json'),
  onboarding: () => import('@/locales/en/onboarding.json'),
};

const PARTIAL_COMMON_LOADERS: Partial<
  Record<I18nLocale, () => Promise<NamespaceModule>>
> = {
  fr: () => import('@/locales/fr/common.json'),
  de: () => import('@/locales/de/common.json'),
  ja: () => import('@/locales/ja/common.json'),
  pt: () => import('@/locales/pt/common.json'),
  ar: () => import('@/locales/ar/common.json'),
  hi: () => import('@/locales/hi/common.json'),
  ko: () => import('@/locales/ko/common.json'),
  it: () => import('@/locales/it/common.json'),
};

function loadersFor(
  locale: I18nLocale,
): Record<I18nNamespace, () => Promise<NamespaceModule>> {
  const commonLoader =
    PARTIAL_COMMON_LOADERS[locale] ??
    (locale === 'en' || locale === 'es' || locale === 'zh'
      ? () => import(`@/locales/${locale}/common.json`)
      : EN_LOADERS.common);

  if (
    !PARTIAL_UI_LOCALES.has(locale) &&
    locale !== 'en' &&
    locale !== 'es' &&
    locale !== 'zh'
  ) {
    return EN_LOADERS;
  }

  if (locale === 'en') return EN_LOADERS;

  if (locale === 'es' || locale === 'zh') {
    return {
      common: () => import(`@/locales/${locale}/common.json`),
      layout: () => import(`@/locales/${locale}/layout.json`),
      dashboard: () => import(`@/locales/${locale}/dashboard.json`),
      settings: () => import(`@/locales/${locale}/settings.json`),
      errors: () => import(`@/locales/${locale}/errors.json`),
      auth: () => import(`@/locales/${locale}/auth.json`),
      onboarding: () => import(`@/locales/${locale}/onboarding.json`),
    };
  }

  return {
    common: commonLoader,
    layout: EN_LOADERS.layout,
    dashboard: EN_LOADERS.dashboard,
    settings: EN_LOADERS.settings,
    errors: EN_LOADERS.errors,
    auth: EN_LOADERS.auth,
    onboarding: EN_LOADERS.onboarding,
  };
}

const NAMESPACE_LOADERS: Record<
  I18nLocale,
  Record<I18nNamespace, () => Promise<NamespaceModule>>
> = Object.fromEntries(
  I18N_LOCALES.map((locale) => [locale, loadersFor(locale)]),
) as Record<I18nLocale, Record<I18nNamespace, () => Promise<NamespaceModule>>>;

const ALL_NAMESPACES = Object.values(I18N_NAMESPACES);

const loadedBundles = new Set<string>();

function bundleKey(locale: I18nLocale, ns: I18nNamespace): string {
  return `${locale}:${ns}`;
}

function isBundleLoaded(locale: I18nLocale, ns: I18nNamespace): boolean {
  return loadedBundles.has(bundleKey(locale, ns)) || i18n.hasResourceBundle(locale, ns);
}

function ensureSingleLocaleBundle(locale: I18nLocale, ns: I18nNamespace): void {
  if (isBundleLoaded(locale, ns)) {
    loadedBundles.add(bundleKey(locale, ns));
    return;
  }

  const resources = getBootstrapResources();
  const bundle = resources[locale]?.[ns];
  if (bundle) {
    i18n.addResourceBundle(locale, ns, bundle, true, true);
    loadedBundles.add(bundleKey(locale, ns));
  }
}

/** Load one namespace for a locale (no-op if already present). */
export async function ensureNamespace(
  locale: I18nLocale,
  ns: I18nNamespace,
): Promise<void> {
  if (!isMultiLocaleBuild()) {
    ensureSingleLocaleBundle(locale, ns);
    return;
  }

  if (isBundleLoaded(locale, ns)) {
    loadedBundles.add(bundleKey(locale, ns));
    return;
  }

  const loader = NAMESPACE_LOADERS[locale][ns];
  const mod = await loader();
  i18n.addResourceBundle(locale, ns, mod.default, true, true);
  loadedBundles.add(bundleKey(locale, ns));
}

/** Load every registered namespace for a locale (parallel). */
export async function ensureLocale(locale: I18nLocale): Promise<void> {
  await Promise.all(ALL_NAMESPACES.map((ns) => ensureNamespace(locale, ns)));
}

/** Warm non-active locales during idle time (keeps initial bundle small). */
export function preloadLocaleIdle(locale: I18nLocale): void {
  if (!isMultiLocaleBuild()) return;
  if (locale === I18N_BUILD_UI_LOCALE) return;

  if (typeof window === 'undefined') return;
  const run = () => {
    void ensureLocale(locale);
  };
  const ric = (
    window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void;
    }
  ).requestIdleCallback;
  if (typeof ric === 'function') {
    ric(run, { timeout: 4000 });
  } else {
    window.setTimeout(run, 1500);
  }
}
