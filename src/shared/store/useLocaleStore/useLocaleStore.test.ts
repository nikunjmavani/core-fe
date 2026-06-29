import { beforeEach, describe, expect, it } from 'vitest';

import { applyDocumentLocale } from '@/lib/i18n/apply-document-locale.ts';
import i18n from '@/lib/i18n/i18n.ts';
import { I18N_NAMESPACES } from '@/lib/i18n/namespaces.ts';

import { useLocaleStore } from './useLocaleStore.ts';

describe('useLocaleStore', () => {
  beforeEach(async () => {
    useLocaleStore.setState({ locale: 'en', dateFormat: 'auto' });
    await applyDocumentLocale('en');
  });

  it('persists and applies a new locale', async () => {
    await useLocaleStore.getState().setLocale('zh');
    expect(useLocaleStore.getState().locale).toBe('zh');
    expect(i18n.language).toBe('zh');
    expect(document.documentElement.lang).toBe('zh');
    expect(i18n.t('mfa.heading', { ns: I18N_NAMESPACES.auth })).toBe('双因素认证');
  });

  it('switching to Arabic flips the document direction to RTL', async () => {
    await useLocaleStore.getState().setLocale('ar');
    expect(document.documentElement.dir).toBe('rtl');
    await useLocaleStore.getState().setLocale('en');
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('language carries a regional currency (full locale experience)', async () => {
    await useLocaleStore.getState().setLocale('hi');
    expect(useLocaleStore.getState().formatLocale).toBe('hi-IN');
    expect(useLocaleStore.getState().currencyCode).toBe('INR');
  });

  it('changing the region snaps the currency to that region', () => {
    useLocaleStore.getState().setFormatLocale('ja-JP');
    expect(useLocaleStore.getState().currencyCode).toBe('JPY');
    useLocaleStore.getState().setFormatLocale('de-DE');
    expect(useLocaleStore.getState().currencyCode).toBe('EUR');
  });

  it('stores date format preference independently', () => {
    useLocaleStore.getState().setDateFormat('date');
    expect(useLocaleStore.getState().dateFormat).toBe('date');
  });

  it('stores expanded regional preferences', () => {
    useLocaleStore.getState().setHourCycle('h23');
    useLocaleStore.getState().setNumberStyle('compact');
    useLocaleStore.getState().setCurrencyDisplay('code');
    expect(useLocaleStore.getState().hourCycle).toBe('h23');
    expect(useLocaleStore.getState().numberStyle).toBe('compact');
    expect(useLocaleStore.getState().currencyDisplay).toBe('code');
  });
});
