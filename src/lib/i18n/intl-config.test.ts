import { describe, expect, it } from 'vitest';

import {
  DEFAULT_DATE_FORMAT,
  isDateFormatPreference,
  normalizeDateFormatPreference,
} from './intl-config.ts';

describe('isDateFormatPreference', () => {
  it('accepts a known preference', () => {
    expect(isDateFormatPreference('short')).toBe(true);
    expect(isDateFormatPreference('datetime')).toBe(true);
  });

  it('rejects an unknown value', () => {
    expect(isDateFormatPreference('nope')).toBe(false);
    expect(isDateFormatPreference('')).toBe(false);
  });
});

describe('normalizeDateFormatPreference', () => {
  it('keeps a known preference', () => {
    expect(normalizeDateFormatPreference('long')).toBe('long');
  });

  it('falls back to the default for an unknown value', () => {
    expect(normalizeDateFormatPreference('bogus')).toBe(DEFAULT_DATE_FORMAT);
  });

  it('falls back to the default when the value is missing', () => {
    expect(normalizeDateFormatPreference(undefined)).toBe(DEFAULT_DATE_FORMAT);
  });
});
