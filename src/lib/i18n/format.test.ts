import { describe, expect, it } from 'vitest';

import {
  formatCurrencyValue,
  formatDateValue,
  formatNumberValue,
  type LocaleFormatInput,
} from '@/lib/i18n/format.ts';

/** Build a full prefs object; formatting keys off `formatLocale` (region). */
function prefs(overrides: Partial<LocaleFormatInput> = {}): LocaleFormatInput {
  return {
    locale: 'en',
    formatLocale: 'en-US',
    dateFormat: 'auto',
    hourCycle: 'auto',
    numberStyle: 'auto',
    currencyDisplay: 'auto',
    currencyCode: 'USD',
    ...overrides,
  };
}

describe('formatDateValue', () => {
  const sample = '2026-06-25T14:30:45.000Z';

  it('formats full datetime per region (auto)', () => {
    const us = formatDateValue(sample, prefs({ formatLocale: 'en-US' }));
    const jp = formatDateValue(sample, prefs({ formatLocale: 'ja-JP' }));
    expect(us).toMatch(/\d/);
    expect(jp).toMatch(/\d/);
    expect(us).not.toBe(jp);
  });

  it('formats date-only and time-only parts', () => {
    const dateOnly = formatDateValue(sample, prefs({ dateFormat: 'date' }));
    const timeOnly = formatDateValue(sample, prefs({ dateFormat: 'time' }));
    expect(dateOnly).toMatch(/\d/);
    expect(timeOnly).toMatch(/\d/);
    expect(dateOnly).not.toContain(':');
  });
});

describe('formatCurrencyValue', () => {
  it('localizes currency by region', () => {
    const us = formatCurrencyValue(9900, 'USD', prefs({ formatLocale: 'en-US' }));
    const jp = formatCurrencyValue(9900, 'JPY', prefs({ formatLocale: 'ja-JP' }));
    expect(us).toMatch(/\$/);
    expect(jp).toMatch(/[\d¥]/);
  });
});

describe('formatNumberValue', () => {
  it('localizes numbers by region', () => {
    const us = formatNumberValue(1284.5, prefs({ formatLocale: 'en-US' }));
    const de = formatNumberValue(1284.5, prefs({ formatLocale: 'de-DE' }));
    expect(us).toMatch(/1/);
    expect(de).toMatch(/1/);
    expect(us).not.toBe(de);
  });
});
