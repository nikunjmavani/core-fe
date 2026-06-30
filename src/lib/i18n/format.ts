import {
  type CurrencyCode,
  type CurrencyDisplayPreference,
  currencyFormatOptions,
  dateFormatOptions,
  type DateFormatPreference,
  type FormatLocaleTag,
  type HourCyclePreference,
  intlLocaleFor,
  numberFormatOptions,
  type NumberStylePreference,
} from '@/lib/i18n/intl-config.ts';
import type { I18nLocale } from '@/lib/i18n/locales.ts';

export type LocaleFormatInput = {
  locale: I18nLocale;
  formatLocale: FormatLocaleTag;
  dateFormat: DateFormatPreference;
  hourCycle: HourCyclePreference;
  numberStyle: NumberStylePreference;
  currencyDisplay: CurrencyDisplayPreference;
  currencyCode: CurrencyCode;
};

export function formatDateValue(iso: string | Date, prefs: LocaleFormatInput): string {
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(
    intlLocaleFor(prefs.formatLocale),
    dateFormatOptions(prefs.dateFormat, prefs.hourCycle),
  ).format(date);
}

export function formatNumberValue(
  value: number,
  prefs: LocaleFormatInput,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(intlLocaleFor(prefs.formatLocale), {
    ...numberFormatOptions(prefs.numberStyle),
    ...options,
  }).format(value);
}

export function formatCurrencyValue(
  cents: number,
  currency: string,
  prefs: LocaleFormatInput,
): string {
  const code = (currency || prefs.currencyCode || 'USD').toUpperCase();
  const amount = cents / 100;
  try {
    return new Intl.NumberFormat(intlLocaleFor(prefs.formatLocale), {
      style: 'currency',
      currency: code,
      ...currencyFormatOptions(prefs.currencyDisplay),
    }).format(amount);
  } catch {
    // `Intl` throws `RangeError` on a malformed currency code (it validates the
    // alpha-3 ISO 4217 *shape*, not membership) — and `currency` comes straight
    // from the server. Never let one bad value crash the billing UI; fall back
    // to a plain number plus the raw code.
    return `${amount.toFixed(2)} ${code}`;
  }
}

export function formatRelativeTimeValue(
  iso: string | Date,
  prefs: LocaleFormatInput,
  base: Date = new Date(),
): string {
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) return '—';

  const diffSeconds = Math.round((date.getTime() - base.getTime()) / 1000);
  const abs = Math.abs(diffSeconds);
  const intl = intlLocaleFor(prefs.formatLocale);
  const rtf = new Intl.RelativeTimeFormat(intl, { numeric: 'auto' });

  if (abs < 60) return rtf.format(diffSeconds, 'second');
  if (abs < 3600) return rtf.format(Math.round(diffSeconds / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diffSeconds / 3600), 'hour');
  return formatDateValue(date, prefs);
}
