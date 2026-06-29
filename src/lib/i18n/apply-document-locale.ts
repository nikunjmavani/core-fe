import i18n from '@/lib/i18n/i18n.ts';
import { ensureLocale } from '@/lib/i18n/load-namespace.ts';
import { type I18nLocale, localeDirection } from '@/lib/i18n/locales.ts';

/**
 * Load bundles, switch i18next language, and reflect the locale on the document:
 * `lang` for assistive tech + `dir` so right-to-left locales (e.g. Arabic) mirror
 * the entire layout — language is a full regional experience, not just copy.
 */
export async function applyDocumentLocale(locale: I18nLocale): Promise<void> {
  await ensureLocale(locale);
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale;
    document.documentElement.dir = localeDirection(locale);
  }
  await i18n.changeLanguage(locale);
}
