import { useCallback } from 'react';

import {
  formatCurrencyValue,
  formatDateValue,
  formatNumberValue,
  formatRelativeTimeValue,
  type LocaleFormatInput,
} from '@/lib/i18n/format.ts';
import {
  type FirstDayOfWeek,
  type MeasurementSystem,
  regionLocaleFacts,
} from '@/lib/i18n/intl-config.ts';
import { localeDirection, type TextDirection } from '@/lib/i18n/locales.ts';
import {
  localeFormatPrefs,
  useLocaleStore,
} from '@/shared/store/useLocaleStore/index.ts';

/**
 * Reactive Intl formatters driven by {@link useLocaleStore} preferences, plus the
 * derived locale facts (text direction, first day of week, measurement system) so
 * the whole app can adapt to a region — not just translate copy.
 */
export function useLocaleFormat(): {
  prefs: LocaleFormatInput;
  direction: TextDirection;
  firstDayOfWeek: FirstDayOfWeek;
  measurementSystem: MeasurementSystem;
  formatDate: (iso: string | Date) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatCurrency: (cents: number, currency?: string) => string;
  formatRelativeTime: (iso: string | Date, base?: Date) => string;
} {
  const locale = useLocaleStore((s) => s.locale);
  const formatLocale = useLocaleStore((s) => s.formatLocale);
  const dateFormat = useLocaleStore((s) => s.dateFormat);
  const hourCycle = useLocaleStore((s) => s.hourCycle);
  const numberStyle = useLocaleStore((s) => s.numberStyle);
  const currencyDisplay = useLocaleStore((s) => s.currencyDisplay);
  const currencyCode = useLocaleStore((s) => s.currencyCode);
  const prefs = localeFormatPrefs({
    locale,
    formatLocale,
    dateFormat,
    hourCycle,
    numberStyle,
    currencyDisplay,
    currencyCode,
  });

  const formatDate = useCallback(
    (iso: string | Date) => formatDateValue(iso, prefs),
    [
      locale,
      formatLocale,
      dateFormat,
      hourCycle,
      numberStyle,
      currencyDisplay,
      currencyCode,
    ],
  );
  const formatNumber = useCallback(
    (value: number, options?: Intl.NumberFormatOptions) =>
      formatNumberValue(value, prefs, options),
    [
      locale,
      formatLocale,
      dateFormat,
      hourCycle,
      numberStyle,
      currencyDisplay,
      currencyCode,
    ],
  );
  const formatCurrency = useCallback(
    (cents: number, currency?: string) =>
      formatCurrencyValue(cents, currency ?? currencyCode, prefs),
    [
      locale,
      formatLocale,
      dateFormat,
      hourCycle,
      numberStyle,
      currencyDisplay,
      currencyCode,
    ],
  );
  const formatRelativeTime = useCallback(
    (iso: string | Date, base?: Date) => formatRelativeTimeValue(iso, prefs, base),
    [
      locale,
      formatLocale,
      dateFormat,
      hourCycle,
      numberStyle,
      currencyDisplay,
      currencyCode,
    ],
  );

  const facts = regionLocaleFacts(formatLocale);

  return {
    prefs,
    direction: localeDirection(locale),
    firstDayOfWeek: facts.firstDayOfWeek,
    measurementSystem: facts.measurementSystem,
    formatDate,
    formatNumber,
    formatCurrency,
    formatRelativeTime,
  };
}
