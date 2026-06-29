import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { applyDocumentLocale } from '@/lib/i18n/apply-document-locale.ts';
import type { LocaleBuildProfile } from '@/lib/i18n/build-config.ts';
import { getBuildLocaleProfile } from '@/lib/i18n/i18n-resources.ts';
import {
  type CurrencyCode,
  type CurrencyDisplayPreference,
  type DateFormatPreference,
  DEFAULT_CURRENCY_CODE,
  DEFAULT_CURRENCY_DISPLAY,
  DEFAULT_DATE_FORMAT,
  DEFAULT_FORMAT_LOCALE,
  DEFAULT_HOUR_CYCLE,
  DEFAULT_NUMBER_STYLE,
  defaultCurrencyForFormatLocale,
  defaultFormatLocaleForUi,
  type FormatLocaleTag,
  type HourCyclePreference,
  normalizeCurrencyCode,
  normalizeCurrencyDisplayPreference,
  normalizeDateFormatPreference,
  normalizeFormatLocaleTag,
  normalizeHourCyclePreference,
  normalizeNumberStylePreference,
  type NumberStylePreference,
} from '@/lib/i18n/intl-config.ts';
import { preloadLocaleIdle } from '@/lib/i18n/load-namespace.ts';
import { DEFAULT_LOCALE, type I18nLocale, isI18nLocale } from '@/lib/i18n/locales.ts';

interface LocaleStore {
  locale: I18nLocale;
  formatLocale: FormatLocaleTag;
  dateFormat: DateFormatPreference;
  hourCycle: HourCyclePreference;
  numberStyle: NumberStylePreference;
  currencyDisplay: CurrencyDisplayPreference;
  currencyCode: CurrencyCode;
  setLocale: (locale: I18nLocale) => Promise<void>;
  setFormatLocale: (formatLocale: FormatLocaleTag) => void;
  setDateFormat: (dateFormat: DateFormatPreference) => void;
  setHourCycle: (hourCycle: HourCyclePreference) => void;
  setNumberStyle: (numberStyle: NumberStylePreference) => void;
  setCurrencyDisplay: (currencyDisplay: CurrencyDisplayPreference) => void;
  setCurrencyCode: (currencyCode: CurrencyCode) => void;
}

function initialLocaleState(): Pick<
  LocaleStore,
  | 'locale'
  | 'formatLocale'
  | 'dateFormat'
  | 'hourCycle'
  | 'numberStyle'
  | 'currencyDisplay'
  | 'currencyCode'
> {
  const profile = getBuildLocaleProfile();
  if (profile) {
    return profile;
  }
  return {
    locale: DEFAULT_LOCALE,
    formatLocale: DEFAULT_FORMAT_LOCALE,
    dateFormat: DEFAULT_DATE_FORMAT,
    hourCycle: DEFAULT_HOUR_CYCLE,
    numberStyle: DEFAULT_NUMBER_STYLE,
    currencyDisplay: DEFAULT_CURRENCY_DISPLAY,
    currencyCode: DEFAULT_CURRENCY_CODE,
  };
}

function applyBuildLocaleProfile(profile: LocaleBuildProfile): void {
  useLocaleStore.setState(profile);
  void applyDocumentLocale(profile.locale);
}

export const useLocaleStore = create<LocaleStore>()(
  persist(
    (set) => ({
      ...initialLocaleState(),
      setLocale: async (locale) => {
        await applyDocumentLocale(locale);
        // Language carries a full regional experience: derive the region's format
        // locale and snap the currency to what that region transacts in.
        const formatLocale = defaultFormatLocaleForUi(locale);
        set({
          locale,
          formatLocale,
          currencyCode: defaultCurrencyForFormatLocale(formatLocale),
        });
        preloadLocaleIdle(locale);
      },
      // Changing the region snaps money to that region's currency too.
      setFormatLocale: (formatLocale) =>
        set({ formatLocale, currencyCode: defaultCurrencyForFormatLocale(formatLocale) }),
      setDateFormat: (dateFormat) => set({ dateFormat }),
      setHourCycle: (hourCycle) => set({ hourCycle }),
      setNumberStyle: (numberStyle) => set({ numberStyle }),
      setCurrencyDisplay: (currencyDisplay) => set({ currencyDisplay }),
      setCurrencyCode: (currencyCode) => set({ currencyCode }),
    }),
    {
      name: 'locale-preference',
      version: 5,
      migrate: (persisted) => {
        const state = persisted as Partial<LocaleStore> | undefined;
        if (!state || typeof state !== 'object') {
          return {
            locale: DEFAULT_LOCALE,
            formatLocale: DEFAULT_FORMAT_LOCALE,
            dateFormat: DEFAULT_DATE_FORMAT,
            hourCycle: DEFAULT_HOUR_CYCLE,
            numberStyle: DEFAULT_NUMBER_STYLE,
            currencyDisplay: DEFAULT_CURRENCY_DISPLAY,
            currencyCode: DEFAULT_CURRENCY_CODE,
          };
        }
        const locale = isI18nLocale(state.locale ?? '') ? state.locale : DEFAULT_LOCALE;
        return {
          locale,
          formatLocale: normalizeFormatLocaleTag(state.formatLocale, locale),
          dateFormat: normalizeDateFormatPreference(state.dateFormat),
          hourCycle: normalizeHourCyclePreference(state.hourCycle),
          numberStyle: normalizeNumberStylePreference(state.numberStyle),
          currencyDisplay: normalizeCurrencyDisplayPreference(state.currencyDisplay),
          currencyCode: normalizeCurrencyCode(state.currencyCode),
        };
      },
      partialize: (state) => ({
        locale: state.locale,
        formatLocale: state.formatLocale,
        dateFormat: state.dateFormat,
        hourCycle: state.hourCycle,
        numberStyle: state.numberStyle,
        currencyDisplay: state.currencyDisplay,
        currencyCode: state.currencyCode,
      }),
      onRehydrateStorage: () => (state) => {
        const profile = getBuildLocaleProfile();
        if (profile) {
          applyBuildLocaleProfile(profile);
          return;
        }
        if (state?.locale) {
          void applyDocumentLocale(state.locale);
          preloadLocaleIdle(state.locale);
        }
      },
    },
  ),
);

/** Current regional formatting prefs (for Intl formatters). */
export function localeFormatPrefs(
  state: Pick<
    LocaleStore,
    | 'locale'
    | 'formatLocale'
    | 'dateFormat'
    | 'hourCycle'
    | 'numberStyle'
    | 'currencyDisplay'
    | 'currencyCode'
  >,
) {
  return {
    locale: state.locale,
    formatLocale: state.formatLocale,
    dateFormat: state.dateFormat,
    hourCycle: state.hourCycle,
    numberStyle: state.numberStyle,
    currencyDisplay: state.currencyDisplay,
    currencyCode: state.currencyCode,
  };
}
